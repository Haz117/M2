// services/notificationsAdvanced.js
// Sistema avanzado de notificaciones (FCM + Local)
// Soporta tareas, subtareas, áreas, y eventos del sistema

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentSession } from './authFirestore';

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_HISTORY_COLLECTION = 'notification_history';

/**
 * Configurar notificaciones
 */
export const configureNotifications = async () => {
  // Solicitar permisos
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Permisos de notificaciones denegados');
    return false;
  }

  // Configurar controlador de notificaciones
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  return true;
};

/**
 * Enviar notificación local
 * @param {Object} options - { title, body, data?, delay? }
 */
export const sendLocalNotification = async (options) => {
  try {
    const { title, body, data = {}, delay = 1000 } = options;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        badge: 1,
        data: {
          ...data,
          timestamp: Date.now(),
        },
      },
      trigger: { seconds: Math.ceil(delay / 1000) },
    });

    console.log('📲 Notificación local enviada:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error en notificación local:', error);
    return null;
  }
};

/**
 * Notificación cuando se asigna una tarea
 * @param {Object} task - { id, title, assignedTo, area, priority }
 */
export const notifyTaskAssigned = async (task) => {
  try {
    const { title, area, priority } = task;
    const assignedEmails = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];

    for (const email of assignedEmails) {
      await recordNotification({
        type: 'task_assigned',
        title: `Nueva tarea asignada: ${title}`,
        body: `Área: ${area || 'Sin área'} • Prioridad: ${priority}`,
        userId: email,
        taskId: task.id,
        metadata: {
          taskTitle: title,
          area,
          priority,
        },
      });

      await sendLocalNotification({
        title: '📌 Nueva Tarea',
        body: `${title} ha sido asignada`,
        data: { taskId: task.id, type: 'task_assigned' },
      });
    }
  } catch (error) {
    console.error('Error notificando tarea asignada:', error);
  }
};

/**
 * Notificación cuando se completa una subtarea
 * @param {Object} subtask - { id, title, taskId }
 * @param {String} completedBy - Email del que completó
 */
export const notifySubtaskCompleted = async (subtask, completedBy) => {
  try {
    await recordNotification({
      type: 'subtask_completed',
      title: `Subtarea completada: ${subtask.title}`,
      body: `Completada por: ${completedBy.split('@')[0]}`,
      taskId: subtask.taskId,
      subtaskId: subtask.id,
      metadata: {
        subtaskTitle: subtask.title,
        completedBy,
      },
    });

    await sendLocalNotification({
      title: '✅ Subtarea Completada',
      body: subtask.title,
      data: { taskId: subtask.taskId, subtaskId: subtask.id },
    });
  } catch (error) {
    console.error('Error notificando subtarea completada:', error);
  }
};

/**
 * Notificación para tareas próximas a vencer
 * @param {Object} task - { id, title, dueAt, area }
 */
