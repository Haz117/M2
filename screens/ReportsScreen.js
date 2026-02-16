// screens/ReportsScreen.js
// Pantalla de reportes con gráficos de progreso semanal/mensual
// ✨ Integración: Alertas, Insights, Exportación, Optimizaciones
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Platform,
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { subscribeToTasks } from '../services/tasks';
import { subscribeToSubtasks } from '../services/tasksMultiple';
import { getCurrentSession } from '../services/authFirestore';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import SpringCard from '../components/SpringCard';
import RippleButton from '../components/RippleButton';
import AreaStatsCard from '../components/AreaStatsCard';
import AreaComparisonChart from '../components/AreaComparisonChart';
import AreaRankingCard from '../components/AreaRankingCard';
import AreaFilter from '../components/AreaFilter';
import AlertsPanel from '../components/AlertsPanel';
import InsightsPanel from '../components/InsightsPanel';
import { calculateDetailedAreaMetrics, generateAreaSummary, getAreasNeedingAttention } from '../services/areaMetrics';
import { getAreaAlerts, getAreasForAttention } from '../services/AreaAlerts';
import { 
  calculateMonthlyComparative, 
  identifyBottlenecks, 
  generateOptimizationSuggestions,
  analyzeWorkloadDistribution,
  getCachedAnalytics 
} from '../services/AreaAnalytics';
import { exportAreaReport, exportProductivityReport } from '../services/ReportsExport';
import { MAX_WIDTHS } from '../theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, padding } = useResponsive();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'quarter'
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Stats
  const [weeklyStats, setWeeklyStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    avgCompletionTime: 0
  });

  const [monthlyStats, setMonthlyStats] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    avgCompletionTime: 0
  });

  const [dailyCompletions, setDailyCompletions] = useState([]);
  const [priorityDistribution, setPriorityDistribution] = useState({});
  const [areaMetrics, setAreaMetrics] = useState({});
  const [detailedAreaMetrics, setDetailedAreaMetrics] = useState({});
  const [areaSummary, setAreaSummary] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [areasNeedingAttention, setAreasNeedingAttention] = useState([]);
  const [filteredAreas, setFilteredAreas] = useState([]);
  
  // Subtasks stats
  const [subtasksStats, setSubtasksStats] = useState({
    completed: 0,
    pending: 0,
    completionRate: 0
  });
  
  const [tasksWithProgress, setTasksWithProgress] = useState([]);

  // ✨ NUEVOS ESTADOS: Alertas, Analytics e Insights
  const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [monthlyComparative, setMonthlyComparative] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [workloadDistribution, setWorkloadDistribution] = useState({});
  const [predictions, setPredictions] = useState({});
  const [exporting, setExporting] = useState(false);
  
  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(20)).current;
  const chartsOpacity = useRef(new Animated.Value(0)).current;
  const chartsSlide = useRef(new Animated.Value(20)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const filterSlide = useRef(new Animated.Value(20)).current;
  const emptyStateAnim = useRef(new Animated.Value(0)).current;
  const emptyStateSlide = useRef(new Animated.Value(20)).current;

  // Load current user
  useEffect(() => {
    let mounted = true;
    getCurrentSession().then((result) => {
      if (result.success && mounted) {
        setCurrentUser(result.session);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Load subtasks for progress tracking
  useEffect(() => {
    let mounted = true;
    const unsubscribes = []; // Almacenar todas las funciones de unsub
    const statsMap = new Map(); // Rastrear stats por tarea
    let totalStats = { completed: 0, total: 0 };

    if (tasks.length === 0) {
      setTasksWithProgress([]);
      setSubtasksStats({ completed: 0, pending: 0, completionRate: 0 });
      return;
    }

    // Suscribirse a subtareas de cada tarea con manejo de errores
    tasks.forEach((task) => {
      try {
        const unsubscribe = subscribeToSubtasks(task.id, (subtasks) => {
          if (!mounted) return;

          const completed = subtasks.filter(s => s.status === 'completada').length;
          const total = subtasks.length;
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

          // Actualizar stats de esta tarea
          statsMap.set(task.id, { completed, total });

          // Recalcular totales
          totalStats.completed = Array.from(statsMap.values()).reduce((sum, s) => sum + s.completed, 0);
          totalStats.total = Array.from(statsMap.values()).reduce((sum, s) => sum + s.total, 0);

          if (mounted) {
            // Actualizar array de tareas con progreso
            setTasksWithProgress(prev => {
              const updated = prev.filter(t => t.id !== task.id);
              const newTask = {
                id: task.id,
                title: task.title,
                subtasksCompleted: completed,
                subtasksTotal: total,
                progress: progressPercent,
                status: task.status
              };
              return [...updated, newTask].sort((a, b) => b.progress - a.progress).slice(0, 10);
            });

            // Actualizar estadísticas globales
            setSubtasksStats({
              completed: totalStats.completed,
              pending: totalStats.total - totalStats.completed,
              completionRate: totalStats.total > 0 ? Math.round((totalStats.completed / totalStats.total) * 100) : 0
            });
          }
        });
        unsubscribes.push(unsubscribe);
      } catch (error) {
        console.warn(`Failed to subscribe to subtasks for task ${task.id}:`, error?.message);
      }
    });

    // Limpiar todas las suscripciones al desmontar
    return () => {
      mounted = false;
      unsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') {
          try {
            unsub();
          } catch (error) {
            console.warn('Error unsubscribing:', error);
          }
        }
      });
    };
  }, [tasks]);

  // Subscribe to tasks
  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;

    // Función async para obtener la suscrita
    (async () => {
      try {
        unsubscribe = await subscribeToTasks((updatedTasks) => {
          if (mounted) {
            setTasks(updatedTasks);
            calculateStats(updatedTasks);
            setLoading(false);
          }
        });
      } catch (error) {
        console.warn('Error subscribing to tasks:', error);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from tasks:', error);
        }
      }
    };
  }, []);

  // Animations
  useEffect(() => {
    if (!loading) {
      // Reset all values to 0 first
      headerOpacity.setValue(0);
      headerSlide.setValue(-30);
      filterAnim.setValue(0);
      filterSlide.setValue(20);
      statsOpacity.setValue(0);
      statsSlide.setValue(20);
      emptyStateAnim.setValue(0);
      emptyStateSlide.setValue(20);
      chartsOpacity.setValue(0);
      chartsSlide.setValue(20);
      
      // Then animate them in sequence
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(headerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(filterAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(filterSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(statsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(emptyStateAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(emptyStateSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(chartsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(chartsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [loading]);

  const calculateStats = (allTasks) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Mostrar todas las tareas para admin, filtrar por creador para otros
    const userTasks = currentUser?.role === 'admin' 
      ? allTasks
      : allTasks.filter(t => {
          // Si no hay createdBy, mostrar la tarea de todas formas
          if (!t.createdBy) return true;
          return t.createdBy === currentUser?.email;
        });

    // Weekly stats
    const weeklyTasks = userTasks.filter(t => t.createdAt >= weekAgo);
    const weeklyCompleted = weeklyTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    setWeeklyStats({
      completed: weeklyCompleted.length,
      inProgress: weeklyTasks.filter(t => t.status === 'en_proceso').length,
      pending: weeklyTasks.filter(t => t.status === 'pendiente').length,
      overdue: weeklyTasks.filter(t => t.dueAt < now && t.status !== 'cerrada').length,
      completionRate: weeklyTasks.length > 0 ? Math.round((weeklyCompleted.length / weeklyTasks.length) * 100) : 0,
      avgCompletionTime: calculateAverageCompletionTime(weeklyCompleted)
    });

    // Monthly stats
    const monthlyTasks = userTasks.filter(t => t.createdAt >= monthAgo);
    const monthlyCompleted = monthlyTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    setMonthlyStats({
      completed: monthlyCompleted.length,
      inProgress: monthlyTasks.filter(t => t.status === 'en_proceso').length,
      pending: monthlyTasks.filter(t => t.status === 'pendiente').length,
      overdue: monthlyTasks.filter(t => t.dueAt < now && t.status !== 'cerrada').length,
      completionRate: monthlyTasks.length > 0 ? Math.round((monthlyCompleted.length / monthlyTasks.length) * 100) : 0,
      avgCompletionTime: calculateAverageCompletionTime(monthlyCompleted)
    });

    // Daily completions (últimos 7 días)
    calculateDailyCompletions(weeklyCompleted);

    // Priority distribution
    const byPriority = {
      alta: userTasks.filter(t => t.priority === 'alta').length,
      media: userTasks.filter(t => t.priority === 'media').length,
      baja: userTasks.filter(t => t.priority === 'baja').length,
    };
    setPriorityDistribution(byPriority);

    // Area metrics (if applicable)
    calculateAreaMetrics(userTasks);
  };

  const calculateDailyCompletions = (completedTasks) => {
    const dailyMap = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
    }

    // Count completions by day
    completedTasks.forEach(task => {
      const completedDate = task.completedAt 
        ? new Date(task.completedAt.seconds * 1000)
        : new Date(task.updatedAt?.seconds * 1000 || task.updatedAt);
      
      const dateStr = completedDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      if (dateStr in dailyMap) {
        dailyMap[dateStr]++;
      }
    });

    setDailyCompletions(Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count
    })));
  };

  const calculateAreaMetrics = (allTasks) => {
    // Usar el servicio mejorado para calcular métricas detalladas
    const detailedMetrics = calculateDetailedAreaMetrics(allTasks, []);
    setDetailedAreaMetrics(detailedMetrics);

    // Convertir a formato simple para compatibilidad
    const byArea = {};
    Object.entries(detailedMetrics).forEach(([area, metrics]) => {
      byArea[area] = { 
        completed: metrics.completed, 
        total: metrics.total,
        overdue: metrics.overdue,
        userCount: metrics.userCount,
        avgCompletionTime: metrics.avgCompletionTime,
      };
    });
    setAreaMetrics(byArea);

    // Generar resumen
    const summary = generateAreaSummary(detailedMetrics, allTasks);
    setAreaSummary(summary);

    // Identificar áreas que necesitan atención
    const needingAttention = getAreasNeedingAttention(detailedMetrics, 60);
    setAreasNeedingAttention(needingAttention);
  };

  // Función auxiliar para filtrar métricas por áreas seleccionadas
  const getFilteredMetrics = () => {
    if (filteredAreas.length === 0) {
      return { detailedAreaMetrics, areaMetrics, areasNeedingAttention };
    }

    const filtered = {};
    const filteredDetailed = {};
    const filteredAlerts = [];

    filteredAreas.forEach((area) => {
      if (detailedAreaMetrics[area]) {
        filteredDetailed[area] = detailedAreaMetrics[area];
      }
      if (areaMetrics[area]) {
        filtered[area] = areaMetrics[area];
      }
    });

    areasNeedingAttention.forEach((item) => {
      if (filteredAreas.includes(item.name)) {
        filteredAlerts.push(item);
      }
    });

    return {
      detailedAreaMetrics: filteredDetailed,
      areaMetrics: filtered,
      areasNeedingAttention: filteredAlerts,
    };
  };

  const { detailedAreaMetrics: displayDetailedMetrics, areaMetrics: displayAreaMetrics, areasNeedingAttention: displayAlerts } = getFilteredMetrics();

  // Debug: Mostrar datos en consola
  useEffect(() => {
    console.log('📊 Area Metrics:', {
      detailedAreaMetrics,
      areaMetrics,
      areasNeedingAttention,
      tasks: tasks.length,
      filteredAreas,
    });
  }, [detailedAreaMetrics, areaMetrics, areasNeedingAttention, tasks]);

  // ✨ Calcular alertas, insights y análisis avanzados (optimizado con useMemo)
  useEffect(() => {
    if (tasks.length === 0 || !areaMetrics || Object.keys(areaMetrics).length === 0) {
      setAlerts([]);
      setSuggestions([]);
      return;
    }

    try {
      // Usar caché para no recalcular constantemente
      const newAlerts = getCachedAnalytics('alerts', () => 
        getAreaAlerts(areaMetrics)
      );
      setAlerts(newAlerts);

      // Calcular comparativas históricas (solo si hay tareas completadas)
      const comparatives = calculateMonthlyComparative(tasks);
      setMonthlyComparative(comparatives);

      // Identificar cuellos de botella
      const bottlenecksList = identifyBottlenecks(areaMetrics, tasks);
      setBottlenecks(bottlenecksList);

      // Analizar distribución de carga
      const distribution = analyzeWorkloadDistribution(areaMetrics, tasks);
      setWorkloadDistribution(distribution);

      // Generar sugerencias
      const optimizations = generateOptimizationSuggestions(areaMetrics, tasks, newAlerts);
      setSuggestions(optimizations);
    } catch (error) {
      console.error('Error calculando análisis avanzados:', error);
    }
  }, [areaMetrics, tasks]);

  const calculateAverageCompletionTime = (completedTasks) => {
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const created = task.createdAt.seconds * 1000 || new Date(task.createdAt).getTime();
      const completed = task.completedAt?.seconds * 1000 || new Date(task.completedAt).getTime();
      return sum + (completed - created);
    }, 0);

    const avgMs = totalTime / completedTasks.length;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    return avgDays;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refetch data
    setTimeout(() => setRefreshing(false), 1500);
  };

  // ✨ Función para exportar reportes
  const handleExportReport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportAreaReport(areaMetrics, tasks, period);
      if (result.success) {
        Alert.alert('✅ Éxito', `Reporte guardado: ${result.filename}`);
      } else {
        Alert.alert('❌ Error', result.error);
      }
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo exportar el reporte');
    } finally {
      setExporting(false);
    }
  }, [areaMetrics, tasks, period]);

  const currentStats = period === 'week' ? weeklyStats : monthlyStats;

  const chartData = {
    labels: dailyCompletions.map(d => d.date),
    datasets: [{
      data: dailyCompletions.map(d => d.count),
      strokeWidth: 2,
      color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
    }],
  };

  const priorityChartData = [
    { name: 'Alta', population: priorityDistribution.alta || 0, color: '#DC2626', legendFontColor: theme.text },
    { name: 'Media', population: priorityDistribution.media || 0, color: '#F59E0B', legendFontColor: theme.text },
    { name: 'Baja', population: priorityDistribution.baja || 0, color: '#10B981', legendFontColor: theme.text },
  ].filter(d => d.population > 0);

  const isDesktopLarge = width >= 1440;
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding), [theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LoadingIndicator type="spinner" color={theme.primary} size={14} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        {/* Header */}
        <Animated.View style={[styles.headerGradient, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
          <LinearGradient
            colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradientInner}
          >
            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ padding: 8 }}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.greetingContainer}>
                  <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
                  <Text style={styles.greeting}>Reportes y Análisis</Text>
                </View>
                <Text style={styles.heading}>Evolución de Progreso</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'quarter'].map((p) => (
              <RippleButton
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.periodButton,
                  period === p && styles.periodButtonActive
                ]}
                rippleColor={period === p ? 'rgba(159,34,65,0.3)' : 'rgba(0,0,0,0.1)'}
              >
                <Text style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive
                ]}>
                  {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Trimestre'}
                </Text>
              </RippleButton>
            ))}
          </View>

          {/* Area Filter */}
          <Animated.View style={{ 
            marginBottom: 20, 
            opacity: filterAnim,
            transform: [{ translateY: filterSlide }]
          }}>
            <AreaFilter
              areas={Object.keys(areaMetrics).length > 0 ? Object.keys(areaMetrics) : ['Sin datos']}
              selectedAreas={filteredAreas}
              onSelectionChange={setFilteredAreas}
              maxVisible={4}
            />
          </Animated.View>

          {/* ✨ ALERTAS Y SUGERENCIAS */}
          {alerts.length > 0 || suggestions.length > 0 ? (
            <Animated.View style={{ 
              opacity: filterAnim,
              transform: [{ translateY: filterSlide }]
            }}>
              <AlertsPanel
                alerts={alerts}
                suggestions={suggestions}
                onAlertPress={() => {}}
                onDismiss={() => {}}
              />
            </Animated.View>
          ) : null}

          {/* Debug: Data Status - Improved Design */}
          {Object.keys(areaMetrics).length === 0 && (
            <Animated.View style={{ 
              opacity: emptyStateAnim,
              transform: [{ translateY: emptyStateSlide }]
            }}>
              <SpringCard style={{ 
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                borderLeftWidth: 0,
                overflow: 'hidden',
                paddingVertical: 24,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  {/* Icon */}
                  <View style={[styles.emptyStateIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="bar-chart-outline" size={32} color={theme.primary} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                      Sin Datos de Áreas
                    </Text>
                    <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary, marginBottom: 12 }]}>
                      Las áreas aparecerán aquí cuando crees tareas
                    </Text>
                    
                    {/* Stats Row */}
                    <View style={styles.emptyStatsRow}>
                      <View style={styles.emptyStat}>
                        <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Tareas</Text>
                        <Text style={[styles.emptyStatValue, { color: theme.text }]}>{tasks.length}</Text>
                      </View>
                      <View style={styles.emptyStatDivider} />
                      <View style={styles.emptyStat}>
                        <Text style={[styles.emptyStatLabel, { color: theme.textSecondary }]}>Áreas</Text>
                        <Text style={[styles.emptyStatValue, { color: theme.text }]}>0</Text>
                      </View>
                    </View>

                    {/* Help Text */}
                    <View style={[styles.emptyHelpBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                      <Ionicons name="information-circle" size={16} color={theme.primary} />
                      <Text style={[styles.emptyHelpText, { color: theme.primary }]}>
                        Asigna una área a tus tareas para ver estadísticas
                      </Text>
                    </View>
                  </View>
                </View>
              </SpringCard>
            </Animated.View>
          )}

          {/* Key Stats */}
          <Animated.View style={{ 
            opacity: statsOpacity,
            transform: [{ translateY: statsSlide }]
          }}>
            <View style={styles.statsGrid}>
              <SpringCard style={styles.stat}>
                <View style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    {currentStats.completed}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completadas</Text>
                </View>
              </SpringCard>

              <SpringCard style={styles.stat}>
                <View style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="play-circle" size={24} color="#3B82F6" />
                  </View>
                  <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                    {currentStats.inProgress}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Progreso</Text>
                </View>
              </SpringCard>

              <SpringCard style={styles.stat}>
                <View style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="time" size={24} color="#F59E0B" />
                  </View>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                    {currentStats.completionRate}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tasa Finalización</Text>
                </View>
              </SpringCard>

              <SpringCard style={styles.stat}>
                <View style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(220, 38, 38, 0.15)' }]}>
                    <Ionicons name="alert-circle" size={24} color="#DC2626" />
                  </View>
                  <Text style={[styles.statValue, { color: '#DC2626' }]}>
                    {currentStats.overdue}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Vencidas</Text>
                </View>
              </SpringCard>
            </View>
          </Animated.View>

          {/* ✨ INSIGHTS Y PREDICCIONES */}
          {Object.keys(areaMetrics).length > 0 && (monthlyComparative || bottlenecks.length > 0) && (
            <Animated.View style={{ 
              opacity: chartsOpacity,
              transform: [{ translateY: chartsSlide }]
            }}>
              <InsightsPanel
                monthlyComparative={monthlyComparative}
                bottlenecks={bottlenecks}
                predictions={predictions}
                workloadDistribution={workloadDistribution}
              />
            </Animated.View>
          )}

          {/* Botón de exportación */}
          {currentUser?.role === 'admin' && Object.keys(areaMetrics).length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: theme.primary }]}
              onPress={handleExportReport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" size={18} />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>Exportar Reporte</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Subtasks Statistics (si hay subtareas) */}
          {subtasksStats.completed > 0 || subtasksStats.pending > 0 ? (
            <Animated.View style={{ 
              opacity: statsOpacity,
              transform: [{ translateY: statsSlide }]
            }}>
              <View style={styles.subtasksStatsSection}>
                <SpringCard style={styles.subtaskCard}>
                  <View style={styles.subtaskHeader}>
                    <Ionicons name="checkmark-done-all" size={24} color="#9F2241" style={{ marginRight: 8 }} />
                    <Text style={[styles.subtaskTitle, { color: theme.text }]}>Progreso de Subtareas</Text>
                  </View>
                  
                  <View style={styles.subtaskStatsGrid}>
                    <View style={styles.subtaskStat}>
                      <Text style={[styles.subtaskStatValue, { color: '#10B981' }]}>
                        {subtasksStats.completed}
                      </Text>
                      <Text style={[styles.subtaskStatLabel, { color: theme.textSecondary }]}>
                        Completadas
                      </Text>
                    </View>
                    
                    <View style={styles.subtaskStat}>
                      <Text style={[styles.subtaskStatValue, { color: '#F59E0B' }]}>
                        {subtasksStats.pending}
                      </Text>
                      <Text style={[styles.subtaskStatLabel, { color: theme.textSecondary }]}>
                        Pendientes
                      </Text>
                    </View>
                    
                    <View style={styles.subtaskStat}>
                      <Text style={[styles.subtaskStatValue, { color: '#3B82F6' }]}>
                        {subtasksStats.completionRate}%
                      </Text>
                      <Text style={[styles.subtaskStatLabel, { color: theme.textSecondary }]}>
                        Completado
                      </Text>
                    </View>
                  </View>

                  {/* Progress Ring */}
                  <View style={styles.progressRingContainer}>
                    <View style={[styles.progressRing, { 
                      width: 120, 
                      height: 120
                    }]}>
                      <View style={[styles.progressRingFill, { 
                        borderColor: '#9F2241',
                        borderWidth: 8,
                        borderRadius: 60,
                        width: 120,
                        height: 120,
                        opacity: subtasksStats.completionRate / 100
                      }]}>
                        <View style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
                          <Text style={{fontSize: 28, fontWeight: '800', color: '#9F2241'}}>
                            {subtasksStats.completionRate}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </SpringCard>
              </View>
            </Animated.View>
          ) : null}

          {/* Task Progress with Subtasks (Top 10) */}
          {tasksWithProgress.length > 0 && (
            <Animated.View style={{ 
              opacity: chartsOpacity,
              transform: [{ translateY: chartsSlide }]
            }}>
              <SpringCard style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>
                  📊 Progreso de Tareas (top 10 con Subtareas)
                </Text>
                <View style={styles.tasksProgressContainer}>
                  {tasksWithProgress
                    .filter(t => t.subtasksTotal > 0) // Solo mostrar tareas con subtareas
                    .map((taskProgress, index) => (
                      <View key={taskProgress.id} style={styles.taskProgressItem}>
                        <View style={styles.taskProgressHeader}>
                          <Text style={[styles.taskProgressTitle, { color: theme.text }]} numberOfLines={1}>
                            {index + 1}. {taskProgress.title}
                          </Text>
                          <Text style={[styles.taskProgressPercent, { color: '#9F2241' }]}>
                            {taskProgress.progress}%
                          </Text>
                        </View>
                        <View style={styles.taskProgressBar}>
                          <View 
                            style={[
                              styles.taskProgressBarFill,
                              { 
                                width: `${taskProgress.progress}%`,
                                backgroundColor: taskProgress.progress === 100 ? '#10B981' : 
                                                taskProgress.progress >= 75 ? '#F59E0B' :
                                                taskProgress.progress >= 50 ? '#3B82F6' : '#DC2626'
                              }
                            ]}
                          />
                        </View>
                        <Text style={[styles.taskProgressDetail, { color: theme.textSecondary }]}>
                          {taskProgress.subtasksCompleted}/{taskProgress.subtasksTotal} subtareas
                        </Text>
                      </View>
                    ))}
                </View>
              </SpringCard>
            </Animated.View>
          )}

          {/* Charts */}
          <Animated.View style={{ 
            opacity: chartsOpacity,
            transform: [{ translateY: chartsSlide }]
          }}>
            {/* Daily Completions Chart */}
            {dailyCompletions.length > 0 && (
              <SpringCard style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Tareas Completadas por Día</Text>
                <LineChart
                  data={chartData}
                  width={width - (padding * 2 + 40)}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.card,
                    backgroundGradientFrom: theme.card,
                    backgroundGradientTo: theme.card,
                    color: (opacity = 1) => `rgba(159, 34, 65, ${opacity})`,
                    strokeWidth: 2,
                    style: { borderRadius: 16 },
                  }}
                  style={styles.chart}
                />
              </SpringCard>
            )}

            {/* Priority Distribution */}
            {priorityChartData.length > 0 && (
              <SpringCard style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Distribución por Prioridad</Text>
                <PieChart
                  data={priorityChartData}
                  width={width - (padding * 2 + 40)}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: { borderRadius: 16 },
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                />
              </SpringCard>
            )}

            {/* Alerts for Areas Needing Attention */}
            {displayAlerts.length > 0 && (
              <View style={styles.alertSection}>
                <View style={[styles.alertHeader, { backgroundColor: '#DC2626' + '20', borderColor: '#DC2626' }]}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertTitle, { color: '#DC2626' }]}>
                      {displayAlerts.length} Área{displayAlerts.length > 1 ? 's' : ''} Requiere Atención
                    </Text>
                    <Text style={[styles.alertSubtitle, { color: '#DC2626' }]}>
                      Menos del 60% de tareas completadas
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Area Metrics - Detailed Cards */}
            {Object.keys(displayDetailedMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="stats-chart" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Estadísticas por Área</Text>
                </View>
                <View style={styles.areaCardsContainer}>
                  {Object.entries(displayDetailedMetrics)
                    .sort((a, b) => b[1].completionRate - a[1].completionRate)
                    .map(([area, metrics], index) => (
                      <AreaStatsCard
                        key={area}
                        areaName={area}
                        completed={metrics.completed}
                        total={metrics.total}
                        assignedUsers={metrics.userCount || 0}
                        avgCompletionTime={metrics.avgCompletionTime || 0}
                        overdueTasks={metrics.overdue || 0}
                        trend={metrics.trendDirection || 'stable'}
                        trendValue={metrics.trend || 0}
                        index={index}
                        onPress={() => setSelectedArea(area)}
                      />
                    ))}
                </View>
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: chartsOpacity,
                transform: [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="bar-chart-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Estadísticas Detalladas
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Aquí verás métricas de cada área
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Area Comparison Chart */}
            {Object.keys(displayAreaMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="arrow-forward-outline" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Comparación de Rendimiento</Text>
                </View>
                <AreaComparisonChart
                  areaMetrics={displayAreaMetrics}
                  padding={padding}
                  isDesktop={isDesktop}
                  onAreaSelect={(area) => setSelectedArea(area)}
                />
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: chartsOpacity,
                transform: [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="trending-up-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Comparación de Rendimiento
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Visualiza el desempeño entre áreas
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Area Ranking */}
            {Object.keys(displayDetailedMetrics).length > 0 ? (
              <SpringCard style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="podium-outline" size={20} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Ranking de Áreas</Text>
                </View>
                <AreaRankingCard
                  areaMetrics={displayDetailedMetrics}
                  taskCountByArea={displayAreaMetrics}
                  overdueByArea={Object.entries(displayDetailedMetrics).reduce((acc, [area, metrics]) => {
                    acc[area] = metrics.overdue || 0;
                    return acc;
                  }, {})}
                  onAreaPress={(area) => setSelectedArea(area)}
                />
              </SpringCard>
            ) : (
              <Animated.View style={{ 
                opacity: chartsOpacity,
                transform: [{ translateY: chartsSlide }]
              }}>
                <SpringCard style={styles.emptyCardContainer}>
                  <View style={styles.emptyCardContent}>
                    <View style={[styles.emptyCardIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="medal-outline" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>
                      Ranking de Áreas
                    </Text>
                    <Text style={[styles.emptyCardSubtitle, { color: theme.textSecondary }]}>
                      Posiciones según desempeño
                    </Text>
                  </View>
                </SpringCard>
              </Animated.View>
            )}

            {/* Selected Area Details */}
            {selectedArea && displayAreaMetrics[selectedArea] && (
              <SpringCard style={[styles.chartCard, { borderWidth: 2, borderColor: theme.primary }]}>
                <View style={styles.selectedAreaHeader}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>{selectedArea}</Text>
                  <TouchableOpacity onPress={() => setSelectedArea(null)}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.selectedAreaStats}>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Completadas</Text>
                    <Text style={[styles.statBlockValue, { color: '#10B981' }]}>
                      {displayAreaMetrics[selectedArea].completed}
                    </Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Total</Text>
                    <Text style={[styles.statBlockValue, { color: theme.text }]}>
                      {displayAreaMetrics[selectedArea].total}
                    </Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Atrasadas</Text>
                    <Text style={[styles.statBlockValue, { color: '#DC2626' }]}>
                      {displayAreaMetrics[selectedArea].overdue || 0}
                    </Text>
                  </View>
                  {displayDetailedMetrics[selectedArea]?.userCount > 0 && (
                    <View style={styles.statBlock}>
                      <Text style={[styles.statBlockLabel, { color: theme.textSecondary }]}>Usuarios</Text>
                      <Text style={[styles.statBlockValue, { color: theme.text }]}>
                        {displayDetailedMetrics[selectedArea].userCount}
                      </Text>
                    </View>
                  )}
                </View>
              </SpringCard>
            )}

            {/* Area Metrics */}
            {Object.keys(displayAreaMetrics).length > 0 && (
              <SpringCard style={styles.chartCard}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Métrica Rápida por Área</Text>
                <View style={styles.areaMetricsGrid}>
                  {Object.entries(displayAreaMetrics).map(([area, metrics]) => (
                    <View key={area} style={styles.areaMetricItem}>
                      <Text style={[styles.areaName, { color: theme.text }]}>{area}</Text>
                      <View style={styles.areaProgressBar}>
                        <View 
                          style={[
                            styles.areaProgressFill,
                            { 
                              width: `${metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0}%`,
                              backgroundColor: metrics.total > 0 && (metrics.completed / metrics.total) > 0.75 ? '#10B981' : (metrics.completed / metrics.total) > 0.5 ? '#F59E0B' : '#DC2626'
                            }
                          ]}
                        />
                      </View>
                      <View style={styles.areaStats}>
                        <Text style={[styles.areaCount, { color: theme.textSecondary }]}>
                          {metrics.completed}/{metrics.total}
                        </Text>
                        <Text style={[styles.areaPercent, { color: theme.textSecondary }]}>
                          {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </SpringCard>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, isDesktopLarge, width, padding) => {
  const responsiveHeaderPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const responsiveContentPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    contentWrapper: {
      flex: 1,
      width: width,
      maxWidth: width,
      alignSelf: 'center',
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    headerGradient: {
      borderBottomLeftRadius: isDesktop ? 32 : 24,
      borderBottomRightRadius: isDesktop ? 32 : 24,
      overflow: 'hidden',
    },
    headerGradientInner: {
      paddingHorizontal: responsiveHeaderPadding,
      paddingVertical: isTablet ? 28 : 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    greetingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    greeting: {
      fontSize: isDesktop ? 16 : 14,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
    },
    heading: {
      fontSize: isDesktop ? 40 : 36,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -1.5,
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: responsiveContentPadding,
      paddingTop: 20,
      paddingBottom: 80,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 32,
      justifyContent: 'center',
    },
    periodButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isDesktop ? 16 : 12,
      marginBottom: 32,
      justifyContent: 'space-between',
    },
    stat: {
      width: isDesktop ? '23%' : '48%',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    statContent: {
      alignItems: 'center',
      width: '100%',
    },
    statIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    chartCard: {
      backgroundColor: theme.card,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    chart: {
      borderRadius: 16,
      marginVertical: 0,
    },
    areaMetricsGrid: {
      gap: 16,
    },
    areaMetricItem: {
      gap: 8,
    },
    areaName: {
      fontSize: 14,
      fontWeight: '700',
    },
    areaProgressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    areaProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    areaStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    areaCount: {
      fontSize: 12,
      fontWeight: '600',
    },
    areaPercent: {
      fontSize: 12,
      fontWeight: '700',
    },
    // Subtasks Statistics Styles
    subtasksStatsSection: {
      marginVertical: 16,
      paddingHorizontal: responsiveContentPadding,
    },
    subtaskCard: {
      borderRadius: 16,
      padding: 20,
    },
    subtaskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    subtaskTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    subtaskStatsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    subtaskStat: {
      alignItems: 'center',
      flex: 1,
    },
    subtaskStatValue: {
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 4,
    },
    subtaskStatLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressRingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    progressRing: {
      borderRadius: 60,
      overflow: 'hidden',
    },
    progressRingFill: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Task Progress Styles
    tasksProgressContainer: {
      marginTop: 12,
      gap: 12,
    },
    // Empty State Styles
    emptyStateIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyStateSubtitle: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 16,
    },
    emptyStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    emptyStatLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 2,
    },
    emptyStatValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    emptyStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    emptyHelpBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    emptyHelpText: {
      fontSize: 11,
      fontWeight: '500',
      flex: 1,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    emptyCardContainer: {
      minHeight: 240,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCardContent: {
      alignItems: 'center',
      gap: 12,
    },
    emptyCardIcon: {
      width: 72,
      height: 72,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyCardSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    taskProgressContainer: {
      marginTop: 12,
      gap: 12,
    },
    taskProgressItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(159, 34, 65, 0.1)' : 'rgba(159, 34, 65, 0.05)',
    },
    taskProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    taskProgressTitle: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
      marginRight: 8,
    },
    taskProgressPercent: {
      fontSize: 12,
      fontWeight: '700',
    },
    taskProgressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    taskProgressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    taskProgressDetail: {
      fontSize: 11,
      fontWeight: '500',
    },
    // New Area Metrics Styles
    areaCardsContainer: {
      gap: 12,
      marginTop: 12,
    },
    alertSection: {
      marginBottom: 16,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    alertSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      opacity: 0.8,
    },
    selectedAreaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    selectedAreaStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statBlock: {
      flex: 1,
      minWidth: '45%',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
      alignItems: 'center',
    },
    statBlockLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 4,
    },
    statBlockValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    // ✨ Estilos para botón de exportación
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 8,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    exportButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
  });
};
