// services/dailyEmailNotifications.js
// Servicio para enviar emails diarios de resumen de tareas
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { sendEmail } from './emailNotifications';

// Helper function to check if a task is assigned to a user (supports both string and array formats)
function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;
  if (Array.isArray(task.assignedTo)) {
    return task.assignedTo.includes(userEmail.toLowerCase());
  }
  // Backward compatibility: old string format
  return task.assignedTo.toLowerCase() === userEmail.toLowerCase();
}

/**
 * Envía email diario con resumen de tareas al usuario
 * @param {string} userEmail - Email del usuario
 * @param {string} userName - Nombre del usuario
 * @param {string} role - Rol del usuario (admin, jefe, operativo)
 * @param {string} department - Departamento del usuario (para jefes)
 */
export async function sendDailyTaskSummary(userEmail, userName, role, department = null) {
  try {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    // Obtener tareas según rol
    const tasksRef = collection(db, 'tasks');
    let q;

    if (role === 'admin') {
      q = query(tasksRef, orderBy('dueAt', 'asc'));
    } else if (role === 'jefe' && department) {
      q = query(tasksRef, where('area', '==', department), orderBy('dueAt', 'asc'));
    } else {
      q = query(tasksRef, orderBy('dueAt', 'asc'));
    }

    const snapshot = await getDocs(q);
    let allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar si no es admin o jefe
    if (role !== 'admin' && role !== 'jefe') {
      allTasks = allTasks.filter(task => isTaskAssignedToUser(task, userEmail));
    }

    // Clasificar tareas
    const overdueTasks = allTasks.filter(t => t.dueAt < now && t.status !== 'cerrada');
    const todayTasks = allTasks.filter(t => 
      t.dueAt >= todayStart && 
      t.dueAt < todayEnd && 
      t.status !== 'cerrada'
    );
    const weekTasks = allTasks.filter(t => {
      const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
      return t.dueAt >= now && t.dueAt < weekEnd && t.status !== 'cerrada';
    });
    const completedYesterday = allTasks.filter(t => {
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
      return t.completedAt >= yesterdayStart && t.completedAt < todayStart;
    });

    // No enviar si no hay nada relevante
    if (overdueTasks.length === 0 && todayTasks.length === 0 && weekTasks.length === 0) {
      return null;
    }

    // Construir HTML del email
    const emailHTML = buildDailySummaryHTML({
      userName,
      overdueTasks,
      todayTasks,
      weekTasks,
      completedYesterday,
      role
    });

    // Enviar email
    const subject = `Resumen Diario de Tareas - ${new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;

    await sendEmail({
      to: userEmail,
      subject,
      html: emailHTML
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Construye el HTML del email de resumen diario
 */
function buildDailySummaryHTML({ userName, overdueTasks, todayTasks, weekTasks, completedYesterday, role }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTaskList = (tasks, maxShow = 5) => {
    if (tasks.length === 0) return '<p style="color: #6B7280;">Ninguna</p>';
    
    const displayTasks = tasks.slice(0, maxShow);
    const remaining = tasks.length - maxShow;
    
    return `
      <ul style="margin: 0; padding-left: 20px;">
        ${displayTasks.map(task => `
          <li style="margin-bottom: 8px;">
            <strong>${task.title}</strong><br/>
            <span style="color: #6B7280; font-size: 13px;">
              ${task.area} • Vence: ${formatDate(task.dueAt)} • 
              Prioridad: ${task.priority === 'alta' ? '🔴' : task.priority === 'media' ? '🟡' : '🟢'}
            </span>
          </li>
        `).join('')}
      </ul>
      ${remaining > 0 ? `<p style="color: #6B7280; margin-top: 8px;">... y ${remaining} más</p>` : ''}
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen Diario de Tareas</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F3F4F6;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #9F2241 0%, #7A1A32 100%); padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">
        Resumen Diario de Tareas
      </h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
        ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>

    <!-- Saludo -->
    <div style="padding: 30px 20px 10px 20px;">
      <p style="margin: 0; font-size: 16px; color: #1F2937;">
        Hola <strong>${userName}</strong>,
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
        Aquí está tu resumen diario de tareas. ${role === 'admin' ? 'Como administrador, ves todas las tareas del sistema.' : ''}
      </p>
    </div>

    <!-- Tareas Vencidas -->
    ${overdueTasks.length > 0 ? `
    <div style="margin: 20px; padding: 20px; background-color: #FEE2E2; border-left: 4px solid #DC2626; border-radius: 8px;">
      <h2 style="margin: 0 0 15px 0; color: #DC2626; font-size: 18px; display: flex; align-items: center;">
        ⚠ Tareas Vencidas (${overdueTasks.length})
      </h2>
      ${renderTaskList(overdueTasks)}
      <p style="margin: 15px 0 0 0; padding: 12px; background-color: #FFFFFF; border-radius: 6px; font-size: 13px; color: #991B1B;">
        <strong>⚠ Acción requerida:</strong> Estas tareas requieren atención inmediata.
      </p>
    </div>
    ` : ''}

    <!-- Tareas de Hoy -->
    ${todayTasks.length > 0 ? `
    <div style="margin: 20px; padding: 20px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px;">
      <h2 style="margin: 0 0 15px 0; color: #D97706; font-size: 18px;">
        Tareas para Hoy (${todayTasks.length})
      </h2>
      ${renderTaskList(todayTasks)}
    </div>
    ` : `
    <div style="margin: 20px; padding: 20px; background-color: #ECFDF5; border-left: 4px solid #10B981; border-radius: 8px;">
      <p style="margin: 0; color: #059669; font-size: 15px;">
        <strong>¡Excelente!</strong> No tienes tareas pendientes para hoy.
      </p>
    </div>
    `}

    <!-- Tareas de la Semana -->
    ${weekTasks.length > 0 ? `
    <div style="margin: 20px; padding: 20px; background-color: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 8px;">
      <h2 style="margin: 0 0 15px 0; color: #2563EB; font-size: 18px;">
        📆 Próximos 7 Días (${weekTasks.length} tareas)
      </h2>
      ${renderTaskList(weekTasks, 3)}
    </div>
    ` : ''}

    <!-- Tareas Completadas Ayer -->
    ${completedYesterday.length > 0 ? `
    <div style="margin: 20px; padding: 20px; background-color: #F0FDF4; border-left: 4px solid #22C55E; border-radius: 8px;">
      <h2 style="margin: 0 0 10px 0; color: #16A34A; font-size: 16px;">
        Completadas Ayer (${completedYesterday.length})
      </h2>
      <p style="margin: 0; font-size: 14px; color: #166534;">
        ¡Buen trabajo! Completaste ${completedYesterday.length} ${completedYesterday.length === 1 ? 'tarea' : 'tareas'} ayer.
      </p>
    </div>
    ` : ''}

    <!-- Footer con estadísticas -->
    <div style="margin: 20px; padding: 20px; background-color: #F9FAFB; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Resumen Rápido</h3>
      <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
        <div style="min-width: 100px; margin: 10px;">
          <div style="font-size: 28px; font-weight: 700; color: #DC2626;">${overdueTasks.length}</div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 5px;">Vencidas</div>
        </div>
        <div style="min-width: 100px; margin: 10px;">
          <div style="font-size: 28px; font-weight: 700; color: #F59E0B;">${todayTasks.length}</div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 5px;">Hoy</div>
        </div>
        <div style="min-width: 100px; margin: 10px;">
          <div style="font-size: 28px; font-weight: 700; color: #3B82F6;">${weekTasks.length}</div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 5px;">Esta Semana</div>
        </div>
      </div>
    </div>

    <!-- Call to Action -->
    <div style="padding: 30px 20px; text-align: center; background-color: #FAFAFA;">
      <a href="${process.env.APP_URL || 'https://tu-app.com'}" 
         style="display: inline-block; padding: 14px 32px; background-color: #9F2241; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Ver Todas las Tareas
      </a>
      <p style="margin: 20px 0 0 0; font-size: 12px; color: #9CA3AF;">
        Este es un resumen automático enviado diariamente.<br/>
        Para dejar de recibir estos emails, contacta al administrador.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Programa el envío de emails diarios para todos los usuarios activos
 * Se debe ejecutar desde un cron job o cloud function
 */
export async function sendDailyEmailsToAllUsers() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const promises = snapshot.docs.map(async (doc) => {
      const user = doc.data();
      if (user.email && user.displayName) {
        return sendDailyTaskSummary(
          user.email, 
          user.displayName, 
          user.role || 'operativo',
          user.department
        );
      }
    });

    await Promise.allSettled(promises);
    return true;
  } catch (error) {
    return false;
  }
}