export const notifyTaskDueSoon = async (task) => {
  try {
    const daysLeft = Math.ceil((task.dueAt - Date.now()) / (1000 * 60 * 60 * 24));

    await recordNotification({
      type: 'task_due_soon',
      title: `⏰ Tarea próxima a vencer`,
      body: `"${task.title}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      taskId: task.id,
      metadata: {
        taskTitle: task.title,
        daysLeft,
      },
    });

    await sendLocalNotification({
      title: '⏰ Próx. a Vencer',
      body: `${task.title} - ${daysLeft}d`,
      data: { taskId: task.id, type: 'due_soon' },
    });
  } catch (error) {
    console.error('Error notificando vencimiento:', error);
  }
};

/**
 * Notificación cuando se crea una nueva área
 * @param {Object} area - { id, nombre, tipo, descripcion }
 */
export const notifyAreaCreated = async (area) => {
  try {
    // Notificar a todos los admins
    const adminsSnapshot = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );

    for (const doc of adminsSnapshot.docs) {
      const admin = doc.data();
      await recordNotification({
        type: 'area_created',
        title: `Nueva área: ${area.nombre}`,
        body: `Tipo: ${area.tipo === 'secretaria' ? 'Secretaría' : 'Dirección'}`,
        userId: admin.email,
        areaId: area.id,
        metadata: {
          areaName: area.nombre,
          areaType: area.tipo,
        },
      });
    }

    await sendLocalNotification({
      title: '🏢 Nueva Área',
      body: area.nombre,
      data: { areaId: area.id, type: 'area_created' },
    });
  } catch (error) {
    console.error('Error notificando área:', error);
  }
};

/**
 * Notificación cuando se asigna como jefe de área
 * @param {String} userId - Email del jefe
 * @param {Object} area - { id, nombre }
 */
export const notifyAreaChiefAssigned = async (userId, area) => {
  try {
    await recordNotification({
      type: 'area_chief_assigned',
      title: `Asignado como Jefe de Área`,
      body: `Área: ${area.nombre}`,
      userId,
      areaId: area.id,
      metadata: {
        areaName: area.nombre,
      },
    });

    await sendLocalNotification({
      title: '👨‍💼 Asignado como Jefe',
      body: area.nombre,
      data: { areaId: area.id, type: 'chief_assigned' },
    });
  } catch (error) {
    console.error('Error notificando asignación de jefe:', error);
  }
};

/**
 * Registrar notificación en BD (para historial)
 * @private
 */
const recordNotification = async (notification) => {
  try {
    const sessionResult = await getCurrentSession();
    const currentUserId = sessionResult.success ? sessionResult.session.uid : 'system';

    // Si no especifica userId, va a el usuario actual
    const userId = notification.userId || currentUserId;

    await addDoc(collection(db, NOTIFICATION_HISTORY_COLLECTION), {
      ...notification,
      userId,
      createdAt: serverTimestamp(),
      read: false,
      readAt: null,
    });
  } catch (error) {
    console.error('Error registrando notificación:', error);
  }
};

/**
 * Marcar notificación como leída
 * @param {String} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { updateDoc, doc } = require('firebase/firestore');
    const notifRef = doc(db, NOTIFICATION_HISTORY_COLLECTION, notificationId);

    await updateDoc(notifRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marcando como leída:', error);
  }
};

/**
 * Obtener notificaciones del usuario actual
 * @param {Number} limit - Limitde resultados
 * @returns {Promise<Array>}
 */
export const getMyNotifications = async (limit = 50) => {
  try {
    const sessionResult = await getCurrentSession();
    if (!sessionResult.success) return [];

    const userId = sessionResult.session.userId;
    const userEmail = sessionResult.session.email;

    // Buscar en ambas colecciones
    const notifications = [];

    // 1. Buscar en notifications (nuevos reportes, etc)
    try {
      const q1 = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId)
      );
      const snapshot1 = await getDocs(q1);
      snapshot1.docs.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
    } catch (e) {
      console.log('Error buscando en notifications:', e);
    }

    // 2. Buscar también por email
    try {
      const q2 = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userEmail', '==', userEmail)
      );
      const snapshot2 = await getDocs(q2);
      snapshot2.docs.forEach((doc) => {
        // Evitar duplicados
        if (!notifications.find(n => n.id === doc.id)) {
          notifications.push({ id: doc.id, ...doc.data() });
        }
      });
    } catch (e) {
      console.log('Error buscando por email:', e);
    }

    // 3. Buscar en notification_history (historial antiguo)
    try {
      const q3 = query(
        collection(db, NOTIFICATION_HISTORY_COLLECTION),
        where('userId', '==', userEmail)
      );
      const snapshot3 = await getDocs(q3);
      snapshot3.docs.forEach((doc) => {
        if (!notifications.find(n => n.id === doc.id)) {
          notifications.push({ id: doc.id, ...doc.data() });
        }
      });
    } catch (e) {
      console.log('Error buscando en history:', e);
    }

    // Ordenar por fecha descendente
    return notifications.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
      return bTime - aTime;
    }).slice(0, limit);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
};

/**
 * Limpiar notificaciones antiguas (>30 días)
 */
export const cleanOldNotifications = async () => {
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('createdAt', '<', new Date(thirtyDaysAgo))
    );

    const snapshot = await getDocs(q);
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    console.log(`🧹 Limpias ${snapshot.docs.length} notificaciones antiguas`);
  } catch (error) {
    console.error('Error limpiando notificaciones:', error);
  }
};
