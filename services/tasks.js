// services/tasks.js
// Servicio para gestionar tareas con Firebase Firestore en tiempo real
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
import { getGeneralMetrics } from './analytics';

const COLLECTION_NAME = 'tasks';

// Helper function to check if a task is assigned to a user (supports both string and array formats)
function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;
  if (Array.isArray(task.assignedTo)) {
    return task.assignedTo.includes(userEmail.toLowerCase());
  }
  // Backward compatibility: old string format
  return task.assignedTo.toLowerCase() === userEmail.toLowerCase();
}

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
        console.log(`✅ Sesión encontrada en intento ${attempt + 1}`);
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
 * ⚠️ IMPORTANTE: NO LLAMA onSnapshot hasta que haya sesión VÁLIDA confirmada
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
    
    // 🔍 PASO 2: Esperar un poco más para asegurar que Firestore está listo
    // Esto previene el race condition donde onSnapshot falla por sesión no lista
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userRole = session.role;
    const userEmail = session.email;
    const userDepartment = session.department;
    const userArea = session.area || '';
    const userDirecciones = session.direcciones || [];
    const userAreasPermitidas = session.areasPermitidas || [...(session.area ? [session.area] : []), ...userDirecciones];

    let tasksQuery;

    // Construir query según el rol del usuario
    if (userRole === 'admin') {
      // Admin ve TODAS las tareas
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'secretario') {
      // Secretario ve tareas de su área específica
      // Usamos query general y filtramos después por área/direcciones
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'jefe') {
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        where('area', '==', userDepartment),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'operativo') {
      tasksQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
    } else {
      callback([]);
      return () => {};
    }

    // 🔍 PASO 3: Ahora SÍ, crear el listener de Firestore
    // En este punto, onSnapshot debería funcionar correctamente
    let isSubscribed = true;
    let unsubscribeListener = null;
    
    unsubscribeListener = onSnapshot(
      tasksQuery,
      (snapshot) => {
        if (!isSubscribed) return;
        
        let tasks = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
            dueAt: data.dueAt?.toMillis ? data.dueAt.toMillis() : data.dueAt || Date.now()
          };
        });
        
        // Filtrar según rol
        if (userRole === 'operativo') {
          tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
        } else if (userRole === 'secretario') {
          // Secretario solo ve tareas de sus áreas permitidas
          tasks = tasks.filter(task => {
            const taskArea = task.area || '';
            // Si la tarea está en alguna de las áreas permitidas (coincidencia exacta)
            if (userAreasPermitidas.includes(taskArea)) return true;
            // Si la tarea fue creada por este secretario
            if (task.createdBy === userEmail) return true;
            return false;
          });
        }
        
        // Deduplicación
        const seenIds = new Set();
        const uniqueTasks = [];
        for (const task of tasks) {
          if (!seenIds.has(task.id)) {
            seenIds.add(task.id);
            uniqueTasks.push(task);
          }
        }
        
        callback(uniqueTasks);
      },
      (error) => {
        // No loguear errores - el context reintentará
        if (isSubscribed) {
          // Silencio absoluto
        }
      }
    );

    // Retornar función de limpieza
    return () => {
      activeSubscriptions--;
      isSubscribed = false;
      if (unsubscribeListener) {
        try {
          unsubscribeListener();
        } catch (e) {
          // Silent
        }
      }
    };
  } catch (error) {
    activeSubscriptions--;
    callback([]);
    return () => {};
  }
}

/**
 * Crear una nueva tarea en Firebase con información del usuario
 * @param {Object} task - Objeto con datos de la tarea
 * @returns {Promise<string>} ID de la tarea creada
 */
export async function createTask(task) {
  try {
    // Obtener información del usuario actual
    const sessionResult = await getCurrentSession();
    const currentUserUID = sessionResult.success ? sessionResult.session.userId : 'anonymous';
    const currentUserName = sessionResult.success ? sessionResult.session.displayName : 'Usuario Anónimo';

    const taskData = {
      ...task,
      createdBy: currentUserUID,
      createdByName: currentUserName,
      department: task.department || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dueAt: Timestamp.fromMillis(task.dueAt),
      tags: task.tags || [],
      estimatedHours: task.estimatedHours || null
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), taskData);
    
    // Enviar notificación por email al asignado
    if (task.assignedTo) {
      notifyTaskAssigned({...task, id: docRef.id}, task.assignedTo)
        .catch(err => {});
    }
    
    return docRef.id;
  } catch (error) {
    
    // Lanzar error con mensaje específico
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para crear tareas');
    } else if (error.code === 'unavailable') {
      throw new Error('Sin conexión. Verifica tu red e intenta nuevamente');
    } else if (error.code === 'resource-exhausted') {
      throw new Error('Límite de operaciones excedido. Intenta más tarde');
    } else {
      throw new Error(`Error al crear tarea: ${error.message}`);
    }
  }
}

/**
 * Actualizar una tarea existente
 * @param {string} taskId - ID de la tarea
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<void>}
 */
export async function updateTask(taskId, updates) {
  try {
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

  } catch (error) {
    
    // Lanzar error con mensaje específico
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permisos para modificar esta tarea');
    } else if (error.code === 'not-found') {
      throw new Error('La tarea no existe o fue eliminada');
    } else if (error.code === 'unavailable') {
      throw new Error('Sin conexión. Verifica tu red e intenta nuevamente');
    } else {
      throw new Error(`Error al actualizar: ${error.message}`);
    }
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
 * @param {string} taskId - ID de la tarea a eliminar
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  if (!taskId) {
    throw new Error('taskId es requerido para eliminar');
  }
  
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
    await new Promise(resolve => setTimeout(resolve, 200));
    return;
    
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error('No tienes permiso para eliminar.');
    } else if (error?.code === 'not-found') {
      return;
    } else if (error?.code === 'unavailable') {
      throw new Error('Sin conexión a Firestore.');
    } else if (error?.code === 'unauthenticated') {
      throw new Error('No autenticado. Inicia sesión.');
    } else {
      throw error;
    }
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
