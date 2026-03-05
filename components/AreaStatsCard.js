// components/AreaStatsCard.js
// Tarjeta de estadísticas mejorada para cada área con visual atractivo premium
// ⚡ Optimizado con React.memo y reducción de animaciones loop

import React, { useRef, useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Easing,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const AreaStatsCard = memo(function AreaStatsCard({
  areaName,
  completed,
  total,
  assignedUsers = 0,
  avgCompletionTime = 0,
  overdueTasks = 0,
  onPress,
  index = 0,
  trend = 'stable', // 'up', 'down', 'stable'
  trendValue = 0
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  let statusColor = '#10B981'; // green
  let statusLabel = 'Excelente';
  let statusIcon = 'checkmark-circle';

  if (completionRate < 30) {
    statusColor = '#DC2626'; // red
    statusLabel = 'Crítico';
    statusIcon = 'alert-circle';
  } else if (completionRate < 60) {
    statusColor = '#F59E0B'; // amber
    statusLabel = 'Atrasado';
    statusIcon = 'time';
  } else if (completionRate < 85) {
    statusColor = '#3B82F6'; // blue
    statusLabel = 'En Progreso';
    statusIcon = 'arrow-forward-circle';
  }

  // Determinar si es secretaría o dirección
  const isSecretaria = areaName?.toLowerCase().includes('secretaría');
  const areaIcon = isSecretaria ? 'briefcase' : 'folder-open';

  // Animación de entrada (escalada + opacidad) con efecto springy
  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 120),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animación de barra de progreso
    Animated.timing(progressAnim, {
      toValue: completionRate,
      duration: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
    
    // ⚡ Optimización: Remover shimmer loop infinito que consume CPU
    // El efecto shimmer solo se ejecuta una vez en lugar de loop
    Animated.timing(shimmerAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    
    // Glow pulsante solo una vez para áreas con buen rendimiento
    if (completionRate >= 85) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ]).start();
    }
  }, [completed, total]);
  
  // Handlers para micro-interacciones
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const getGradientColors = () => {
    if (completionRate >= 85) return isDark ? ['#4F46E5', '#7C3AED'] : ['#6366F1', '#8B5CF6'];
    if (completionRate >= 60) return isDark ? ['#2563EB', '#0891B2'] : ['#3B82F6', '#06B6D4'];
    if (completionRate >= 30) return isDark ? ['#D97706', '#EA580C'] : ['#F59E0B', '#F97316'];
    return isDark ? ['#B91C1C', '#7F1D1D'] : ['#DC2626', '#991B1B'];
  };
  
  // Shimmer overlay animation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <TouchableOpacity 
      style={[styles.touchable]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pressAnim) }
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Shimmer effect overlay */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
          
          {/* Glow effect para áreas destacadas */}
          {completionRate >= 85 && (
            <Animated.View
              style={[
                styles.glowEffect,
                { opacity: glowAnim }
              ]}
            />
          )}

          {/* Fondo superior con área translúcida */}
          <View
            style={[
              styles.overlay,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)' },
            ]}
          />

          {/* Contenido principal */}
          <View style={styles.content}>
            {/* Header: Icono de tipo + Nombre del área + Badge */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {/* Icono del tipo de área */}
                <View style={styles.areaTypeIcon}>
                  <Ionicons name={areaIcon} size={16} color="rgba(255,255,255,0.7)" />
                </View>
                <Text
                  style={[styles.areaName, { color: '#FFFFFF' }]}
                  numberOfLines={2}
                >
                  {areaName}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <Ionicons name={statusIcon} size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.statusLabel, { color: '#FFFFFF' }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              {/* Trend indicator */}
              <View style={styles.trendContainer}>
                <Ionicons
                  name={
                    trend === 'up'
                      ? 'arrow-up'
                      : trend === 'down'
                      ? 'arrow-down'
                      : 'remove'
                  }
                  size={16}
                  color={
                    trend === 'up'
                      ? '#10B981'
                      : trend === 'down'
                      ? '#DC2626'
                      : '#6B7280'
                  }
                />
                <Text
                  style={[
                    styles.trendValue,
                    {
                      color:
                        trend === 'up'
                          ? '#10B981'
                          : trend === 'down'
                          ? '#DC2626'
                          : '#6B7280',
                    },
                  ]}
                >
                  {trendValue > 0 ? '+' : ''}{trendValue}%
                </Text>
              </View>
            </View>

            {/* Barra de progreso */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            {/* Métricas principales */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {completed}
                </Text>
                <Text style={styles.metricLabel}>
                  Completadas
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {total}
                </Text>
                <Text style={styles.metricLabel}>
                  Total
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: '#A7F3D0' }]}>
                  {Math.round(completionRate)}%
                </Text>
                <Text style={styles.metricLabel}>
                  Progreso
                </Text>
              </View>
            </View>

            {/* Métricas secundarias */}
            {(assignedUsers > 0 || overdueTasks > 0) && (
              <View style={styles.secondaryMetrics}>
                {assignedUsers > 0 && (
                  <View style={styles.secondaryItem}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={[styles.secondaryText, { color: 'rgba(255,255,255,0.8)' }]}>
                      {assignedUsers} usuario{assignedUsers > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {overdueTasks > 0 && (
                  <View style={[styles.secondaryItem, { backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }]}>
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color="#FCA5A5"
                    />
                    <Text style={[styles.secondaryText, { color: '#FCA5A5' }]}>
                      {overdueTasks} atrasada{overdueTasks > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {avgCompletionTime > 0 && (
                  <View style={styles.secondaryItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={[styles.secondaryText, { color: 'rgba(255,255,255,0.8)' }]}>
                      {avgCompletionTime} días
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Ícono decorativo en esquina */}
          <View style={styles.cornerIcon}>
            <Ionicons
              name="bar-chart-outline"
              size={32}
              color={`${statusColor}40`}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
});

AreaStatsCard.displayName = 'AreaStatsCard';

export default AreaStatsCard;

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gradientBackground: {
    padding: 18,
    minHeight: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  content: {
    zIndex: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  areaTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  areaName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  secondaryMetrics: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cornerIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    opacity: 0.3,
  },
});
