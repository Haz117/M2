// components/AreaStatsCard.js
// Tarjeta de estadísticas mejorada para cada área con visual atractivo

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function AreaStatsCard({
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
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  let statusColor = '#10B981'; // green
  let statusLabel = 'Excelente';

  if (completionRate < 30) {
    statusColor = '#DC2626'; // red
    statusLabel = 'Crítico';
  } else if (completionRate < 60) {
    statusColor = '#F59E0B'; // amber
    statusLabel = 'Atrasado';
  } else if (completionRate < 85) {
    statusColor = '#3B82F6'; // blue
    statusLabel = 'En Progreso';
  }

  // Animación de entrada (escalada + opacidad)
  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animación de barra de progreso
    Animated.timing(progressAnim, {
      toValue: completionRate,
      duration: 1000,
      easing: Easing.easeInOut,
      useNativeDriver: false,
    }).start();
  }, [completed, total]);

  const getGradientColors = () => {
    if (completionRate >= 85) return ['#6366F1', '#8B5CF6']; // Indigo a Purple
    if (completionRate >= 60) return ['#3B82F6', '#06B6D4']; // Blue a Cyan
    if (completionRate >= 30) return ['#F59E0B', '#F97316']; // Amber a Orange
    return ['#DC2626', '#991B1B']; // Red
  };

  return (
    <TouchableOpacity 
      style={[styles.touchable]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
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
          {/* Fondo superior con área translucion */}
          <View
            style={[
              styles.overlay,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)' },
            ]}
          />

          {/* Contenido principal */}
          <View style={styles.content}>
            {/* Header: Nombre del área + Badge */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text
                  style={[styles.areaName, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {areaName}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor + '30' },
                  ]}
                >
                  <Text style={[styles.statusLabel, { color: statusColor }]}>
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
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>

            {/* Métricas principales */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {completed}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
                  Completadas
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {total}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
                  Total
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: statusColor }]}>
                  {Math.round(completionRate)}%
                </Text>
                <Text
                  style={[styles.metricLabel, { color: theme.textSecondary }]}
                >
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
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[styles.secondaryText, { color: theme.textSecondary }]}
                    >
                      {assignedUsers} usuario{assignedUsers > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {overdueTasks > 0 && (
                  <View style={styles.secondaryItem}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color="#DC2626"
                    />
                    <Text style={[styles.secondaryText, { color: '#DC2626' }]}>
                      {overdueTasks} atrasada{overdueTasks > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {avgCompletionTime > 0 && (
                  <View style={styles.secondaryItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[styles.secondaryText, { color: theme.textSecondary }]}
                    >
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
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  gradientBackground: {
    padding: 16,
    minHeight: 200,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  content: {
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
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
