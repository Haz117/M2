/**
 * Logger de producción para monitoreo y debugging
 * Integrable con Sentry, Firebase Crashlytics, etc
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORAGE_KEY = 'app_logs';
const ERROR_STORAGE_KEY = 'app_errors';
const MAX_LOGS = 100;
const MAX_ERRORS = 50;
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
  CRITICAL: 'CRITICAL'
};

let logBuffer = [];
let errorBuffer = [];

/**
 * Log info - eventos normales de la app
 */
export const logInfo = (message, data = {}) => {
  logEntry('INFO', message, data);
};

/**
 * Log warn - comportamientos inesperados pero recuperables
 */
export const logWarn = (message, data = {}) => {
  logEntry('WARN', message, data);
};

/**
 * Log error - errores que afectan funcionalidad
 */
export const logError = (message, error = null, data = {}) => {
  const errorData = {
    ...data,
    stack: error?.stack,
    message: error?.message,
  };
  logEntry('ERROR', message, errorData);
  storeError(message, error, errorData);
};

/**
 * Log crítico - errores fatales
 */
export const logCritical = (message, error = null, data = {}) => {
  const errorData = {
    ...data,
    stack: error?.stack,
    message: error?.message,
  };
  logEntry('CRITICAL', message, errorData);
  storeError(message, error, errorData, true);
  
  // En producción, reportar a servicio externo
  reportCriticalError(message, error, errorData);
};

/**
 * Log debug - solo en desarrollo
 */
export const logDebug = (__DEV__ ? (message, data = {}) => {
  logEntry('DEBUG', message, data);
} : () => {});

/**
 * Log de operación asíncrona
 */
export const logAsync = async (operationName, asyncFn) => {
  const startTime = Date.now();
  try {
    const result = await asyncFn();
    const duration = Date.now() - startTime;
    logInfo(`${operationName} succeeded`, { duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`${operationName} failed`, error, { duration });
    throw error;
  }
};

/**
 * Obtener todos los logs
 */
export const getLogs = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

/**
 * Obtener todos los errores
 */
export const getErrors = async () => {
  try {
    const stored = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading errors:', error);
    return [];
  }
};

/**
 * Limpiar logs
 */
export const clearLogs = async () => {
  try {
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
    logBuffer = [];
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    return false;
  }
};

/**
 * Limpiar errores
 */
export const clearErrors = async () => {
  try {
    await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
    errorBuffer = [];
    return true;
  } catch (error) {
    console.error('Error clearing errors:', error);
    return false;
  }
};

/**
 * Exportar logs como JSON (para email/support)
 */
export const exportLogs = async () => {
  try {
    const logs = await getLogs();
    const errors = await getErrors();
    const systemInfo = {
      timestamp: new Date().toISOString(),
      platform: __DEV__ ? 'development' : 'production'
    };

    return JSON.stringify({
      systemInfo,
      logs,
      errors
    }, null, 2);
  } catch (error) {
    console.error('Error exporting logs:', error);
    return null;
  }
};

/**
 * Obtener últimos N logs/errores
 */
export const getRecentLogs = async (count = 20) => {
  const logs = await getLogs();
  return logs.slice(-count);
};

export const getRecentErrors = async (count = 10) => {
  const errors = await getErrors();
  return errors.slice(-count);
};

// ===== IMPLEMENTACIÓN INTERNA =====

const logEntry = (level, message, data = {}) => {
  const entry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
    url: getScreenName() // Track qué pantalla estaba activa
  };

  logBuffer.push(entry);

  // Console en desarrollo
  if (__DEV__) {
    const color = getLogColor(level);
    console.log(
      `%c[${level}] ${message}`,
      `color: ${color}; font-weight: bold;`,
      data
    );
  }

  // Guardar en AsyncStorage (límite de 100 logs)
  persistLogs();
};

const storeError = async (message, error, data, isCritical = false) => {
  const entry = {
    message,
    errorMessage: error?.message,
    stack: error?.stack,
    data,
    isCritical,
    timestamp: new Date().toISOString(),
  };

  errorBuffer.push(entry);

  try {
    const stored = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
    let errors = stored ? JSON.parse(stored) : [];
    errors.push(entry);

    // Mantener máximo 50 errores
    if (errors.length > MAX_ERRORS) {
      errors = errors.slice(-MAX_ERRORS);
    }

    await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(errors));
  } catch (err) {
    console.error('Error storing error:', err);
  }
};

const persistLogs = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    let logs = stored ? JSON.parse(stored) : [];
    logs.push(...logBuffer);

    // Mantener máximo 100 logs
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(-MAX_LOGS);
    }

    await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    logBuffer = [];
  } catch (error) {
    console.error('Error persisting logs:', error);
  }
};

const getLogColor = (level) => {
  const colors = {
    INFO: '#0066cc',
    WARN: '#ff9900',
    ERROR: '#cc0000',
    DEBUG: '#666666',
    CRITICAL: '#cc0000'
  };
  return colors[level] || '#000000';
};

const getScreenName = () => {
  // Placeholder - implementar con react-navigation
  // o user tracking basado en contexto
  return 'Unknown';
};

const reportCriticalError = async (message, error, data) => {
  // Integración para servicios externos (opcional)
  // - Sentry.captureException(error)
  // - Firebase.crashlytics().recordError(error)
  // - POST a /api/logs endpoint

  // Por ahora, solo guardamos localmente
  console.error('[CRITICAL]', message, error, data);
};

export default {
  logInfo,
  logWarn,
  logError,
  logCritical,
  logDebug,
  logAsync,
  getLogs,
  getErrors,
  clearLogs,
  clearErrors,
  exportLogs,
  getRecentLogs,
  getRecentErrors,
  LOG_LEVELS
};
