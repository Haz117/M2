// services/permissions.js
// Sistema centralizado de permisos para gestión de tareas
// Define qué acciones puede realizar cada rol

import { getDireccionesBySecretaria, getSecretariaByDireccion } from '../config/areas';

/**
 * Roles disponibles en orden de jerarquía
 * admin (4) > secretario (3) > director/jefe (2) > operativo (1)
 */
export const ROLES = {
  ADMIN: 'admin',
  SECRETARIO: 'secretario',
  DIRECTOR: 'director',
  JEFE: 'jefe',
  OPERATIVO: 'operativo'
};

/**
 * Permisos disponibles en el sistema
 */
export const PERMISSIONS = {
  // Tareas
  CREATE_TASK: 'create_task',
  EDIT_TASK: 'edit_task',
  DELETE_TASK: 'delete_task',
  VIEW_TASK: 'view_task',
  CHANGE_STATUS: 'change_status',
  DELEGATE_TASK: 'delegate_task',
  
  // Subtareas
  CREATE_SUBTASK: 'create_subtask',
  EDIT_SUBTASK: 'edit_subtask',
  DELETE_SUBTASK: 'delete_subtask',
  COMPLETE_SUBTASK: 'complete_subtask',
  
  // Reportes
  CREATE_REPORT: 'create_report',
  VIEW_ALL_REPORTS: 'view_all_reports',
  VIEW_AREA_REPORTS: 'view_area_reports',
  RATE_REPORT: 'rate_report',
  
  // Usuarios
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_USERS: 'view_all_users'
};

/**
 * Matriz de permisos por rol
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CHANGE_STATUS,
    PERMISSIONS.DELEGATE_TASK,
    PERMISSIONS.CREATE_SUBTASK,
    PERMISSIONS.EDIT_SUBTASK,
    PERMISSIONS.DELETE_SUBTASK,
    PERMISSIONS.COMPLETE_SUBTASK,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_ALL_REPORTS,
    PERMISSIONS.VIEW_AREA_REPORTS,
    PERMISSIONS.RATE_REPORT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_USERS
  ],
  
  [ROLES.SECRETARIO]: [
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.DELEGATE_TASK,      // Puede delegar a directores de su area
    PERMISSIONS.CHANGE_STATUS,      // Puede cambiar status
    PERMISSIONS.CREATE_SUBTASK,     // Puede crear subtareas
    PERMISSIONS.COMPLETE_SUBTASK,   // Puede completar subtareas
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_AREA_REPORTS,
    PERMISSIONS.RATE_REPORT         // Puede calificar reportes de su area
  ],
  
  [ROLES.DIRECTOR]: [
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CHANGE_STATUS,      // Solo cambiar status de sus tareas
    PERMISSIONS.COMPLETE_SUBTASK,   // Solo completar subtareas asignadas
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_AREA_REPORTS
  ],
  
  [ROLES.JEFE]: [
    PERMISSIONS.CREATE_TASK,        // Puede crear tareas en su area
    PERMISSIONS.EDIT_TASK,          // Puede editar tareas de su area
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CHANGE_STATUS,
    PERMISSIONS.CREATE_SUBTASK,
    PERMISSIONS.EDIT_SUBTASK,
    PERMISSIONS.DELETE_SUBTASK,
    PERMISSIONS.COMPLETE_SUBTASK,
    PERMISSIONS.CREATE_REPORT,
    PERMISSIONS.VIEW_AREA_REPORTS
  ],
  
  [ROLES.OPERATIVO]: [
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CHANGE_STATUS,      // Solo sus tareas asignadas
    PERMISSIONS.COMPLETE_SUBTASK,   // Solo subtareas asignadas
    PERMISSIONS.CREATE_REPORT
  ]
};

/**
 * Verifica si un usuario tiene un permiso específico
 * @param {Object} user - Usuario actual {role, email, area, direcciones}
 * @param {string} permission - Permiso a verificar
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Verifica si el usuario puede editar una tarea específica
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea a editar
 * @returns {Object} {canEdit: boolean, reason: string}
 */
