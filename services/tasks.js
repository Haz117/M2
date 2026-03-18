// services/tasks.js
// Servicio para gestionar tareas con Firebase Firestore en tiempo real
// Con soporte OFFLINE-FIRST
// 🚨 PRODUCCION: console.logs deshabilitados
const __DEV__ = false; // Cambiar a true para depuración
const log = __DEV__ ? console.log : () => {};
import { toMs } from '../utils/dateUtils';
import { isTaskAssignedToUser } from '../utils/taskHelpers';

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';
import { notifyTaskAssigned } from './emailNotifications';
import { notifyAssignment } from './notifications';
import { getGeneralMetrics } from './analytics';
import { validateData } from '../utils/dataValidation';
import * as productionLogger from '../utils/productionLogger';
import { withRetry } from '../utils/errorRecovery';
import { checkRateLimit } from '../utils/rateLimiter';
import { 
  cacheTasksLocally, 
  getCachedTasks, 
  getConnectionState,
  subscribeToConnectionState,
  queueOperation,
  OPERATION_TYPES,
  syncPendingOperations
} from './offlineSync';

const COLLECTION_NAME = 'tasks';

// 🔍 DIAGNÓSTICO: Detectar si emulador está activo
function detectEmulator() {
  try {
    // En Firestore modular, si se usa connectFirestoreEmulator(), la conexión se hace en firebase.js
    // No hay forma directa de detectarlo, pero podemos chequear si hay configuración en localStorage o envs
    const emuHost = process.env.REACT_APP_FIREBASE_EMULATOR_HOST;
    const emuPort = process.env.REACT_APP_FIRESTORE_EMULATOR_PORT;
    
    if (emuHost || emuPort) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

const isEmulatorActive = detectEmulator();

// Cache eliminado para tiempo real verdadero
let activeSubscriptions = 0;
const MAX_SUBSCRIPTIONS = 3; // Aumentar suscripciones permitidas

/**
 * Esperar a que la sesión esté disponible (con retry logic)
 * Este es un blocker - NO retorna hasta que haya sesión o se agotan reintentos
 * @param {number} maxRetries - Intentos máximos (default 30 = 3 segundos)
 * @param {number} initialDelay - Delay inicial en ms (default 100)
 * @returns {Promise} Sesión del usuario o null
 */
async function waitForSession(maxRetries = 30, initialDelay = 100) {
  let delay = initialDelay;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await getCurrentSession();
      if (result.success && result.session) {
        log(`✅ Sesión encontrada en intento ${attempt + 1}`);
        return result.session;
      }
    } catch (error) {
      lastError = error;
    }
    
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
      // Backoff: 100, 110, 120, 131, ...  hasta ~2000ms
      delay = Math.min(delay * 1.1, 2000);
    }
  }
  
  console.warn(`⚠️  No se encontró sesión después de ${maxRetries} intentos. Último error:`, lastError?.message);
  return null;
}

/**
 * Suscribirse a cambios en tiempo real de las tareas del usuario autenticado
 * ⚠️ OFFLINE-FIRST: Carga primero del cache, luego sincroniza con Firebase
 * @param {Function} callback - Función que recibe el array de tareas actualizado
 * @returns {Function} Función para cancelar la suscripción
 */
