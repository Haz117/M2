// screens/TaskProgressScreen.js
// Pantalla detallada de progreso de una tarea con múltiples asignados
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { subscribeToTaskProgress } from '../services/taskProgress';
import { getCurrentSession } from '../services/authFirestore';
import { useTheme } from '../contexts/ThemeContext';
import ProgressBar from '../components/ProgressBar';
import LoadingIndicator from '../components/LoadingIndicator';

const { width } = Dimensions.get('window');

export default function TaskProgressScreen({ route, navigation }) {
  const { taskId, task } = route.params;
  const { theme, isDark } = useTheme();

  const [expandedSubtask, setExpandedSubtask] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Cargar usuario actual
  useEffect(() => {
    const loadUser = async () => {
      const result = await getCurrentSession();
      if (result.success) {
        setCurrentUser(result.session);
      }
    };
    loadUser();
  }, []);

  // Suscribir a cambios de progreso en tiempo real
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTaskProgress(taskId, (data) => {
      setProgressData(data);
      setLoading(false);
      setRefreshing(false);

      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        })
      ]).start();
    });

    return () => unsubscribe();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const handleEdit = () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'jefe')) {
      Alert.alert('Sin permisos', 'Solo administradores y jefes pueden editar tareas');
      return;
    }
    navigation.navigate('TaskDetail', { task });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingIndicator />
      </View>
    );
  }

  if (!progressData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            No se encontró la tarea
          </Text>
        </View>
      </View>
    );
  }

  const { overallProgress, progressByAssignee, subtaskStats, isComplete } = progressData;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { backgroundColor: '#9F2241' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="trending-up" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Progreso de Tarea</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        {currentUser && (currentUser.role === 'admin' || currentUser.role === 'jefe') && (
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => navigation.navigate('TaskReportsAndActivity', { taskId, taskTitle: progressData?.titulo })}
          style={styles.headerButton}
        >
          <Ionicons name="document-text" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* CARD PROGRESO GENERAL */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Progreso General</Text>
            {isComplete && (
              <View style={styles.completionBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.completionBadgeText}>Completada</Text>
              </View>
            )}
          </View>

          <View style={styles.spacer} />

          <ProgressBar
            progress={overallProgress}
            size="large"
            label="Avance Total"
            color="#9F2241"
          />

          <View style={[styles.statsGrid, { marginTop: 20 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>
                {subtaskStats.completada}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Completadas
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                {subtaskStats.en_proceso}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                En Proceso
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                {subtaskStats.pendiente}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Pendientes
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>
                {subtaskStats.total}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total
              </Text>
            </View>
          </View>
        </View>

        {/* CARD PROGRESO POR ASIGNADO */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 16 }]}>
            Progreso por Asignado
          </Text>

          {Object.entries(progressByAssignee).length > 0 ? (
            Object.entries(progressByAssignee).map(([email, progress]) => (
              <View key={email} style={styles.assigneeProgressItem}>
                <View style={styles.assigneeHeader}>
                  <View style={styles.assigneeAvatar}>
                    <Text style={styles.assigneeAvatarText}>
                      {email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assigneeEmail, { color: theme.text }]}>
                      {email.split('@')[0]}
                    </Text>
                    <Text style={[styles.assigneeSubtext, { color: theme.textSecondary }]}>
                      {progress.completed} de {progress.total} tareas
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          progress.status === 'completada'
                            ? '#D1FAE5'
                            : progress.status === 'en-progreso'
                            ? '#FEF3C7'
                            : '#FEE2E2'
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            progress.status === 'completada'
                              ? '#047857'
                              : progress.status === 'en-progreso'
                              ? '#92400E'
                              : '#991B1B'
                        }
                      ]}
                    >
                      {progress.percentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.assigneeProgressBar}>
                  <ProgressBar
                    progress={progress.percentage}
                    size="small"
                    showLabel={false}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyAssignees}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Sin asignados
              </Text>
            </View>
          )}
        </View>

        {/* CARD SUBTAREAS */}
        {progressData.subtasks && progressData.subtasks.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="checklist" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 8, flex: 1 }]}>
                Subtareas ({progressData.subtasks.length})
              </Text>
              <View style={[styles.progressBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.progressBadgeText}>
                  {progressData.subtaskStats.completada}/{progressData.subtaskStats.total}
                </Text>
              </View>
            </View>

            <ProgressBar
              progress={progressData.overallProgress}
              size="small"
              showLabel={true}
              color={progressData.isComplete ? '#34C759' : theme.primary}
            />

            <View style={styles.subtasksList}>
              {progressData.subtasks.map((subtask, index) => {
                const isExpanded = expandedSubtask === subtask.id;
                const isCompleted = subtask.status === 'completada';
                
                return (
                  <TouchableOpacity
                    key={subtask.id}
                    onPress={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
                    style={[
                      styles.subtaskItem,
                      {
                        borderColor: isCompleted ? '#10B981' : theme.border,
                        backgroundColor: isCompleted ? '#F0FDF4' : isDark ? '#2a2a2e' : '#f5f5f7',
                        paddingBottom: isExpanded ? 16 : 12,
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Header */}
                    <View style={styles.subtaskHeader}>
                      <View style={styles.subtaskStatus}>
                        {isCompleted ? (
                          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                        ) : (
                          <Ionicons name="radio-button-off" size={24} color={theme.textSecondary} />
                        )}
                      </View>

                      <View style={styles.subtaskMainContent}>
                        <Text
                          style={[
                            styles.subtaskTitle,
                            {
                              color: theme.text,
                              textDecorationLine: isCompleted ? 'line-through' : 'none',
                              opacity: isCompleted ? 0.6 : 1,
                            }
                          ]}
                        >
                          {subtask.title}
                        </Text>
                        <Text style={[styles.subtaskMeta, { color: theme.textSecondary }]}>
                          {subtask.assignedTo ? subtask.assignedTo.split('@')[0] : 'Sin asignar'} • {subtask.status.replace('_', ' ')}
                        </Text>
                      </View>

                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </View>

                    {/* Detalles Expandibles */}
                    {isExpanded && (
                      <View style={[styles.subtaskDetails, { borderTopColor: theme.border }]}>
                        {subtask.description && (
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {subtask.description}
                          </Text>
                        )}
                        {subtask.createdAt && (
                          <Text style={[styles.subtaskTimestamp, { color: theme.textTertiary }]}>
                            Creada: {new Date(subtask.createdAt.toMillis?.() || subtask.createdAt).toLocaleDateString()}
                          </Text>
                        )}
                        {isCompleted && subtask.completedAt && (
                          <Text style={[styles.subtaskTimestamp, { color: '#34C759' }]}>
                            ✓ Completada: {new Date(subtask.completedAt.toMillis?.() || subtask.completedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* TIMELINE DE ACTIVIDADES */}
        {progressData.lastActivity && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text, marginLeft: 8 }]}>
                Última Actividad
              </Text>
            </View>

            <View style={[styles.activityItem, { borderLeftColor: theme.primary }]}>
              <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>
                  {progressData.lastActivity.title}
                </Text>
                <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
                  {progressData.lastActivity.updatedAt
                    ? new Date(
                        progressData.lastActivity.updatedAt?.toMillis?.() ||
                          progressData.lastActivity.updatedAt
                      ).toLocaleString('es-ES')
                    : 'Hace poco'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  completionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857'
  },
  spacer: {
    height: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  assigneeProgressItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  assigneeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9F2241',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  assigneeAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
  },
  assigneeEmail: {
    fontSize: 14,
    fontWeight: '600'
  },
  assigneeSubtext: {
    fontSize: 12
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  assigneeProgressBar: {
    marginTop: 8
  },
  emptyAssignees: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  subtaskItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  subtasksList: {
    marginTop: 16,
    gap: 8,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtaskStatus: {
    marginRight: 4,
  },
  subtaskMainContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtaskMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtaskDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  subtaskTimestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  progressBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  subtaskBullet: {
    marginRight: 12,
    paddingTop: 2
  },
  subtaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  subtaskMeta: {
    fontSize: 12
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderLeftWidth: 3,
    borderRadius: 8,
    marginTop: 12
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginLeft: -22
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  activityTime: {
    fontSize: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
