/**
 * Micro-interactions & Visual Feedback Utilities
 * Haptic feedback, tooltips, confirmations, notifications
 */

import { Vibration, Platform } from 'react-native';

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
  ValidationState,
  ButtonState,
  AnimationPresets,
  TooltipConfig,
  SkeletonConfig,
  EmptyStateConfig,
  PullToRefreshConfig,
  SwipeConfig,
};
