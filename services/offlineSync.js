// services/offlineSync.js
// Servicio de sincronización offline-first
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const OFFLINE_TASKS_KEY = '@offline_tasks';
const PENDING_OPERATIONS_KEY = '@pending_operations';
const LAST_SYNC_KEY = '@last_sync';

// Estado de conexión
let isOnline = true;
let connectionListeners = [];

// Inicializar listener de conexión
export const initConnectionListener = () => {
  return NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;
    
    console.log('📶 Estado de conexión:', isOnline ? 'ONLINE' : 'OFFLINE');
    
    // Notificar a los listeners
    connectionListeners.forEach(listener => listener(isOnline));
    
    // Si volvimos a estar online, sincronizar
    if (wasOffline && isOnline) {
      console.log('🔄 Reconectado - iniciando sincronización...');
      syncPendingOperations();
    }
  });
};

// Suscribirse a cambios de conexión
export const subscribeToConnectionState = (callback) => {
  connectionListeners.push(callback);
  // Retornar inmediatamente el estado actual
  callback(isOnline);
  
  return () => {
    connectionListeners = connectionListeners.filter(cb => cb !== callback);
  };
};

// Obtener estado de conexión actual
export const getConnectionState = () => isOnline;

// ============ CACHE LOCAL DE TAREAS ============

// Guardar tareas en cache local
export const cacheTasksLocally = async (tasks) => {
  try {
    await AsyncStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(tasks));
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    console.log('💾 Cache actualizado:', tasks.length, 'tareas');
  } catch (error) {
    console.error('Error guardando cache:', error);
  }
};

// Obtener tareas del cache local
export const getCachedTasks = async () => {
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_TASKS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  } catch (error) {
    console.error('Error leyendo cache:', error);
    return [];
  }
};

// Obtener fecha de última sincronización
export const getLastSyncTime = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync) : null;
  } catch (error) {
    return null;
  }
};

// ============ COLA DE OPERACIONES PENDIENTES ============

// Tipos de operaciones
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

// Agregar operación a la cola
export const queueOperation = async (type, data, taskId = null) => {
  try {
    const pendingOps = await getPendingOperations();
    
    const operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      taskId,
      timestamp: Date.now(),
      retries: 0
    };
    
    // Si es UPDATE o DELETE y ya hay operaciones pendientes para esta tarea
    if (taskId && (type === OPERATION_TYPES.UPDATE || type === OPERATION_TYPES.DELETE)) {
      // Eliminar operaciones anteriores de UPDATE para la misma tarea (mantener solo la última)
      const filtered = pendingOps.filter(op => {
        if (op.taskId === taskId) {
          // Si la nueva operación es DELETE, eliminar todas las anteriores
          if (type === OPERATION_TYPES.DELETE) return false;
          // Si es UPDATE, eliminar solo otros UPDATE
          if (type === OPERATION_TYPES.UPDATE && op.type === OPERATION_TYPES.UPDATE) return false;
        }
        return true;
      });
      filtered.push(operation);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
    } else {
      pendingOps.push(operation);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
    }
    
    console.log('📥 Operación encolada:', type, taskId || 'nueva tarea');
    return operation.id;
  } catch (error) {
    console.error('Error encolando operación:', error);
    throw error;
  }
};

// Obtener operaciones pendientes
export const getPendingOperations = async () => {
  try {
    const pending = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Error leyendo operaciones pendientes:', error);
    return [];
  }
};

// Obtener cantidad de operaciones pendientes
export const getPendingCount = async () => {
  const ops = await getPendingOperations();
  return ops.length;
};

// Eliminar operación de la cola
const removeOperation = async (operationId) => {
  try {
    const pendingOps = await getPendingOperations();
    const filtered = pendingOps.filter(op => op.id !== operationId);
    await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error eliminando operación:', error);
  }
};

// ============ SINCRONIZACIÓN ============

// Sincronizar operaciones pendientes con Firebase
export const syncPendingOperations = async () => {
  if (!isOnline) {
    console.log('⏳ Sin conexión - sincronización pospuesta');
    return { success: false, synced: 0, pending: await getPendingCount() };
  }
  
  const pendingOps = await getPendingOperations();
  
  if (pendingOps.length === 0) {
    console.log('✅ No hay operaciones pendientes');
    return { success: true, synced: 0, pending: 0 };
  }
  
  console.log('🔄 Sincronizando', pendingOps.length, 'operaciones pendientes...');
  
  let synced = 0;
  let errors = 0;
  
  // Ordenar por timestamp para mantener el orden correcto
  const sortedOps = [...pendingOps].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const op of sortedOps) {
    try {
      switch (op.type) {
        case OPERATION_TYPES.CREATE:
          await syncCreateOperation(op);
          break;
        case OPERATION_TYPES.UPDATE:
          await syncUpdateOperation(op);
          break;
        case OPERATION_TYPES.DELETE:
          await syncDeleteOperation(op);
          break;
      }
      
      await removeOperation(op.id);
      synced++;
      console.log('✅ Sincronizado:', op.type, op.taskId || 'nueva');
    } catch (error) {
      errors++;
      console.error('❌ Error sincronizando:', op.type, error.message);
      
      // Incrementar contador de reintentos
      op.retries = (op.retries || 0) + 1;
      
      // Si ha fallado más de 5 veces, eliminar de la cola
      if (op.retries > 5) {
        await removeOperation(op.id);
        console.log('🗑️ Operación descartada después de 5 intentos');
      }
    }
  }
  
  const remaining = await getPendingCount();
  console.log(`📊 Sincronización completada: ${synced} exitosos, ${errors} errores, ${remaining} pendientes`);
  
  // Notificar a los listeners
  connectionListeners.forEach(listener => listener(isOnline));
  
  return { success: errors === 0, synced, pending: remaining };
};

