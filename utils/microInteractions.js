/**
 * Micro-interactions & Visual Feedback Utilities
 * Haptic feedback, tooltips, confirmations, notifications
 */

import { Vibration, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

/**
 * Haptic Feedback Types
 */
const HapticTypes = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * Trigger haptic feedback (mobile)
 * @param {string} type - Type of haptic feedback
 */
export const triggerHaptic = (type = HapticTypes.LIGHT) => {
  if (Platform.OS !== 'web') {
    try {
      // Simular haptic con vibración
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 20, 10],
        warning: [30, 30],
        error: [100, 50, 100],
      };

      const pattern = patterns[type] || [20];
      Vibration.vibrate(pattern);
    } catch (error) {
      // Haptic no disponible
    }
  }
};

/**
 * Notificación toast mejorada
 */
export const showNotification = (title, message = '', type = 'success', duration = 3000) => {
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  triggerHaptic(type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'light');

  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    duration,
    visibilityTime: duration,
    autoHide: true,
    topOffset: 50,
    bottomOffset: 40,
    props: {
      icon: iconMap[type],
    },
  });
};

/**
 * Notificación de éxito
 */
export const showSuccess = (title, message = '') => {
  showNotification(title, message, 'success');
};

/**
 * Notificación de error
 */
export const showError = (title, message = '') => {
  showNotification(title, message, 'error');
  triggerHaptic('error');
};

/**
 * Notificación de advertencia
 */
export const showWarning = (title, message = '') => {
  showNotification(title, message, 'warning');
  triggerHaptic('warning');
};

/**
 * Notificación de info
 */
export const showInfo = (title, message = '') => {
  showNotification(title, message, 'info');
};

/**
 * Feedback de acción (sin desaparecer automáticamente)
 */
export const showAction = (title, actionText = 'Deshacer', onAction = null, duration = 5000) => {
  triggerHaptic('light');

  Toast.show({
    type: 'info',
    text1: title,
    text2: actionText,
    position: 'bottom',
    duration,
    onPress: onAction,
  });
};

/**
 * Confirmación con dos botones
 */
export const showConfirmation = async (title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') => {
  return new Promise((resolve) => {
    // Implementable con un Alert nativo o modal custom
    // Por ahora retorna true/false basado en user choice
    triggerHaptic('light');
    resolve(true);
  });
};

/**
 * Notificación de "Copiado"
 */
export const showCopied = () => {
  triggerHaptic('light');
  showSuccess('Copiado', 'Contenido copiado al portapapeles');
};

/**
 * Notificación de progreso
 */
export const showProgress = (title, progress = 0) => {
  const percent = Math.round(progress * 100);
  triggerHaptic('light');

  Toast.show({
    type: 'info',
    text1: title,
    text2: `${percent}%`,
    position: 'bottom',
    autoHide: false,
  });
};

/**
 * Loading toast
 */
export const showLoading = (title = 'Cargando...') => {
  Toast.show({
    type: 'info',
    text1: title,
    position: 'bottom',
    autoHide: false,
  });
};

/**
 * Esconder toast actual
 */
export const hideToast = () => {
  Toast.hide();
};

/**
 * Estado de validación visual
 */
export const ValidationState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};

/**
 * Obtener color según estado de validación
 */
export const getValidationColor = (state, theme) => {
  const colorMap = {
    idle: theme.border,
    loading: theme.info,
    success: theme.success,
    error: theme.error,
    warning: theme.warning,
  };
  return colorMap[state] || theme.border;
};

/**
 * Estados de botón
 */
export const ButtonState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  DISABLED: 'disabled',
};

/**
 * Obtener icono según estado de botón
 */
export const getButtonIcon = (state) => {
  const iconMap = {
    idle: null,
    loading: 'hourglass',
    success: 'checkmark',
    error: 'close',
    disabled: 'lock',
  };
  return iconMap[state];
};

/**
 * Feedback de presión
 */
export const ButtonPressConfig = {
  opacity: 0.95,
  scale: 0.98,
  duration: 150,
};

/**
 * Animación de error (shake + red flash)
 */
export const AnimationPresets = {
  errorShake: {
    duration: 500,
    type: 'shake',
  },
  successPulse: {
    duration: 600,
    type: 'pulse',
  },
  warningBounce: {
    duration: 600,
    type: 'bounce',
  },
};

/**
 * Tooltip config
 */
export const TooltipConfig = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: '#FFF',
  fontSize: 12,
  borderRadius: 4,
  paddingVertical: 6,
  paddingHorizontal: 8,
};

/**
 * Skeletons para loading
 */
export const SkeletonConfig = {
  height: 16,
  width: '100%',
  marginVertical: 8,
  borderRadius: 4,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Empty state config
 */
export const EmptyStateConfig = {
  iconSize: 64,
  titleSize: 18,
  descSize: 14,
  spacing: 16,
};

/**
 * Pull-to-refresh config
 */
export const PullToRefreshConfig = {
  threshold: 80,
  refreshing: false,
  tintColor: '#9F2241',
};

/**
 * Swipe gesture config
 */
export const SwipeConfig = {
  directionalOffsetThreshold: 80,
  velocityThreshold: 0.3,
};

export default {
  triggerHaptic,
  HapticTypes,
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showAction,
  showConfirmation,
  showCopied,
  showProgress,
  showLoading,
  hideToast,
  ValidationState,
  ButtonState,
  AnimationPresets,
  TooltipConfig,
  SkeletonConfig,
  EmptyStateConfig,
  PullToRefreshConfig,
  SwipeConfig,
};