export async function subscribeToTasks(callback) {
  try {
    activeSubscriptions++;

    // 🔍 PASO 1: Esperar a que la sesión esté disponible
    const session = await waitForSession();
    
    if (!session) {
      activeSubscriptions--;
      callback([]);
      return () => {};
    }
    
    const userRole = session.role;
    const userEmail = session.email;
    const userDepartment = session.department;
    const userArea = session.area || '';
    const userDirecciones = session.direcciones || [];
    const userAreasPermitidas = session.areasPermitidas || [...(session.area ? [session.area] : []), ...userDirecciones];

    // Función para filtrar tareas según rol
    const filterTasksByRole = (tasks) => {
      let filtered = tasks;
      
      if (userRole === 'secretario') {
        filtered = tasks.filter(task => {
          const taskArea = (task.area || '').toLowerCase().trim();
          // Verificar si está en las áreas permitidas del secretario
          const inArea = userAreasPermitidas.some(a => a?.toLowerCase().trim() === taskArea);
          // Verificar si la creó
          const isCreator = task.createdBy?.toLowerCase().trim() === userEmail?.toLowerCase().trim();
          // 🔥 NUEVO: Verificar si está asignado a la tarea
          const isAssigned = isTaskAssignedToUser(task, userEmail);
          
          return inArea || isCreator || isAssigned;
        });
        
      } else if (userRole === 'director') {
        // 🔒 Director ve SOLO tareas asignadas directamente a él
        // (ya sea desde admin o delegadas por secretario)
        filtered = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
        
      }
      
      // Deduplicación
      const seenIds = new Set();
      const uniqueTasks = [];
      for (const task of filtered) {
        if (!seenIds.has(task.id)) {
          seenIds.add(task.id);
          uniqueTasks.push(task);
        }
      }
      
      return uniqueTasks;
    };

    // 📦 PASO 2: Cargar del cache local inmediatamente
    const cachedTasks = await getCachedTasks();
    if (cachedTasks.length > 0) {
      log('📦 Cargando', cachedTasks.length, 'tareas del cache local');
      callback(filterTasksByRole(cachedTasks));
    }

    // 🌐 PASO 3: Si hay conexión, suscribirse a Firebase
    let unsubscribeListener = null;
    let isSubscribed = true;

    if (getConnectionState()) {
      // Esperar un poco para asegurar que Firestore está listo
      await new Promise(resolve => setTimeout(resolve, 300));

      let tasksQuery;

      // Construir query según el rol del usuario
      if (userRole === 'admin') {
        tasksQuery = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc')
        );
      } else if (userRole === 'secretario') {
        tasksQuery = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc')
        );
      } else if (userRole === 'director') {
        // Director ve tareas de su área
        tasksQuery = query(
          collection(db, COLLECTION_NAME),
          orderBy('createdAt', 'desc')
        );
      } else {
        return () => {};
      }

      unsubscribeListener = onSnapshot(
        tasksQuery,
        (snapshot) => {
          if (!isSubscribed) return;
          
          let tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: toMs(data.createdAt) || Date.now(),
              updatedAt: toMs(data.updatedAt) || Date.now(),
              dueAt: toMs(data.dueAt) || Date.now()
          };
        });
        
        const filteredTasks = filterTasksByRole(tasks);
        
        // 💾 Guardar en cache local
        cacheTasksLocally(filteredTasks);
        
        callback(filteredTasks);
      },
      (error) => {
        console.error('❌ Error en listener de tareas:', error);
        // En caso de error, usar cache
        getCachedTasks().then(cached => {
          if (cached.length > 0) {
            callback(filterTasksByRole(cached));
          }
        });
      }
    );
    } else {
      log('📴 Sin conexión - usando solo cache local');
    }

    // 🔄 Suscribirse a cambios de conexión para logging (sin reiniciar suscripción)
    // Firestore maneja la reconexión automáticamente
    const unsubscribeConnection = subscribeToConnectionState((online) => {
      if (online) {
        log('🔄 Conexión restaurada - Firestore se reconectará automáticamente');
      } else {
        log('📴 Conexión perdida - usando cache local');
      }
    });

    // Retornar función de cleanup
    return () => {
      isSubscribed = false;
      activeSubscriptions--;
      if (unsubscribeListener) {
        unsubscribeListener();
      }
      unsubscribeConnection();
    };
  } catch (error) {
    console.error('❌ Error crítico en subscribeToTasks:', error);
    activeSubscriptions--;
    
    // Intentar cargar del cache en caso de error
    const cached = await getCachedTasks();
    callback(cached);
    
    return () => {};
  }
}

/**
 * Crear una nueva tarea en Firebase con información del usuario
 * OFFLINE-FIRST: Si no hay conexión, guarda localmente y sincroniza después
 * @param {Object} task - Objeto con datos de la tarea
 * @returns {Promise<string>} ID de la tarea creada
 */
