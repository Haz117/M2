// screens/AreaChiefDashboard.js
// Dashboard para jefes de área - Ver tareas, progreso, equipo

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentSession } from '../services/authFirestore';
import { subscribeToTasks } from '../services/tasks';
import LoadingIndicator from '../components/LoadingIndicator';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import WebSafeBlur from '../components/WebSafeBlur';

const { width } = Dimensions.get('window');

export default function AreaChiefDashboard({ navigation }) {
  const { theme, isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [areaData, setAreaData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pendiente, en_progreso, completed

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadChiefData();
  }, []);

  const loadChiefData = async () => {
    try {
      setLoading(true);
      const sessionResult = await getCurrentSession();
      
      if (!sessionResult.success) {
        setLoading(false);
        return;
      }

      const session = sessionResult.session;
      setCurrentUser(session);

      // Buscar área donde es jefe
      // Nota: Esta es una simplificación. En producción, usar Firestore query
      // por ahora mostrar todas las tareas del usuario
      
      const unsubscribe = subscribeToTasks((allTasks) => {
        // Filtrar tareas donde el usuario es jefe o está asignado
        const userTasks = allTasks.filter(
          (t) =>
            Array.isArray(t.assignedTo)
              ? t.assignedTo.includes(session.email)
              : t.assignedTo === session.email
        );

        setTasks(userTasks);

        // Calcular métricas
        calculateMetrics(userTasks);
        setLoading(false);
        setRefreshing(false);

        // Animar entrada
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error cargando dashboard jefe:', error);
      setLoading(false);
    }
  };

  const calculateMetrics = (taskList) => {
    try {
      if (!taskList || taskList.length === 0) {
        setMetrics({
          fullyCompletedTasks: 0,
          tasksInProgress: 0,
          totalTasks: 0,
          avgProgress: 0,
        });
        return;
      }

      const fullyCompletedTasks = taskList.filter((t) => t.status === 'cerrada').length;
      const tasksInProgress = taskList.filter((t) => t.status === 'en_progreso').length;
      const totalTasks = taskList.length;
      
      // Calcular promedio de progreso de todas las tareas
      const avgProgress = taskList.length > 0
        ? Math.round(
            taskList.reduce((sum, t) => sum + (t.progress || 0), 0) / taskList.length
          )
        : 0;

      setMetrics({
        fullyCompletedTasks,
        tasksInProgress,
        totalTasks,
        avgProgress,
      });
    } catch (error) {
      console.error('Error calculando métricas:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChiefData();
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pendiente':
        return tasks.filter((t) => t.status === 'pendiente');
      case 'en_progreso':
        return tasks.filter((t) => t.status === 'en_progreso');
      case 'completed':
        return tasks.filter((t) => t.status === 'cerrada');
      default:
        return tasks;
    }
  };

  const handleTaskPress = (task) => {
    navigation.navigate('TaskProgress', { taskId: task.id, task });
  };

  const renderTaskCard = ({ item: task }) => {
    // Obtener el área (buscar en ambos campos: area y areas)
    let areaDisplay = 'Sin área';
    if (task.area) {
      areaDisplay = task.area;
    } else if (task.areas && Array.isArray(task.areas) && task.areas.length > 0) {
      areaDisplay = task.areas[0];
    }

    return (
    <TouchableOpacity
      onPress={() => handleTaskPress(task)}
      style={[
        styles.taskCard,
        {
          backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7',
          borderColor: theme.border,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor:
              task.status === 'cerrada'
                ? '#34C759'
                : task.status === 'en_progreso'
                ? '#FF9500'
                : '#9F2241',
          },
        ]}
      />

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.taskMeta}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {areaDisplay}
          </Text>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            • {task.priority || 'normal'}
          </Text>
        </View>

        {/* Assignees */}
        {task.assignedToNames && task.assignedToNames.length > 0 && (
          <View style={styles.assigneesContainer}>
            {task.assignedToNames.slice(0, 3).map((name, idx) => (
              <Avatar key={idx} name={name} size={28} style={styles.assigneeAvatar} />
            ))}
            {task.assignedToNames.length > 3 && (
              <View style={[styles.moreAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.moreText}>+{task.assignedToNames.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.textSecondary,
              textTransform: 'capitalize',
            }}
          >
            {task.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingIndicator />
      </View>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: theme.background }, { opacity: fadeAnim }]}
    >
      {/* Header */}
      <LinearGradient
        colors={[theme.primary, theme.primary + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <WebSafeBlur intensity={90} style={[styles.headerBlur, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Tus tareas y equipo</Text>
          </View>
        </WebSafeBlur>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        style={styles.content}
      >
        {/* Métricas Generales */}
        {metrics && (
          <View style={styles.metricsSection}>
            <View style={[styles.metricCard, { backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.fullyCompletedTasks}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Completadas
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7' }]}>
              <Ionicons name="time" size={24} color="#FF9500" />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.tasksInProgress}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                En Progreso
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7' }]}>
              <Ionicons name="list" size={24} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.totalTasks}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7' }]}>
              <Ionicons name="trending-up" size={24} color="#9F2241" />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {metrics.avgProgress}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Progreso</Text>
            </View>
          </View>
        )}

        {/* Progress Overview */}
        {metrics && metrics.totalTasks > 0 && (
          <View style={[styles.progressCard, { backgroundColor: isDark ? '#2a2a2e' : '#f5f5f7' }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Progreso General</Text>
            <ProgressBar
              progress={metrics.avgProgress}
              size="medium"
              showLabel={true}
              color={metrics.avgProgress === 100 ? '#34C759' : theme.primary}
            />
            <Text style={[styles.progressDetails, { color: theme.textSecondary }]}>
              {metrics.fullyCompletedTasks} de {metrics.totalTasks} tareas completadas
            </Text>
          </View>
        )}

        {/* Filtros */}
        <View style={styles.filterContainer}>
          {['all', 'pendiente', 'en_progreso', 'completed'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterButton,
                filter === f && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
                { borderColor: theme.border },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === f && { color: '#FFFFFF' },
                  { color: filter === f ? '#FFFFFF' : theme.text },
                ]}
              >
                {f === 'all'
                  ? 'Todas'
                  : f === 'completed'
                  ? 'Completadas'
                  : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tareas List */}
        <View style={styles.tasksSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {filter === 'all' ? 'Tus Tareas' : 'Tareas ' + filter.replace('_', ' ')}
          </Text>

          {filteredTasks.length > 0 ? (
            <FlatList
              data={filteredTasks}
              renderItem={renderTaskCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.tasksList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {filter === 'all'
                  ? 'Sin tareas asignadas'
                  : `Sin tareas ${filter.replace('_', ' ')}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
  },
  headerBlur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tasksSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 100,
  },
  statusBar: {
    width: 4,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  assigneesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  assigneeAvatar: {
    marginRight: -8,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});