export function canEditTask(user, task) {
  if (!user || !user.role) {
    return { canEdit: false, reason: 'Usuario no autenticado' };
  }
  
  // Solo admin puede editar tareas completamente
  if (user.role === ROLES.ADMIN) {
    return { canEdit: true, reason: 'Admin tiene permisos completos' };
  }
  
  // Jefe puede editar tareas de su área
  if (user.role === ROLES.JEFE) {
    const isInUserArea = task.area === user.area || task.area === user.department;
    if (isInUserArea) {
      return { canEdit: true, reason: 'Jefe puede editar tareas de su área' };
    }
    return { canEdit: false, reason: 'Solo puedes editar tareas de tu área' };
  }
  
  // Secretario, Director, Operativo NO pueden editar tareas
  return { canEdit: false, reason: 'Solo el administrador puede modificar tareas' };
}

/**
 * Verifica si el usuario puede delegar una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea a delegar
 * @returns {Object} {canDelegate: boolean, reason: string, allowedUsers: string[]}
 */
export function canDelegateTask(user, task) {
  if (!user || !user.role) {
    return { canDelegate: false, reason: 'Usuario no autenticado', allowedUsers: [] };
  }
  
  // Admin puede delegar a cualquiera
  if (user.role === ROLES.ADMIN) {
    return { canDelegate: true, reason: 'Admin puede delegar', allowedUsers: 'all' };
  }
  
  // Secretario puede delegar a directores de sus áreas
  if (user.role === ROLES.SECRETARIO) {
    // Obtener las direcciones que maneja este secretario
    const direccionesPermitidas = user.direcciones || [];
    const areasPermitidas = user.areasPermitidas || [];
    
    // Combinar todas las áreas del secretario
    const todasAreas = [...new Set([
      user.area,
      ...direccionesPermitidas,
      ...areasPermitidas
    ])].filter(Boolean);
    
    // Verificar si la tarea pertenece a una de sus áreas
    const taskAreas = task.areas || [task.area];
    const canDelegateThisTask = taskAreas.some(ta => todasAreas.includes(ta));
    
    if (canDelegateThisTask) {
      return { 
        canDelegate: true, 
        reason: 'Secretario puede delegar a directores de su área',
        allowedAreas: todasAreas
      };
    }
    
    return { 
      canDelegate: false, 
      reason: 'Esta tarea no pertenece a tus áreas',
      allowedAreas: []
    };
  }
  
  // Otros roles no pueden delegar
  return { canDelegate: false, reason: 'No tienes permisos para delegar', allowedUsers: [] };
}

/**
 * Verifica si el usuario puede crear subtareas
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea padre
 * @returns {Object} {canCreate: boolean, reason: string}
 */
export function canCreateSubtask(user, task) {
  if (!user || !user.role) {
    return { canCreate: false, reason: 'Usuario no autenticado' };
  }
  
  // Admin siempre puede
  if (user.role === ROLES.ADMIN) {
    return { canCreate: true, reason: 'Admin puede crear subtareas' };
  }
  
  // Jefe puede crear subtareas en su área
  if (user.role === ROLES.JEFE) {
    const isInUserArea = task.area === user.area || task.area === user.department;
    if (isInUserArea) {
      return { canCreate: true, reason: 'Jefe puede crear subtareas en su área' };
    }
    return { canCreate: false, reason: 'Solo puedes crear subtareas en tu área' };
  }
  
  // Secretario puede crear subtareas en sus áreas
  if (user.role === ROLES.SECRETARIO) {
    const direccionesPermitidas = user.direcciones || [];
    const areasPermitidas = user.areasPermitidas || [];
    const todasAreas = [...new Set([
      user.area,
      ...direccionesPermitidas,
      ...areasPermitidas
    ])].filter(Boolean);
    
    const taskAreas = task.areas || [task.area];
    const canCreateHere = taskAreas.some(ta => todasAreas.includes(ta));
    
    if (canCreateHere) {
      return { canCreate: true, reason: 'Secretario puede crear subtareas en sus áreas' };
    }
    return { canCreate: false, reason: 'Esta tarea no pertenece a tus áreas' };
  }
  
  // Director y Operativo no pueden crear subtareas
  return { canCreate: false, reason: 'No tienes permisos para crear subtareas' };
}

/**
 * Verifica si el usuario puede cambiar el status de una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea
 * @returns {Object} {canChange: boolean, reason: string}
 */