export async function createTask(task) {
  try {
    // ⏱️ Rate limiting check
    const rateCheck = await checkRateLimit('createTask');
    if (!rateCheck.allowed) {
      const error = new Error(rateCheck.message);
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }

    // 🔍 Validar datos antes de procesar
    const validation = validateData(task, 'task');
    if (!validation.valid) {
      productionLogger.logWarn('Invalid task data', { errors: validation.errors });
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Obtener información del usuario actual
    const sessionResult = await getCurrentSession();
    const currentUserUID = sessionResult.success ? sessionResult.session.userId : 'anonymous';
    const currentUserName = sessionResult.success ? sessionResult.session.displayName : 'Usuario Anónimo';
    const currentUserEmail = sessionResult.success ? sessionResult.session.email : '';

    const taskData = {
      ...task,
      createdBy: currentUserEmail || currentUserUID,
      createdByName: currentUserName,
      department: task.department || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueAt: task.dueAt || Date.now(),
      tags: task.tags || [],
      estimatedHours: task.estimatedHours || null
    };

    // Si hay conexión, crear directamente en Firebase
    if (getConnectionState()) {
      const firestoreData = {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dueAt: Timestamp.fromMillis(task.dueAt || Date.now())
      };

      // 🔄 Retry automático con backoff exponencial
      const docRef = await withRetry(
        async () => {
          return await addDoc(collection(db, COLLECTION_NAME), firestoreData);
        },
        'createTask',
        { maxRetries: 3 }
      );
      
      // 🔔 Enviar notificaciones a los asignados
      // Soporta tanto string como array
      if (task.assignedTo) {
        try {
          // Usar notifyAssignment para notificaciones in-app/FCM (soporta arrays)
          // Esto crea notificaciones en Firestore que se sincronizarán con los usuarios
          await notifyAssignment({
            id: docRef.id,
            title: task.title,
            description: task.description || '',
            dueAt: task.dueAt,
            assignedTo: task.assignedTo,
            priority: task.priority,
            area: task.area
          }).catch(err => {
            log('⚠️ Error en notifyAssignment:', err.message);
          });
          
          // También intentar enviar email (backcompat con string o array)
          if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
            notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
              .catch(err => {
                log('⚠️ Error notificación email:', err.message);
              });
          } else if (task.assignedTo && typeof task.assignedTo === 'string') {
            notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
              .catch(err => {
                log('⚠️ Error notificación email:', err.message);
              });
          }
        } catch (notifErr) {
          productionLogger.logWarn('Error sending notifications', { 
            taskId: docRef.id, 
            error: notifErr.message 
          });
        }
      }
      
      productionLogger.logInfo('Task created', { taskId: docRef.id });
      return docRef.id;
    } else {
      // MODO OFFLINE: Guardar localmente y encolar para sincronización
      log('📴 Creando tarea offline');
      
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineTask = {
        ...taskData,
        id: tempId,
        isOffline: true
      };
      
      // Agregar al cache local
      const cached = await getCachedTasks();
      cached.unshift(offlineTask);
      await cacheTasksLocally(cached);
      
      // Encolar para sincronización
      await queueOperation(OPERATION_TYPES.CREATE, taskData, tempId);
      
      productionLogger.logInfo('Task queued offline', { tempId });
      return tempId;
    }
  } catch (error) {
    // Si falla por cualquier razón, intentar modo offline
    log('⚠️ Error creando tarea, guardando offline:', error.message);
    
    const tempId = `temp_${Date.now()}`;
    const taskData = {
      ...task,
      id: tempId,
      isOffline: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const cached = await getCachedTasks();
    cached.unshift(taskData);
    await cacheTasksLocally(cached);
    await queueOperation(OPERATION_TYPES.CREATE, task, tempId);
    
    return tempId;
  }
}

/**
 * Actualizar una tarea existente
 * OFFLINE-FIRST: Actualiza localmente y sincroniza cuando hay conexión
 * @param {string} taskId - ID de la tarea
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<void>}
 */
export async function updateTask(taskId, updates) {
  try {
    // Si el status cambia a "cerrada", añadir completedBy automáticamente
    if (updates.status === 'cerrada') {
      try {
        const sessionResult = await getCurrentSession();
        if (sessionResult.success && sessionResult.session) {
          const userEmail = sessionResult.session.email;
          const userName = sessionResult.session.displayName || userEmail;
          
          // Obtener la tarea actual para ver los asignados
          const taskRef = doc(db, COLLECTION_NAME, taskId);
          const taskSnap = await getDoc(taskRef);
          
          if (taskSnap.exists()) {
            const taskData = taskSnap.data();
            const assignedTo = taskData.assignedTo || [];
            const existingCompletedBy = taskData.completedBy || [];
            
            // Crear registros de completedBy para todos los asignados
            const newCompletedBy = [...existingCompletedBy];
            
            assignedTo.forEach(email => {
              // Solo añadir si no existe ya
              if (!newCompletedBy.some(c => c.email?.toLowerCase() === email.toLowerCase())) {
                newCompletedBy.push({
                  email: email,
                  completedAt: Timestamp.now(),
                  displayName: email
                });
              }
            });
            
            updates.completedBy = newCompletedBy;
            updates.completedAt = Timestamp.now();
            updates.progress = 100;
          }
        }
      } catch (e) {
        log('⚠️ Error añadiendo completedBy:', e.message);
      }
    }
    
    // Actualizar cache local primero
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

    // Si es una tarea temporal (offline), solo encolar
    if (taskId.startsWith('temp_')) {
      log('📴 Tarea temporal - actualizando solo localmente');
      return;
    }

    // Si hay conexión, actualizar en Firebase
    if (getConnectionState()) {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Convertir dueAt a Timestamp si existe
      if (updates.dueAt) {
        updateData.dueAt = Timestamp.fromMillis(updates.dueAt);
      }

      await updateDoc(taskRef, updateData);
    } else {
      // MODO OFFLINE: Encolar para sincronización
      log('📴 Actualizando tarea offline');
      await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId);
    }
  } catch (error) {
    // Si falla Firebase, encolar para después
    log('⚠️ Error actualizando, encolando para después:', error.message);
    await queueOperation(OPERATION_TYPES.UPDATE, updates, taskId);
  }
}

