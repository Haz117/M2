// services/analytics.js
// Servicio de análisis y estadísticas de tareas
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to check if a task is assigned to a user (supports both string and array formats)
function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;
  if (Array.isArray(task.assignedTo)) {
    return task.assignedTo.includes(userEmail.toLowerCase());
  }
  // Backward compatibility: old string format
  return task.assignedTo.toLowerCase() === userEmail.toLowerCase();
}

// Helper function to get task area (supports both area and areas fields)
function getTaskArea(task) {
  if (task.area) {
    return task.area;
  } else if (task.areas && Array.isArray(task.areas) && task.areas.length > 0) {
    return task.areas[0];
  }
  return 'Sin área';
}

/**
 * Obtener métricas generales
 */
export const getGeneralMetrics = async (userId, userRole) => {
  try {
    let tasksQuery;
    
    // Admin y Secretario ven todas las tareas
    if (userRole === 'admin' || userRole === 'secretario') {
      // Admin/Secretario ve todas las tareas
      tasksQuery = query(collection(db, 'tasks'));
    } else {
      // Otros usuarios ven todas cuando las filtramos
      tasksQuery = query(collection(db, 'tasks'));
    }

    const querySnapshot = await getDocs(tasksQuery);
    let tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar si no es admin ni secretario
    if (userRole !== 'admin' && userRole !== 'secretario') {
      tasks = tasks.filter(task => isTaskAssignedToUser(task, userId));
    }

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = today - (30 * 24 * 60 * 60 * 1000);

    // Métricas básicas
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'cerrada').length;
    const pending = tasks.filter(t => t.status === 'pendiente').length;
    const inProgress = tasks.filter(t => t.status === 'en_proceso').length;
    const inReview = tasks.filter(t => t.status === 'en_revision').length;
    const overdue = tasks.filter(t => 
      t.status !== 'cerrada' && t.dueAt && t.dueAt < now
    ).length;

    // Métricas de tiempo
    const completedTasks = tasks.filter(t => t.status === 'cerrada' && t.completedAt && t.createdAt);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedTasks.length
      : 0;

    // Tareas por prioridad
    const byPriority = {
      alta: tasks.filter(t => t.priority === 'alta').length,
      media: tasks.filter(t => t.priority === 'media').length,
      baja: tasks.filter(t => t.priority === 'baja').length,
    };

    // Tareas creadas en periodos
    const createdToday = tasks.filter(t => t.createdAt >= today).length;
    const createdThisWeek = tasks.filter(t => t.createdAt >= weekAgo).length;
    const createdThisMonth = tasks.filter(t => t.createdAt >= monthAgo).length;

    // Tareas completadas en periodos
    const completedToday = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= today
    ).length;
    const completedThisWeek = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= weekAgo
    ).length;
    const completedThisMonth = tasks.filter(t => 
      t.status === 'cerrada' && t.completedAt >= monthAgo
    ).length;

    // Tasa de completitud
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

    // Productividad (tareas completadas vs creadas esta semana)
    const weeklyProductivity = createdThisWeek > 0 
      ? (completedThisWeek / createdThisWeek * 100).toFixed(1) 
      : 0;

    return {
      success: true,
      metrics: {
        total,
        completed,
        pending,
        inProgress,
        inReview,
        overdue,
        completionRate: parseFloat(completionRate),
        avgCompletionTime: Math.round(avgCompletionTime),
        byPriority,
        periods: {
          today: { created: createdToday, completed: completedToday },
          week: { created: createdThisWeek, completed: completedThisWeek },
          month: { created: createdThisMonth, completed: completedThisMonth },
        },
        weeklyProductivity: parseFloat(weeklyProductivity),
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener datos para gráfica de tendencia (últimos 30 días)
 */
export const getTrendData = async (userId, userRole) => {
  try {
    let tasksQuery;
    
    if (userRole === 'admin' || userRole === 'secretario') {
      tasksQuery = query(collection(db, 'tasks'));
    } else {
      tasksQuery = query(collection(db, 'tasks'));
    }
    
    const querySnapshot = await getDocs(tasksQuery);
    let tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar si no es admin ni secretario
    if (userRole !== 'admin' && userRole !== 'secretario') {
      tasks = tasks.filter(task => isTaskAssignedToUser(task, userId));
    }

    // Últimos 30 días
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const created = tasks.filter(t => 
        t.createdAt >= date.getTime() && t.createdAt < nextDate.getTime()
      ).length;

      const completed = tasks.filter(t => 
        t.completedAt >= date.getTime() && t.completedAt < nextDate.getTime()
      ).length;

      days.push({
        date: date.toISOString().split('T')[0],
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        created,
        completed,
      });
    }

    return { success: true, data: days };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener estadísticas por área
 */
export const getAreaStats = async () => {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const areas = {};
    
    tasks.forEach(task => {
      const area = getTaskArea(task);
      
      if (!areas[area]) {
        areas[area] = {
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          avgCompletionTime: 0,
        };
      }

      areas[area].total++;
      
      if (task.status === 'cerrada') {
        areas[area].completed++;
        if (task.completedAt && task.createdAt) {
          areas[area].avgCompletionTime += (task.completedAt - task.createdAt);
        }
      } else {
        areas[area].pending++;
        if (task.dueAt && task.dueAt < Date.now()) {
          areas[area].overdue++;
        }
      }
    });

    // Calcular promedios
    Object.keys(areas).forEach(area => {
      const completed = areas[area].completed;
      if (completed > 0) {
        areas[area].avgCompletionTime = Math.round(areas[area].avgCompletionTime / completed);
      }
      areas[area].completionRate = areas[area].total > 0 
        ? (areas[area].completed / areas[area].total * 100).toFixed(1)
        : 0;
    });

    return { success: true, areas };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener top performers (usuarios más productivos)
 */
export const getTopPerformers = async () => {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const users = {};

    tasks.forEach(task => {
      const user = task.assignedTo || 'Sin asignar';
      
      if (!users[user]) {
        users[user] = {
          name: task.assignedToName || user,
          total: 0,
          completed: 0,
          completedThisWeek: 0,
          avgCompletionTime: 0,
          onTime: 0, // completadas antes del deadline
        };
      }

      users[user].total++;

      if (task.status === 'cerrada') {
        users[user].completed++;
        
        if (task.completedAt >= weekAgo) {
          users[user].completedThisWeek++;
        }

        if (task.completedAt && task.createdAt) {
          users[user].avgCompletionTime += (task.completedAt - task.createdAt);
        }

        if (task.dueAt && task.completedAt <= task.dueAt) {
          users[user].onTime++;
        }
      }
    });

    // Calcular tasas y ordenar
    const performers = Object.keys(users).map(userId => {
      const user = users[userId];
      return {
        userId,
        name: user.name,
        total: user.total,
        completed: user.completed,
        completedThisWeek: user.completedThisWeek,
        completionRate: user.total > 0 ? (user.completed / user.total * 100).toFixed(1) : 0,
        avgCompletionTime: user.completed > 0 
          ? Math.round(user.avgCompletionTime / user.completed)
          : 0,
        onTimeRate: user.completed > 0 ? (user.onTime / user.completed * 100).toFixed(1) : 0,
      };
    }).sort((a, b) => b.completedThisWeek - a.completedThisWeek);

    return { success: true, performers: performers.slice(0, 10) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Formatear tiempo de milisegundos a texto legible
 */
export const formatCompletionTime = (ms) => {
  if (!ms || ms <= 0) return 'N/A';
  
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  } else {
    const minutes = Math.floor(ms / (60 * 1000));
    return `${minutes}m`;
  }
};

/**
 * Obtener métricas de rendimiento de secretarios (solo para admin)
 * Muestra cuántas tareas ha delegado cada secretario y su efectividad
 */
export const getSecretarioMetrics = async () => {
  try {
    // Obtener todos los usuarios con rol secretario
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'secretario'));
    const usersSnapshot = await getDocs(usersQuery);
    const secretarios = usersSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    // Obtener todas las tareas
    const tasksQuery = query(collection(db, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = today - (30 * 24 * 60 * 60 * 1000);

    // Calcular métricas por secretario
    const secretarioStats = secretarios.map(secretario => {
      // Tareas creadas por este secretario
      const tasksCreated = tasks.filter(t => 
        t.createdBy === secretario.email || t.createdBy === secretario.id
      );

      const tasksCreatedThisWeek = tasksCreated.filter(t => t.createdAt >= weekAgo);
      const tasksCreatedThisMonth = tasksCreated.filter(t => t.createdAt >= monthAgo);

      // Tareas completadas de las que creó
      const tasksCompleted = tasksCreated.filter(t => t.status === 'cerrada');
      const tasksCompletedThisWeek = tasksCompleted.filter(t => t.completedAt >= weekAgo);
      const tasksCompletedThisMonth = tasksCompleted.filter(t => t.completedAt >= monthAgo);

      // Tareas pendientes y vencidas
      const tasksPending = tasksCreated.filter(t => t.status !== 'cerrada');
      const tasksOverdue = tasksPending.filter(t => t.dueAt && t.dueAt < now);

      // Tareas en proceso y en revisión
      const tasksInProgress = tasksCreated.filter(t => t.status === 'en_proceso');
      const tasksInReview = tasksCreated.filter(t => t.status === 'en_revision');

      // Tiempo promedio de completitud
      const completedWithTimes = tasksCompleted.filter(t => t.completedAt && t.createdAt);
      const avgCompletionTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedWithTimes.length
        : 0;

      // Tareas completadas a tiempo
      const onTimeCompleted = tasksCompleted.filter(t => 
        t.dueAt && t.completedAt && t.completedAt <= t.dueAt
      ).length;

      // Tasa de efectividad
      const completionRate = tasksCreated.length > 0 
        ? (tasksCompleted.length / tasksCreated.length * 100).toFixed(1)
        : 0;

      const onTimeRate = tasksCompleted.length > 0
        ? (onTimeCompleted / tasksCompleted.length * 100).toFixed(1)
        : 0;

      // Áreas donde ha delegado tareas
      const areasUsed = [...new Set(tasksCreated.map(t => getTaskArea(t)))];

      return {
        id: secretario.id,
        email: secretario.email,
        displayName: secretario.displayName || secretario.email,
        department: secretario.department || 'Sin departamento',
        area: secretario.area || secretario.department || 'Sin área',
        // Conteos
        totalCreated: tasksCreated.length,
        totalCompleted: tasksCompleted.length,
        totalPending: tasksPending.length,
        totalOverdue: tasksOverdue.length,
        totalInProgress: tasksInProgress.length,
        totalInReview: tasksInReview.length,
        // Esta semana
        createdThisWeek: tasksCreatedThisWeek.length,
        completedThisWeek: tasksCompletedThisWeek.length,
        // Este mes
        createdThisMonth: tasksCreatedThisMonth.length,
        completedThisMonth: tasksCompletedThisMonth.length,
        // Métricas de rendimiento
        completionRate: parseFloat(completionRate),
        onTimeRate: parseFloat(onTimeRate),
        avgCompletionTime,
        // Áreas
        areasUsed,
        areasCount: areasUsed.length,
        // Último activo
        lastActivity: tasksCreated.length > 0 
          ? Math.max(...tasksCreated.map(t => t.createdAt || 0))
          : null
      };
    });

    // Ordenar por tareas creadas (más activos primero)
    secretarioStats.sort((a, b) => b.totalCreated - a.totalCreated);

    // Calcular totales generales
    const totals = {
      totalSecretarios: secretarioStats.length,
      totalTasksCreated: secretarioStats.reduce((sum, s) => sum + s.totalCreated, 0),
      totalTasksCompleted: secretarioStats.reduce((sum, s) => sum + s.totalCompleted, 0),
      totalTasksPending: secretarioStats.reduce((sum, s) => sum + s.totalPending, 0),
      totalTasksOverdue: secretarioStats.reduce((sum, s) => sum + s.totalOverdue, 0),
      avgCompletionRate: secretarioStats.length > 0
        ? (secretarioStats.reduce((sum, s) => sum + s.completionRate, 0) / secretarioStats.length).toFixed(1)
        : 0,
      avgOnTimeRate: secretarioStats.length > 0
        ? (secretarioStats.reduce((sum, s) => sum + s.onTimeRate, 0) / secretarioStats.length).toFixed(1)
        : 0
    };

    return { 
      success: true, 
      secretarios: secretarioStats,
      totals
    };
  } catch (error) {
    console.error('Error obteniendo métricas de secretarios:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtener resumen de actividad de un secretario específico
 */
export const getSecretarioActivitySummary = async (secretarioEmail) => {
  try {
    const tasksQuery = query(collection(db, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtrar tareas creadas por este secretario
    const secretarioTasks = tasks.filter(t => 
      t.createdBy === secretarioEmail || 
      (t.createdByEmail && t.createdByEmail.toLowerCase() === secretarioEmail.toLowerCase())
    );

    // Agrupar por día (últimos 30 días)
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const created = secretarioTasks.filter(t => 
        t.createdAt >= date.getTime() && t.createdAt < nextDate.getTime()
      ).length;

      const completed = secretarioTasks.filter(t => 
        t.status === 'cerrada' && 
        t.completedAt >= date.getTime() && 
        t.completedAt < nextDate.getTime()
      ).length;

      days.push({
        date: date.getTime(),
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        created,
        completed
      });
    }

    // Agrupar por área
    const byArea = {};
    secretarioTasks.forEach(task => {
      const area = getTaskArea(task);
      if (!byArea[area]) {
        byArea[area] = { total: 0, completed: 0, pending: 0, overdue: 0 };
      }
      byArea[area].total++;
      if (task.status === 'cerrada') {
        byArea[area].completed++;
      } else {
        byArea[area].pending++;
        if (task.dueAt && task.dueAt < Date.now()) {
          byArea[area].overdue++;
        }
      }
    });

    return {
      success: true,
      dailyActivity: days,
      byArea,
      totalTasks: secretarioTasks.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
