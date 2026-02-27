// services/usageTracking.js
// Servicio de tracking de uso para entender engagement de usuarios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USAGE_KEY = '@usage_events';
const SESSION_KEY = '@usage_session';

// Estado local
let eventQueue = [];
let currentSession = null;

/**
 * Eventos predefinidos de tracking
 */
export const USAGE_EVENTS = {
  // Navegación
  SCREEN_VIEW: 'screen_view',
  TAB_CHANGE: 'tab_change',
  
  // Tareas
  TASK_CREATE: 'task_create',
  TASK_COMPLETE: 'task_complete',
  TASK_STATUS_CHANGE: 'task_status_change',
  
  // Reportes
  REPORT_SEND: 'report_send',
  
  // Chat
  CHAT_MESSAGE: 'chat_message',
  
  // UI
  FILTER_APPLY: 'filter_apply',
  SEARCH: 'search',
  THEME_TOGGLE: 'theme_toggle',
  COMPACT_VIEW: 'compact_view',
  
  // Errores
  ERROR: 'error',
  
  // Session
  APP_OPEN: 'app_open',
  APP_CLOSE: 'app_close',
};

/**
 * Inicializar tracking con datos de usuario
 */
export async function initUsageTracking(userId, userRole, userArea) {
  try {
    // Cargar eventos pendientes
    const stored = await AsyncStorage.getItem(USAGE_KEY);
    if (stored) {
      eventQueue = JSON.parse(stored);
    }
    
    // Nueva sesión
    currentSession = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId,
      userRole, 
      userArea,
      platform: Platform.OS,
      startTime: Date.now(),
    };
    
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    
    // Track apertura
    trackEvent(USAGE_EVENTS.APP_OPEN);
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Trackear evento genérico
 */
export function trackEvent(eventName, data = {}) {
  if (!eventName) return;
  
  const event = {
    event: eventName,
    timestamp: Date.now(),
    sessionId: currentSession?.id,
    userId: currentSession?.userId,
    platform: Platform.OS,
    data,
  };
  
  eventQueue.push(event);
  
  // Persistir
  persistEvents();
  
  // Log en desarrollo
  if (__DEV__) {
    // console.log(`📊 ${eventName}`, data);
  }
}

/**
 * Track vista de pantalla
 */
export function trackScreen(screenName) {
  trackEvent(USAGE_EVENTS.SCREEN_VIEW, { screen: screenName });
}

/**
 * Track creación de tarea
 */
export function trackTaskCreate(taskData) {
  trackEvent(USAGE_EVENTS.TASK_CREATE, {
    area: taskData?.area,
    priority: taskData?.priority,
    hasAssignees: (taskData?.assignedTo?.length || 0) > 0,
  });
}

/**
 * Track completar tarea
 */
export function trackTaskComplete(taskId, wasOverdue) {
  trackEvent(USAGE_EVENTS.TASK_COMPLETE, { taskId, wasOverdue });
}

/**
 * Track error
 */
export function trackError(errorName, errorMessage, context) {
  trackEvent(USAGE_EVENTS.ERROR, {
    name: errorName,
    message: errorMessage?.substring(0, 100),
    context,
  });
}

/**
 * Persistir eventos
 */
async function persistEvents() {
  try {
    // Mantener solo últimos 200 eventos
    if (eventQueue.length > 200) {
      eventQueue = eventQueue.slice(-200);
    }
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(eventQueue));
  } catch (e) {
    // Silent fail
  }
}

/**
 * Obtener resumen de uso
 */
export async function getUsageSummary() {
  try {
    const stored = await AsyncStorage.getItem(USAGE_KEY);
    const events = stored ? JSON.parse(stored) : [];
    
    const counts = {};
    events.forEach(e => {
      counts[e.event] = (counts[e.event] || 0) + 1;
    });
    
    const uniqueSessions = [...new Set(events.map(e => e.sessionId))].length;
    
    return {
      totalEvents: events.length,
      eventCounts: counts,
      uniqueSessions,
      topScreens: getTopScreens(events),
    };
  } catch (e) {
    return { totalEvents: 0, eventCounts: {}, uniqueSessions: 0, topScreens: [] };
  }
}

/**
 * Obtener pantallas más visitadas
 */
function getTopScreens(events) {
  const screenViews = events.filter(e => e.event === USAGE_EVENTS.SCREEN_VIEW);
  const screenCounts = {};
  
  screenViews.forEach(e => {
    const screen = e.data?.screen || 'unknown';
    screenCounts[screen] = (screenCounts[screen] || 0) + 1;
  });
  
  return Object.entries(screenCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([screen, count]) => ({ screen, count }));
}

/**
 * Limpiar datos de tracking
 */
export async function clearUsageData() {
  eventQueue = [];
  await AsyncStorage.removeItem(USAGE_KEY);
  await AsyncStorage.removeItem(SESSION_KEY);
}

export default {
  init: initUsageTracking,
  track: trackEvent,
  trackScreen,
  trackTaskCreate,
  trackTaskComplete,
  trackError,
  getSummary: getUsageSummary,
  clear: clearUsageData,
  EVENTS: USAGE_EVENTS,
};