/**
 * DIAGNÓSTICO: Función para verificar el estado completo de un documento
 * @param {string} taskId 
 */
export async function diagnoseTaskDelete(taskId) {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    
    const docBefore = await getDoc(taskRef);
    
    const deleteStart = Date.now();
    await deleteDoc(taskRef);
    const deleteDuration = Date.now() - deleteStart;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const docAfter = await getDoc(taskRef);
    
    if (docAfter.exists()) {
      return {
        success: false,
        message: 'Documento NO fue eliminado de Firestore',
        details: {
          beforeDelete: docBefore.exists(),
          afterDelete: docAfter.exists(),
          deleteDuration: deleteDuration
        }
      };
    } else {
      return {
        success: true,
        message: 'Documento eliminado correctamente',
        details: {
          beforeDelete: docBefore.exists(),
          afterDelete: docAfter.exists(),
          deleteDuration: deleteDuration
        }
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: 'Error durante diagnóstico',
      error: error.message,
      errorCode: error?.code
    };
  }
}

/**
 * Eliminar una tarea
 * OFFLINE-FIRST: Elimina localmente y sincroniza cuando hay conexión
 * @param {string} taskId - ID de la tarea a eliminar
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  if (!taskId) {
    throw new Error('taskId es requerido para eliminar');
  }
  
  try {
    // Eliminar del cache local primero
    const cached = await getCachedTasks();
    const filtered = cached.filter(t => t.id !== taskId);
    await cacheTasksLocally(filtered);

    // Si es una tarea temporal, solo eliminar del cache
    if (taskId.startsWith('temp_')) {
      log('📴 Tarea temporal eliminada del cache');
      return;
    }

    // Si hay conexión, eliminar de Firebase
    if (getConnectionState()) {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      await deleteDoc(taskRef);
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      // MODO OFFLINE: Encolar para sincronización
      log('📴 Eliminación encolada para sincronización');
      await queueOperation(OPERATION_TYPES.DELETE, {}, taskId);
    }
    return;
    
  } catch (error) {
    // Si falla Firebase, encolar para después
    log('⚠️ Error eliminando, encolando para después:', error.message);
    await queueOperation(OPERATION_TYPES.DELETE, {}, taskId);
  }
}

/**
 * Cargar tareas (fallback si Firebase no está disponible)
 * @returns {Promise<Array>} Array de tareas
 */
export async function loadTasks() {
  return [];
}

/**
 * Obtener métricas generales de tareas del usuario actual
 * @returns {Promise<Object>} Métricas de tareas incluyendo total, completed, etc.
 */
export async function getOverallTaskMetrics() {
  try {
    const sessionResult = await getCurrentSession();
    
    if (!sessionResult.success || !sessionResult.session) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        inReview: 0,
        overdue: 0,
        completionRate: 0,
        avgCompletionTime: 0,
        byPriority: { alta: 0, media: 0, baja: 0 },
        periods: {
          today: { created: 0, completed: 0 },
          week: { created: 0, completed: 0 },
          month: { created: 0, completed: 0 },
        },
        weeklyProductivity: 0,
      };
    }

    const session = sessionResult.session;
    const metricsResult = await getGeneralMetrics(session.userId, session.role);
    
    if (metricsResult.success) {
      return metricsResult.metrics;
    }
    
    return {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      byPriority: { alta: 0, media: 0, baja: 0 },
      periods: {
        today: { created: 0, completed: 0 },
        week: { created: 0, completed: 0 },
        month: { created: 0, completed: 0 },
      },
      weeklyProductivity: 0,
    };
  } catch (error) {
    console.error('Error getting overall task metrics:', error);
    return {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      inReview: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      byPriority: { alta: 0, media: 0, baja: 0 },
      periods: {
        today: { created: 0, completed: 0 },
        week: { created: 0, completed: 0 },
        month: { created: 0, completed: 0 },
      },
      weeklyProductivity: 0,
    };
  }
}
