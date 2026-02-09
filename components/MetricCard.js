// components/MetricCard.js
// Tarjeta de métrica pequeña para mostrar en resumen rápido
// ✨ Metricas rápidas del desempeño

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function MetricCard({
  icon = 'checkmark-circle',
  iconColor = '#10B981',
  label = 'Completadas',
  value = '0',
  subtitle = '',
  borderColor = '#10B981',
  animated = true,
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
            borderColor: borderColor,
            borderLeftColor: borderColor,
          }
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${borderColor}15` }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.value, { color: borderColor }]}>
            {value}
          </Text>
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
    minWidth: 140,
    flex: 1,
    maxWidth: 200,
  },
  container: {
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '400',
  },
});
