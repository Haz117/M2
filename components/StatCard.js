// components/StatCard.js
// Tarjeta de estadística mejorada con mejor diseño visual
// ✨ Componente rediseñado para mejor UX/UI

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StatCard({
  icon = 'checkmark-circle',
  iconColor = '#10B981',
  label = 'Completadas',
  value = '0',
  subtitle = '',
  trend = null,  // { direction: 'up' | 'down', value: '5%' }
  variant = 'default', // default, success, warning, error, info
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [animated]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: '#10B98115',
          borderColor: '#10B981',
          textColor: '#10B981',
          iconBg: '#10B98115',
        };
      case 'warning':
        return {
          bgColor: '#F59E0B15',
          borderColor: '#F59E0B',
          textColor: '#F59E0B',
          iconBg: '#F59E0B15',
        };
      case 'error':
        return {
          bgColor: '#EF444415',
          borderColor: '#EF4444',
          textColor: '#EF4444',
          iconBg: '#EF444415',
        };
      case 'info':
        return {
          bgColor: '#3B82F615',
          borderColor: '#3B82F6',
          textColor: '#3B82F6',
          iconBg: '#3B82F615',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'rgba(159, 34, 65, 0.1)',
          borderColor: theme.primary,
          textColor: theme.primary,
          iconBg: `${theme.primary}15`,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: variantStyles.bgColor,
            borderColor: variantStyles.borderColor,
          },
        ]}
      >
        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: variantStyles.iconBg },
              ]}
            >
              <Ionicons name={icon} size={28} color={iconColor || variantStyles.textColor} />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </Text>
          
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: variantStyles.textColor }]}>
              {value}
            </Text>

            {trend && (
              <View
                style={[
                  styles.trend,
                  {
                    backgroundColor: trend.direction === 'up' ? '#10B98115' : '#EF444415',
                    borderColor: trend.direction === 'up' ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                <Ionicons
                  name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
                  size={11}
                  color={trend.direction === 'up' ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trend.direction === 'up' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {trend.value}
                </Text>
              </View>
            )}
          </View>

          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    width: '100%',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    opacity: 0.75,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '400',
    opacity: 0.65,
  },
});
