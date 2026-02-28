/**
 * Enhanced Component Library
 * Theme-aware variants with animations and micro-interactions
 */

import React, { useContext } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { ThemeContext } from '../theme/enhancedTheme';
import { usePressAnimation } from './animations';
import { triggerHaptic, showSuccess } from './microInteractions';

/**
 * Enhanced Button Component
 * Variants: primary, secondary, outline, danger
 */
export const EnhancedButton = ({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  haptic = true,
  ...props
}) => {
  const { theme } = useContext(ThemeContext);
  const { pressAnim, onPressIn, onPressOut } = usePressAnimation();

  const handlePress = () => {
    if (haptic) triggerHaptic('light');
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressAnim.value, [0, 1], [0.95, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary.default,
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: theme.colors.secondary.default,
      borderColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary.default,
      borderWidth: 2,
    },
    danger: {
      backgroundColor: theme.colors.error.default,
      borderColor: 'transparent',
    },
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
    md: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
    lg: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 10 },
  };

  const textColor = variant === 'outline' ? theme.colors.primary.default : '#fff';

  return (
    <Animated.View style={[animatedStyle, { width: fullWidth ? '100%' : 'auto' }]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.button,
          variantStyles[variant],
          sizeStyles[size],
          disabled && { opacity: 0.5 },
        ]}
        {...props}
      >
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : icon ? (
            <>
              {icon}
              <Text style={[styles.buttonText, { color: textColor, marginLeft: 8 }]}>
                {label}
              </Text>
            </>
          ) : (
            <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Enhanced Card Component
 * Elevation, variants, interactive
 */
export const EnhancedCard = ({
  children,
  variant = 'elevated',
  onPress,
  style,
  ...props
}) => {
  const { theme } = useContext(ThemeContext);
  const { pressAnim, onPressIn, onPressOut } = usePressAnimation();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressAnim.value, [0, 1], [0.98, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const variantStyles = {
    elevated: {
      backgroundColor: theme.colors.background.card,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    outlined: {
      backgroundColor: theme.colors.background.primary,
      borderColor: theme.colors.border.light,
      borderWidth: 1,
    },
    filled: {
      backgroundColor: theme.colors.background.hover,
    },
  };

  const Component = onPress ? Animated.View : View;
  const ViewComponent = onPress ? TouchableOpacity : View;

  if (onPress) {
    return (
      <Animated.View
        style={[animatedStyle, { overflow: 'hidden', borderRadius: 12 }]}
      >
        <ViewComponent
          onPress={() => {
            triggerHaptic('light');
            onPress?.();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.7}
          style={[styles.card, variantStyles[variant], style]}
          {...props}
        >
          {children}
        </ViewComponent>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.card, variantStyles[variant], style]} {...props}>
      {children}
    </View>
  );
};

/**
 * Enhanced Input Component
 * With validation feedback, icons, loading
 */
export const EnhancedInput = ({
  placeholder,
  value,
  onChangeText,
  variant = 'outlined',
  state = 'idle', // idle, loading, success, error, warning
  error,
  icon,
  rightIcon,
  multiline = false,
  disabled = false,
  ...props
}) => {
  const { theme } = useContext(ThemeContext);

  const stateColors = {
    idle: theme.colors.border.light,
    loading: theme.colors.info.default,
    success: theme.colors.success.default,
    error: theme.colors.error.default,
    warning: theme.colors.warning.default,
  };

  const variantStyles = {
    outlined: {
      borderWidth: 1,
      borderColor: stateColors[state],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    filled: {
      backgroundColor: theme.colors.background.hover,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 0,
    },
  };

  return (
    <View style={{ width: '100%' }}>
      <View style={[styles.inputContainer, variantStyles[variant]]}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={theme.colors.text.secondary}
          style={[
            styles.input,
            { color: theme.colors.text.primary },
            { flex: 1 },
          ]}
          editable={!disabled}
          multiline={multiline}
          {...props}
        />
        {state === 'loading' && (
          <ActivityIndicator color={stateColors[state]} size="small" />
        )}
        {state === 'success' && rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: theme.colors.error.default }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

/**
 * Enhanced Badge Component
 * With animations and variants
 */
export const EnhancedBadge = ({
  label,
  variant = 'primary',
  size = 'md',
  animated = true,
}) => {
  const { theme } = useContext(ThemeContext);

  const variantColors = {
    primary: theme.colors.primary.default,
    secondary: theme.colors.secondary.default,
    success: theme.colors.success.default,
    warning: theme.colors.warning.default,
    error: theme.colors.error.default,
    info: theme.colors.info.default,
  };

  const sizeStyles = {
    sm: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
    md: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    lg: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        { backgroundColor: variantColors[variant] },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize: size === 'sm' ? 10 : 12 }]}>
        {label}
      </Text>
    </View>
  );
};

/**
 * Enhanced Loading Skeleton
 * Animated placeholder
 */
export const EnhancedSkeleton = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  marginBottom = 8,
}) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          marginBottom,
          backgroundColor: theme.colors.background.hover,
        },
      ]}
    />
  );
};

/**
 * Enhanced Bottom Sheet
 * With slide animation
 */
export const EnhancedBottomSheet = ({
  visible,
  children,
  onClose,
  title,
}) => {
  if (!visible) return null;

  const { theme } = useContext(ThemeContext);

  return (
    <View style={styles.bottomSheetOverlay}>
      <TouchableOpacity
        style={styles.bottomSheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.bottomSheetContent,
          { backgroundColor: theme.colors.background.primary },
        ]}
      >
        {title && (
          <Text style={[styles.bottomSheetTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
        )}
        {children}
      </Animated.View>
    </View>
  );
};

/**
 * Enhanced Divider
 * Semantic styling
 */
export const EnhancedDivider = ({ variant = 'light', marginVertical = 16 }) => {
  const { theme } = useContext(ThemeContext);

  const colors = {
    light: theme.colors.border.light,
    medium: theme.colors.border.medium,
    dark: theme.colors.border.dark,
  };

  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors[variant],
        marginVertical,
      }}
    />
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginHorizontal: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  skeleton: {
    overflow: 'hidden',
  },
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
});

export default {
  EnhancedButton,
  EnhancedCard,
  EnhancedInput,
  EnhancedBadge,
  EnhancedSkeleton,
  EnhancedBottomSheet,
  EnhancedDivider,
};
