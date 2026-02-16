// components/ProjectCard.js
// Tarjeta de proyecto con progreso en tiempo real
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import ProgressBar from './ProgressBar';
import { subscribeToTaskProgress } from '../services/taskProgress';

const { width } = Dimensions.get('window');

export default function ProjectCard({
  task,
  onPress,
  showSubtaskCount = true,
  compact = false
}) {
  const { theme, isDark } = useTheme();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!task.id) return;

    const unsubscribe = subscribeToTaskProgress(task.id, (data) => {
      setProgressData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [task.id]);

  if (loading) {
    return (
      <View style={[styles.skeleton, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.skeletonLine, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: 'rgba(0,0,0,0.1)', width: '70%' }]} />
      </View>
    );
  }

  const progress = progressData?.overallProgress || 0;
  const isComplete = progress === 100;

  // Determinar colores según progreso
  const getHealthColor = () => {
    if (progress >= 80) return { start: '#10B981', end: '#059669' };
    if (progress >= 50) return { start: '#F59E0B', end: '#D97706' };
    if (progress >= 20) return { start: '#EF4444', end: '#DC2626' };
    return { start: '#6B7280', end: '#4B5563' };
  };

  const healthColor = getHealthColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { backgroundColor: theme.cardBackground },
        compact && styles.compactContainer
      ]}
    >
      <LinearGradient
        colors={[healthColor.start + '15', healthColor.start + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={compact ? 1 : 2}
            >
              {task.title}
            </Text>
            <Text style={[styles.area, { color: theme.textSecondary }]} numberOfLines={1}>
              {task.area || 'Sin área'}
            </Text>
          </View>

          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
        </View>

        {/* Progreso */}
        <View style={compact ? styles.compactProgressSection : styles.progressSection}>
          <ProgressBar
            progress={progress}
            size={compact ? 'small' : 'medium'}
            label={compact ? '' : 'Avance'}
            showLabel={!compact}
            color={healthColor.start}
          />
        </View>

        {/* Stats */}
        {!compact && progressData && (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {progressData.subtaskStats.completada}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Completadas
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {progressData.subtaskStats.en_proceso}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                En Progreso
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {progressData.subtaskStats.pendiente}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Pendientes
              </Text>
            </View>
          </View>
        )}

        {/* Subtask count */}
        {showSubtaskCount && progressData && (
          <View style={styles.footer}>
            <Ionicons name="list" size={14} color={theme.textSecondary} />
            <Text style={[styles.subtaskText, { color: theme.textSecondary }]}>
              {progressData.subtaskStats.total} subtareas
            </Text>

            {/* Asignados */}
            <View style={styles.assigneesContainer}>
              <Ionicons name="people" size={14} color={theme.textSecondary} style={{ marginLeft: 8 }} />
              <Text style={[styles.subtaskText, { color: theme.textSecondary }]}>
                {Object.keys(progressData.progressByAssignee).length} áreas
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  compactContainer: {
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 12
  },
  gradient: {
    padding: 16,
    paddingBottom: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4
  },
  area: {
    fontSize: 12,
    fontWeight: '600'
  },
  completeBadge: {
    marginLeft: 8
  },
  progressSection: {
    marginBottom: 12
  },
  compactProgressSection: {
    marginBottom: 8
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600'
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  subtaskText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  assigneesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  skeleton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 12
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8
  }
});