export function canChangeTaskStatus(user, task) {
  if (!user || !user.role) {
    return { canChange: false, reason: 'Usuario no autenticado' };
  }
  
  // Admin siempre puede
  if (user.role === ROLES.ADMIN) {
    return { canChange: true, reason: 'Admin puede cambiar status' };
  }
  
  // Todos los roles pueden cambiar status de tareas asignadas a ellos
  const assignedTo = task.assignedTo || [];
  const isAssigned = Array.isArray(assignedTo) 
    ? assignedTo.includes(user.email?.toLowerCase())
    : assignedTo?.toLowerCase() === user.email?.toLowerCase();
  
  if (isAssigned) {
    return { canChange: true, reason: 'Puedes cambiar el status de tus tareas asignadas' };
  }
  
  // Secretario puede cambiar status de tareas en sus áreas
  if (user.role === ROLES.SECRETARIO) {
    const direccionesPermitidas = user.direcciones || [];
    const areasPermitidas = user.areasPermitidas || [];
    const todasAreas = [...new Set([
      user.area,
      ...direccionesPermitidas,
      ...areasPermitidas
    ])].filter(Boolean);
    
    const taskAreas = task.areas || [task.area];
    const canChangeHere = taskAreas.some(ta => todasAreas.includes(ta));
    
    if (canChangeHere) {
      return { canChange: true, reason: 'Secretario puede gestionar tareas de su área' };
    }
  }
  
  // Jefe puede cambiar status de tareas en su área
  if (user.role === ROLES.JEFE) {
    const isInUserArea = task.area === user.area || task.area === user.department;
    if (isInUserArea) {
      return { canChange: true, reason: 'Jefe puede gestionar tareas de su área' };
    }
  }
  
  return { canChange: false, reason: 'No tienes permisos para cambiar el status de esta tarea' };
}

/**
 * Verifica si el usuario puede eliminar una tarea
 * @param {Object} user - Usuario actual
 * @param {Object} task - Tarea
 * @returns {Object} {canDelete: boolean, reason: string}
 */
export function canDeleteTask(user, task) {
  if (!user || !user.role) {
    return { canDelete: false, reason: 'Usuario no autenticado' };
  }
  
  // Solo admin puede eliminar tareas
  if (user.role === ROLES.ADMIN) {
    return { canDelete: true, reason: 'Admin puede eliminar tareas' };
  }
  
  return { canDelete: false, reason: 'Solo el administrador puede eliminar tareas' };
}

/**
 * Verifica si el usuario puede crear una nueva tarea
 * @param {Object} user - Usuario actual
 * @returns {Object} {canCreate: boolean, allowedAreas: string[]}
 */
export function canCreateTask(user) {
  if (!user || !user.role) {
    return { canCreate: false, allowedAreas: [], reason: 'Usuario no autenticado' };
  }
  
  // Admin puede crear tareas en cualquier área
  if (user.role === ROLES.ADMIN) {
    return { canCreate: true, allowedAreas: 'all', reason: 'Admin puede crear tareas' };
  }
  
  // Jefe puede crear tareas solo en su área
  if (user.role === ROLES.JEFE) {
    const areas = [user.area, user.department].filter(Boolean);
    return { canCreate: true, allowedAreas: areas, reason: 'Jefe puede crear tareas en su área' };
  }
  
  // Secretario, Director, Operativo NO pueden crear tareas
  return { canCreate: false, allowedAreas: [], reason: 'Solo administradores y jefes pueden crear tareas' };
}

/**
 * Obtiene el resumen de permisos para un usuario
 * @param {Object} user - Usuario actual
 * @returns {Object} Resumen de permisos
 */
export function getPermissionsSummary(user) {
  if (!user || !user.role) {
    return {
      canCreateTask: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canDelegateTasks: false,
      canCreateSubtasks: false,
      canViewAllReports: false,
      canManageUsers: false,
      role: null
    };
  }
  
  return {
    canCreateTask: hasPermission(user, PERMISSIONS.CREATE_TASK),
    canEditTasks: user.role === ROLES.ADMIN || user.role === ROLES.JEFE,
    canDeleteTasks: user.role === ROLES.ADMIN,
    canDelegateTasks: user.role === ROLES.ADMIN || user.role === ROLES.SECRETARIO,
    canCreateSubtasks: hasPermission(user, PERMISSIONS.CREATE_SUBTASK),
    canViewAllReports: user.role === ROLES.ADMIN,
    canManageUsers: user.role === ROLES.ADMIN,
    role: user.role
  };
}

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  canEditTask,
  canDelegateTask,
  canCreateSubtask,
  canChangeTaskStatus,
  canDeleteTask,
  canCreateTask,
  getPermissionsSummary
};