// Sincronizar operación CREATE
const syncCreateOperation = async (op) => {
  const tasksRef = collection(db, 'tasks');
  
  const taskData = {
    ...op.data,
    createdAt: Timestamp.fromMillis(op.data.createdAt || Date.now()),
    updatedAt: Timestamp.fromMillis(op.data.updatedAt || Date.now()),
    dueAt: op.data.dueAt ? Timestamp.fromMillis(op.data.dueAt) : Timestamp.fromMillis(Date.now()),
    syncedAt: Timestamp.now()
  };
  
  // Eliminar el ID temporal
  delete taskData.id;
  delete taskData.isOffline;
  delete taskData.tempId;
  
  await addDoc(tasksRef, taskData);
};

// Sincronizar operación UPDATE
const syncUpdateOperation = async (op) => {
  if (!op.taskId || op.taskId.startsWith('temp_')) {
    console.log('⚠️ No se puede actualizar tarea temporal:', op.taskId);
    return;
  }
  
  const taskRef = doc(db, 'tasks', op.taskId);
  
  const updateData = {
    ...op.data,
    updatedAt: Timestamp.now(),
    syncedAt: Timestamp.now()
  };
  
  // Convertir fechas si es necesario
  if (updateData.dueAt && typeof updateData.dueAt === 'number') {
    updateData.dueAt = Timestamp.fromMillis(updateData.dueAt);
  }
  
  await updateDoc(taskRef, updateData);
};

// Sincronizar operación DELETE
const syncDeleteOperation = async (op) => {
  if (!op.taskId || op.taskId.startsWith('temp_')) {
    console.log('⚠️ No se puede eliminar tarea temporal:', op.taskId);
    return;
  }
  
  const taskRef = doc(db, 'tasks', op.taskId);
  await deleteDoc(taskRef);
};

// ============ OPERACIONES OFFLINE-FIRST ============

// Crear tarea (offline-first)
export const createTaskOffline = async (taskData) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newTask = {
    ...taskData,
    id: tempId,
    tempId: tempId,
    isOffline: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // Guardar offline
  const cached = await getCachedTasks();
  cached.unshift(newTask);
  await cacheTasksLocally(cached);
  
  // Encolar para sincronización
  await queueOperation(OPERATION_TYPES.CREATE, taskData, tempId);
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
  
  return newTask;
};

// Actualizar tarea (offline-first)
export const updateTaskOffline = async (taskId, updates) => {
  // Actualizar cache local
  const cached = await getCachedTasks();
  const taskIndex = cached.findIndex(t => t.id === taskId);
  
  if (taskIndex !== -1) {
    cached[taskIndex] = {
      ...cached[taskIndex],
      ...updates,
      updatedAt: Date.now()
    };
    await cacheTasksLocally(cached);
  }
  
  // Encolar para sincronización (solo si no es tarea temporal)
  if (!taskId.startsWith('temp_')) {
    await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId);
  }
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
  
  return cached[taskIndex];
};

// Eliminar tarea (offline-first)
export const deleteTaskOffline = async (taskId) => {
  // Eliminar del cache local
  const cached = await getCachedTasks();
  const filtered = cached.filter(t => t.id !== taskId);
  await cacheTasksLocally(filtered);
  
  // Encolar para sincronización (solo si no es tarea temporal)
  if (!taskId.startsWith('temp_')) {
    await queueOperation(OPERATION_TYPES.DELETE, {}, taskId);
  }
  
  // Si hay conexión, sincronizar inmediatamente
  if (isOnline) {
    syncPendingOperations();
  }
};

// Limpiar todo el cache (para logout)
export const clearOfflineData = async () => {
  try {
    await AsyncStorage.multiRemove([
      OFFLINE_TASKS_KEY,
      PENDING_OPERATIONS_KEY,
      LAST_SYNC_KEY
    ]);
    console.log('🗑️ Cache offline limpiado');
  } catch (error) {
    console.error('Error limpiando cache:', error);
  }
};

export default {
  initConnectionListener,
  subscribeToConnectionState,
  getConnectionState,
  cacheTasksLocally,
  getCachedTasks,
  getLastSyncTime,
  queueOperation,
  getPendingOperations,
  getPendingCount,
  syncPendingOperations,
  createTaskOffline,
  updateTaskOffline,
  deleteTaskOffline,
  clearOfflineData,
  OPERATION_TYPES
};
