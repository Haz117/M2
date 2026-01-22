// services/dailyNotifications.js
// Servicio para enviar notificaciones diarias de tareas pendientes y próximas a vencer
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { processRecurringTasks } from './recurrence';
import { sendDailySummary, notifyTaskDueSoon } from './emailNotifications';

const COLLECTION_NAME = 'tasks';

/**
 * Procesar y enviar notificaciones diarias
 * Se debe llamar una vez al día (ej: 8 AM)
 */
export async function processDailyNotifications(userEmail) {
  console.log('📧 Procesando notificaciones diarias para:', userEmail);
  
  try {
    // 1. Procesar tareas recurrentes
    await processRecurringTasks();
    
    // 2. Obtener tareas del usuario
    const tasksRef = collection(db, COLLECTION_NAME);
    const q = query(
      tasksRef,
      where('assignedTo', '==', userEmail),
      where('status', '!=', 'cerrada')
    );
    
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const fortyEightHours = 48 * 60 * 60 * 1000;
    
    // 3. Clasificar tareas
    const overdue = tasks.filter(t => t.dueAt < now);
    const dueToday = tasks.filter(t => {
      const diff = t.dueAt - now;
      return diff > 0 && diff <= twentyFourHours;
    });
    const dueSoon = tasks.filter(t => {
      const diff = t.dueAt - now;
      return diff > twentyFourHours && diff <= fortyEightHours;
    });
    
    // 4. Construir mensaje de resumen
    const summary = {
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueSoon: dueSoon.length,
      total: tasks.length
    };
    
    // 5. Enviar email con resumen diario
    await sendDailySummary(userEmail, summary);
    
    // 6. Enviar emails individuales para tareas que vencen hoy
    for (const task of dueToday) {
      await notifyTaskDueSoon(task, userEmail);
    }
    
    console.log('✅ Emails enviados - Resumen + ' + dueToday.length + ' alertas');
    
    return {
      success: true,
      summary
    };
  } catch (error) {
    console.error('❌ Error procesando notificaciones:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Llamar esta función una vez al día (ej: desde un cron job o manualmente)
 * Procesa tareas recurrentes y envía resumen diario
 */
export async function runDailyTasks(userEmail) {
  console.log('🌅 Ejecutando tareas diarias...');
  return await processDailyNotifications(userEmail);
}
