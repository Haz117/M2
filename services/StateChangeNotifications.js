// services/StateChangeNotifications.js
// Sistema de notificaciones cuando áreas cambian de estado
// Monitorea cambios y notifica en tiempo real

import { Platform } from 'react-native';
import { db } from '../firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

/**
 * Configurar canal de notificaciones
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('area-alerts', {
      name: 'Alertas de Áreas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9F2241',
    });
  }
}

/**
 * Monitorear cambios en estado de áreas
 * Notifica cuando una área alcanza: 50%, 75%, 100% completación
 */
export function subscribeToAreaStateChanges(callback) {
  const areasRef = collection(db, 'tasks');
  let previousStates = {};

  const unsubscribe = onSnapshot(query(areasRef), (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Agrupar por área
    const areaStates = {};
    tasks.forEach(task => {
      const area = task.area || 'Sin área';
      if (!areaStates[area]) {
        areaStates[area] = {
          total: 0,
          completed: 0,
          overdue: 0,
          overdueTasks: []
        };
      }
      
      areaStates[area].total++;
      if (task.status === 'cerrada') {
        areaStates[area].completed++;
      }
      
      // Detectar vencidas
      const now = Date.now();
      if (task.dueAt && task.dueAt < now && task.status !== 'cerrada') {
        areaStates[area].overdue++;
        areaStates[area].overdueTasks.push(task.title);
      }
    });

    // Detectar cambios de estado
    Object.entries(areaStates).forEach(([area, state]) => {
      const prev = previousStates[area];
      if (!prev) {
        previousStates[area] = state;
        return;
      }

      const completionRate = Math.round((state.completed / state.total) * 100);
      const prevCompletionRate = Math.round((prev.completed / prev.total) * 100);

      // 🎉 Celebrar milestones
      if (completionRate >= 100 && prevCompletionRate < 100) {
        sendNotification(
          `🎉 ¡${area} completada!`,
          `Todas las tareas fueron completadas (${state.completed}/${state.total})`,
          'milestone'
        );
      } else if (completionRate >= 75 && prevCompletionRate < 75) {
        sendNotification(
          `✅ ${area} casi lista`,
          `75% completada (${state.completed}/${state.total})`,
          'milestone'
        );
      } else if (completionRate >= 50 && prevCompletionRate < 50) {
        sendNotification(
          `📊 ${area} en progreso`,
          `50% completada (${state.completed}/${state.total})`,
          'progress'
        );
      }

      // 🚨 Alertar sobre nuevas vencidas
      if (state.overdue > prev.overdue) {
        const newOverdue = state.overdue - prev.overdue;
        sendNotification(
          `⏰ Nuevas vencidas en ${area}`,
          `${newOverdue} tarea(s) vencida(s)`,
          'warning'
        );
      }

      previousStates[area] = state;
    });

    callback(areaStates);
  });

  return unsubscribe;
}

/**
 * Monitorear áreas con problemas críticos
 */
export function subscribeToAreaCriticalStatus(callback) {
  const criticalAlerts = [];

  const handler = (areaStates) => {
    Object.entries(areaStates).forEach(([area, state]) => {
      if (state.total === 0) return;

      const overdueRate = (state.overdue / state.total) * 100;
      const isBlocked = state.completed === 0 && state.total > 3;
      
      const alertKey = area;
      const hasAlert = criticalAlerts.some(a => a.area === area);

      if (overdueRate > 50) {
        if (!hasAlert) {
          sendNotification(
            `🚨 CRÍTICO: ${area}`,
            `${Math.round(overdueRate)}% de tareas vencidas`,
            'critical'
          );
          criticalAlerts.push({ area, type: 'overdue' });
        }
      } else if (isBlocked) {
        if (!hasAlert) {
          sendNotification(
            `⛔ ${area} bloqueada`,
            `${state.total} tareas sin iniciar`,
            'critical'
          );
          criticalAlerts.push({ area, type: 'blocked' });
        }
      } else if (hasAlert) {
        // Remover alert si se resolvió
        const index = criticalAlerts.findIndex(a => a.area === area);
        if (index > -1) criticalAlerts.splice(index, 1);
      }
    });

    callback(criticalAlerts);
  };

  return subscribeToAreaStateChanges(handler);
}

/**
 * Enviar notificación local
 */
async function sendNotification(title, body, type = 'default') {
  try {
    const colors = {
      milestone: '#10B981',
      progress: '#3B82F6',
      warning: '#F59E0B',
      critical: '#DC2626',
      default: '#9F2241'
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type },
        sound: 'default',
        priority: type === 'critical' ? 'max' : 'default',
        color: colors[type] || colors.default,
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
}

/**
 * Notificaciones por email para cambios críticos
 * @param {String} email - Email del admin
 * @param {Object} changes - Cambios detectados
 */
export async function notifyAdminOfCriticalChanges(email, changes) {
  try {
    const { area, type, details } = changes;
    const timestamp = new Date().toLocaleString('es-MX');

    const subject = `[ALERTA] ${area} - ${type}`;
    const body = `
      Se detectó un cambio crítico en ${area}:
      ${details}
      
      Timestamp: ${timestamp}
      Acción recomendada: Revisar tareas del área inmediatamente
    `;

    // Enviar email usando Firestore cloud function (si está configurada)
    // Para ahora solo logueamos
    console.log(`📧 Email notification to ${email}: ${subject}`);
  } catch (error) {
    console.error('Error notificando admin:', error);
  }
}

/**
 * Crear resumen diario de cambios
 */
export function generateDailySummary(areaStates) {
  const summary = {
    date: new Date().toLocaleDateString('es-MX'),
    totalAreas: Object.keys(areaStates).length,
    completedAreas: Object.values(areaStates).filter(s => 
      s.completed === s.total && s.total > 0
    ).length,
    criticalAreas: Object.values(areaStates).filter(s => 
      (s.overdue / (s.total || 1)) > 0.3
    ).length,
    totalTasks: Object.values(areaStates).reduce((sum, s) => sum + s.total, 0),
    completedTasks: Object.values(areaStates).reduce((sum, s) => sum + s.completed, 0),
  };

  summary.completionRate = summary.totalTasks > 0 
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  return summary;
}

/**
 * Limpiar notificaciones antiguas
 */
export async function clearOldNotifications(daysOld = 7) {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    const now = Date.now();
    const limitTime = now - (daysOld * 24 * 60 * 60 * 1000);

    // Nota: Expo Notifications no expone timestamp fácilmente
    // Esta es una simplificación
    for (const notif of notifications) {
      // Puedes implementar lógica más sofisticada aquí
    }
  } catch (error) {
    console.error('Error limpiando notificaciones:', error);
  }
}
