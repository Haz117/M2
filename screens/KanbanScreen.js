// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Implementa Drag & Drop para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada - Compatible con web
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl, Animated, Dimensions, Platform, Modal, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGestureHandlerRootView } from '../utils/platformComponents';
// Temporarily disabled Animated imports that may cause issues
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   runOnJS,
// } from 'react-native-reanimated';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import ShimmerEffect from '../components/ShimmerEffect';
import SpringCard from '../components/SpringCard';
import BottomSheet from '../components/BottomSheet';
import OverdueAlert from '../components/OverdueAlert';
import FadeInView from '../components/FadeInView';

const GestureHandlerRootView = getGestureHandlerRootView();
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import RippleButton from '../components/RippleButton';
import { updateTask } from '../services/tasks';
import { useTasks } from '../contexts/TasksContext';
import { getCurrentSession } from '../services/authFirestore';
import { hapticMedium, hapticHeavy, hapticLight, hapticSuccess, hapticWarning } from '../utils/haptics';
import { useNotification } from '../contexts/NotificationContext';
import TaskStatusButtons from '../components/TaskStatusButtons';
import { useTheme } from '../contexts/ThemeContext';
import { canChangeTaskStatus } from '../services/permissions';
import { toMs, isOverdue } from '../utils/dateUtils';
import QuickTip, { TIPS } from '../components/QuickTip';
import SyncIndicator from '../components/SyncIndicator';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#FF9800', icon: 'hourglass-outline' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196F3', icon: 'play-circle-outline' },
  { key: 'en_revision', label: 'En revisión', color: '#9C27B0', icon: 'eye-outline' },
  { key: 'cerrada', label: 'Cerrada', color: '#4CAF50', icon: 'checkmark-circle-outline' }
];

export default function KanbanScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  // 🌍 USAR EL CONTEXT GLOBAL DE TAREAS
  const { tasks, setTasks, isLoading } = useTasks();
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false, dueToday: false, dueThisWeek: false });
  const [refreshing, setRefreshing] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const { showSuccess, showError, showWarning } = useNotification();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [compactView, setCompactView] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date' o 'priority'
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, task: null, position: { x: 0, y: 0 } });
  
  // Animaciones
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const columnsSlide = useRef(new Animated.Value(100)).current;
  const filterHeightAnim = useRef(new Animated.Value(1)).current;
  
  // Animaciones para cada columna (entrada escalonada)
  const columnAnimations = useRef({
    pendiente: new Animated.Value(0),
    en_proceso: new Animated.Value(0),
    en_revision: new Animated.Value(0),
    cerrada: new Animated.Value(0)
  }).current;
  
  // Animación para drag feedback
  const dragScaleAnim = useRef(new Animated.Value(1)).current;
  const dragOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // Animación del FAB
  const fabScale = useRef(new Animated.Value(0)).current;

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Calcular ancho de columnas según tamaño de pantalla
  const getColumnWidth = () => {
    const screenWidth = dimensions.width;
    const isWeb = Platform.OS === 'web';
    const padding = isWeb ? 16 : 8;
    const gap = isWeb ? 12 : 12;
    
    if (isWeb && screenWidth > 1400) {
      // Desktop muy grande: 4 columnas visibles
      return (screenWidth - padding * 2 - gap * 3) / 4;
    } else if (isWeb && screenWidth > 1100) {
      // Desktop grande: 4 columnas
      return (screenWidth - padding * 2 - gap * 3) / 4;
    } else if (isWeb && screenWidth > 850) {
      // Desktop mediano: 3 columnas visibles
      return (screenWidth - padding * 2 - gap * 2) / 3;
    } else if (isWeb && screenWidth > 600) {
      // Tablet web: 2 columnas visibles
      return (screenWidth - padding * 2 - gap) / 2;
    } else if (isWeb && screenWidth > 400) {
      // Móvil web: scroll horizontal - columna de 280px
      return 280;
    } else if (isWeb) {
      // Móvil web pequeño: scroll horizontal - columna de 260px
      return 260;
    } else if (screenWidth > 768) {
      // Tablet nativa: 2 columnas
      return (screenWidth - padding * 2 - gap) / 2;
    } else if (screenWidth > 480) {
      // Móvil grande nativo: scroll horizontal
      return screenWidth * 0.85;
    } else {
      // Móvil pequeño nativo: scroll horizontal compacto
      return screenWidth * 0.88;
    }
  };

  const columnWidth = useMemo(() => getColumnWidth(), [dimensions.width]);

  // Obtener rol del usuario
  useEffect(() => {
    getCurrentSession().then(result => {
      if (result.success) {
        setCurrentUserRole(result.session.role);
        setCurrentUser(result.session);
      }
    });
  }, []);

  // Animación de entrada
  useEffect(() => {
    const startAnimations = () => {
      Animated.parallel([
        Animated.spring(headerSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(columnsSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const delays = [0, 60, 120, 180];
      STATUSES.forEach((status, index) => {
        Animated.timing(columnAnimations[status.key], {
          toValue: 1,
          duration: 280,
          delay: delays[index],
          useNativeDriver: true,
        }).start();
      });

      Animated.spring(fabScale, {
        toValue: 1,
        delay: 100,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    if (Platform.OS !== 'web') {
      const interaction = InteractionManager.runAfterInteractions(startAnimations);
      return () => interaction.cancel();
    } else {
      startAnimations();
    }
  }, []);

  // Suscribirse a cambios en tiempo real con debounce
  useEffect(() => {
    // Ya no necesitamos suscribirse, el TasksContext se encarga
  }, []);

  // Animación para colapso/expansión de filtros
  useEffect(() => {
    Animated.timing(filterHeightAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showFilters, filterHeightAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticMedium();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const changeStatus = useCallback(async (taskId, newStatus) => {
    try {
      // Verificar permisos (ahora valida el newStatus específico para directores)
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const statusPermission = canChangeTaskStatus(currentUser, task, newStatus);
        if (!statusPermission.canChange) {
          showWarning(statusPermission.reason || 'No tienes permisos para este cambio');
          hapticWarning();
          return;
        }
      }
      
      hapticMedium();
      await updateTask(taskId, { status: newStatus });
      showSuccess('✨ Estado actualizado correctamente');
      
      // Haptic de éxito
      hapticSuccess();
    } catch (error) {
      showError('Error al actualizar estado');
      hapticWarning();
    }
  }, [currentUser, tasks]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    await changeStatus(taskId, newStatus);
  }, [changeStatus]);

  const openDetail = useCallback((task) => {
    // Todos pueden ver detalles, pero con permisos limitados según rol
    // El TaskDetailScreen se encarga de mostrar las opciones correctas
    navigation.navigate('TaskDetail', { task });
  }, [navigation]);

  // Función para detectar en qué columna se soltó la tarjeta
  const getColumnAtPosition = (x) => {
    // Usar columnWidth dinámico en lugar de valores hardcodeados
    const gap = 16;
    const actualColumnWidth = columnWidth + gap;
    const columnIndex = Math.floor((x + gap) / actualColumnWidth);
    if (columnIndex >= 0 && columnIndex < STATUSES.length) {
      return STATUSES[columnIndex].key;
    }
    return null;
  };

  const handleDragEnd = (task, event) => {
    const { absoluteX } = event.nativeEvent;
    const targetStatus = getColumnAtPosition(absoluteX);
    
    if (targetStatus && targetStatus !== task.status) {
      // 🎨 ANIMACIÓN: Scale down y fade out
      Animated.parallel([
        Animated.timing(dragScaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dragOpacityAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Cambiar estado
        changeStatus(task.id, targetStatus);
        
        // 🎨 ANIMACIÓN: Spring bounce de vuelta
        Animated.parallel([
          Animated.spring(dragScaleAnim, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(dragOpacityAnim, {
            toValue: 1,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });
      
      // Haptic feedback mejorado
      hapticHeavy(); // Feedback más fuerte al arrastrar
    }
    
    // Reset dragging state
    setDraggingTask(null);
    
    // Reset animaciones si no hubo cambio de estado
    if (!targetStatus || targetStatus === task.status) {
      Animated.parallel([
        Animated.spring(dragScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(dragOpacityAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Componente de tarjeta arrastrable con mejoras visuales
  const DraggableCard = ({ item, status }) => {
    const isOverdue = isTaskOverdue(item);
    const priorityColors = { alta: '#EF4444', media: '#F59E0B', baja: '#10B981' };
    const priorityColor = priorityColors[item.priority] || '#94A3B8';
    
    // Calcular días en el estado actual
    const daysInStatus = item.statusChangedAt ? 
      Math.floor((Date.now() - item.statusChangedAt) / (1000 * 60 * 60 * 24)) : 0;
    const statusAgeColor = daysInStatus > 10 ? '#DC2626' : daysInStatus > 5 ? '#F59E0B' : theme.textSecondary;
    
    // Borde según prioridad
    const borderColor = item.priority === 'alta' ? '#EF4444' : 
                        item.priority === 'media' ? '#F59E0B' : theme.border;
    
    return (
      <SpringCard
        onPress={() => {
          hapticLight();
          openDetail(item);
        }}
        onLongPress={() => {
          hapticMedium();
          setContextMenu({ visible: true, task: item, position: { x: 0, y: 0 } });
        }}
        style={[
          styles.card,
          { 
            backgroundColor: theme.cardBackground, 
            borderColor: borderColor,
            borderWidth: item.priority === 'alta' ? 2 : 1,
            borderLeftWidth: 4,
            borderLeftColor: priorityColor
          },
          draggingTask?.id === item.id && styles.cardDragging,
          compactView && { paddingVertical: 8, paddingHorizontal: 12 }
        ]}
      >
        {/* Header con badges - Solo en vista expandida */}
        {!compactView && (
          <View style={styles.cardTopRow}>
            <View style={[
              styles.priorityChip,
              item.priority === 'alta' && { backgroundColor: '#DC2626' },
              item.priority === 'media' && { backgroundColor: '#F59E0B' },
              item.priority === 'baja' && { backgroundColor: '#10B981' }
            ]}>
              <Ionicons 
                name={item.priority === 'alta' ? 'flash' : item.priority === 'media' ? 'warning' : 'checkmark-circle'} 
                size={10} 
                color="#FFFFFF" 
              />
              <Text style={styles.priorityChipText}>
                {item.priority === 'alta' ? 'URGENTE' : item.priority === 'media' ? 'MEDIA' : 'BAJA'}
              </Text>
              {/* Pulsación para prioridad alta */}
              {item.priority === 'alta' && <PulsingDot size={4} color="#FFFFFF" />}
            </View>
            
            {isOverdue && (
              <View style={styles.overdueChip}>
                <Ionicons name="time" size={10} color="#FFFFFF" />
                <Text style={styles.overdueChipText}>VENCIDA</Text>
              </View>
            )}
          </View>
        )}

        {/* Título con indicador de prioridad en vista compacta */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {compactView && (
            <>
              <View style={[styles.compactPriorityDot, { backgroundColor: priorityColor }]} />
              {item.priority === 'alta' && <PulsingDot size={3} color={priorityColor} />}
            </>
          )}
          <Text 
            style={[styles.cardTitle, { color: theme.text, flex: 1 }]} 
            numberOfLines={compactView ? 1 : 2}
          >
            {item.title}
          </Text>
          {compactView && isOverdue && (
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
          )}
        </View>
        
        {/* Meta información - Solo en vista expandida */}
        {!compactView && (
          <>
            <View style={styles.cardInfoGrid}>
              <View style={[styles.cardInfoItem, { backgroundColor: theme.surface }]}>
                <Ionicons name="person" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.assignedTo || 'Sin asignar'}
                </Text>
              </View>
              
              <View style={[styles.cardInfoItem, { backgroundColor: theme.surface }]}>
                <Ionicons name="calendar-outline" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]}>
                  {new Date(toMs(item.dueAt)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
            
            {/* Etiquetas */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.cardTagsContainer}>
                {item.tags.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={[styles.cardTag, { backgroundColor: isDark ? 'rgba(159,34,65,0.2)' : 'rgba(159,34,65,0.1)' }]}>
                    <Text style={[styles.cardTagText, { color: theme.primary }]}>#{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={[styles.cardTagMore, { color: theme.textSecondary }]}>+{item.tags.length - 3}</Text>
                )}
              </View>
            )}
            
            {/* Indicador de días en estado actual */}
            {daysInStatus > 0 && (
              <View style={[styles.statusAgeIndicator, { backgroundColor: theme.surface }]}>
                <Ionicons name="time-outline" size={10} color={statusAgeColor} />
                <Text style={[styles.statusAgeText, { color: statusAgeColor }]}>
                  {daysInStatus === 1 ? 'Hace 1 día' : `Hace ${daysInStatus} días`}
                </Text>
                {daysInStatus > 10 && <Ionicons name="warning" size={12} color={statusAgeColor} />}
              </View>
            )}
          </>
        )}
        
        {/* Botones de cambio de estado - Disponible para todos los roles */}
        {!compactView && (
          <TaskStatusButtons
            currentStatus={item.status}
            taskId={item.id}
            onStatusChange={handleStatusChange}
          />
        )}
      </SpringCard>
    );
  };

  // Aplicar filtros con memoización
  const applyFilters = useCallback((taskList) => {
    return taskList.filter(task => {
      if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      if (filters.area && task.area !== filters.area) return false;
      if (filters.responsible && task.assignedTo !== filters.responsible) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.overdue && toMs(task.dueAt) >= Date.now()) return false;
      
      // Filtro: Para hoy
      if (filters.dueToday) {
        const dueMs = toMs(task.dueAt);
        const dueDate = dueMs ? new Date(dueMs) : null;
        const today = new Date();
        if (!dueDate || dueDate.toDateString() !== today.toDateString() || task.status === 'cerrada') return false;
      }
      
      // Filtro: Esta semana
      if (filters.dueThisWeek) {
        const dueMs = toMs(task.dueAt);
        const dueDate = dueMs ? new Date(dueMs) : null;
        const today = new Date();
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (!dueDate || dueDate < today || dueDate > weekEnd || task.status === 'cerrada') return false;
      }
      
      return true;
    });
  }, [filters]);

  // Ordenar tareas
  const sortTasks = useCallback((taskList) => {
    const sorted = [...taskList];
    if (sortBy === 'priority') {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      // Ordenar por fecha (más reciente primero)
      sorted.sort((a, b) => {
        const dateA = new Date(toMs(a.createdAt));
        const dateB = new Date(toMs(b.createdAt));
        return dateB - dateA;
      });
    }
    return sorted;
  }, [sortBy]);

  // Verificar si una tarea está vencida
  const isTaskOverdue = (task) => {
    if (!task.dueAt || task.status === 'cerrada') return false;
    const dueMs = toMs(task.dueAt);
    return dueMs ? dueMs < Date.now() : false;
  };

  // Cambiar prioridad rápidamente
  const changePriority = async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      hapticMedium();
      showSuccess(`Prioridad cambiada a ${priority}`);
      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
    } catch (error) {
      // Error silencioso
    }
  };

  // Memoizar tareas por estado para evitar recalcular en cada render
  // Pre-compute task stats to avoid repeated filter calls in render
  const taskStats = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const userEmail = currentUser?.email || '';

    let overdueCount = 0;
    let todayCount = 0;
    let thisWeekCount = 0;
    let myTasksCount = 0;
    const priorityCounts = { alta: 0, media: 0, baja: 0 };

    tasks.forEach(t => {
      const dueMs = toMs(t.dueAt);
      const dueDate = new Date(dueMs);
      if (dueMs < now && t.status !== 'cerrada') overdueCount++;
      if (dueDate.toDateString() === today.toDateString() && t.status !== 'cerrada') todayCount++;
      if (dueDate >= today && dueDate <= weekEnd && t.status !== 'cerrada') thisWeekCount++;
      if (userEmail && (t.responsables?.some(r => r.email === userEmail) || t.responsable === userEmail)) myTasksCount++;
      if (t.priority in priorityCounts) priorityCounts[t.priority]++;
    });

    return { overdueCount, overdueTasksCount: overdueCount, todayCount, thisWeekCount, myTasksCount, priorityCounts };
  }, [tasks, currentUser]);

  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(status => {
      const byStatus = tasks.filter(t => {
        const taskStatus = t.status || 'pendiente';
        return taskStatus === status.key;
      });
      const filtered = applyFilters(byStatus);
      const sorted = sortTasks(filtered);
      grouped[status.key] = { byStatus, filtered, sorted };
    });
    return grouped;
  }, [tasks, applyFilters, sortTasks]);

  const renderColumn = useCallback((status) => {
    const { byStatus, filtered, sorted } = tasksByStatus[status.key] || { byStatus: [], filtered: [], sorted: [] };
    const completionRate = byStatus.length > 0 ? (filtered.length / byStatus.length) * 100 : 0;
    
    // Calcular tareas vencidas en esta columna
    const overdueTasks = sorted.filter(task => toMs(task.dueAt) < Date.now()).length;
    
    // Calcular tareas de alta prioridad
    const highPriorityTasks = sorted.filter(task => task.priority === 'alta').length;

    const columnAnimation = columnAnimations[status.key];
    const animatedStyle = {
      opacity: columnAnimation,
      transform: [
        {
          translateY: columnAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }
      ]
    };

    return (
      <Animated.View key={status.key} style={[styles.column, { backgroundColor: theme.surface }, animatedStyle]}>
        <View
          style={[styles.columnHeader, { backgroundColor: status.color + '20' }]}
          accessible={true}
          accessibilityLabel={`Columna ${status.label}, ${sorted.length} tareas`}
          accessibilityRole="header"
        >
          <View style={styles.columnTitleContainer}>
            <View style={[styles.columnIconCircle, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
          </View>
          
          {/* Badges y estadísticas mejoradas */}
          <View style={styles.columnBadges}>
            {/* Contador principal con pulso si hay urgentes */}
            <View style={styles.columnCountContainer}>
              <View style={[styles.columnCount, { backgroundColor: status.color }]}>
                <Text style={styles.columnCountText}>{sorted.length}</Text>
              </View>
              {highPriorityTasks > 0 && <PulsingDot size={5} color={status.color} />}
            </View>
            
            {/* Badge de vencidas si hay - CON PULSO */}
            {overdueTasks > 0 && (
              <View style={styles.badgeContainer}>
                <View style={[styles.overdueColumnBadge, { backgroundColor: '#DC2626' }]}>
                  <Ionicons name="alert-circle" size={10} color="#FFFFFF" />
                  <Text style={styles.columnCountText}>{overdueTasks}</Text>
                </View>
                <PulsingDot size={4} color="#DC2626" />
              </View>
            )}
            
            {/* Badge de alta prioridad - CON PULSO */}
            {highPriorityTasks > 0 && (
              <View style={styles.badgeContainer}>
                <View style={[styles.priorityColumnBadge, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="flag" size={10} color="#FFFFFF" />
                  <Text style={styles.columnCountText}>{highPriorityTasks}</Text>
                </View>
                <PulsingDot size={4} color="#F59E0B" />
              </View>
            )}
          </View>
        </View>
        
        {/* Barra de progreso */}
        {byStatus.length > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: status.color,
                    width: `${completionRate}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {Math.round(completionRate)}% ({sorted.length}/{byStatus.length})
            </Text>
          </View>
        )}

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DraggableCard item={item} status={status} />}
          contentContainerStyle={{ paddingBottom: 8 }}
          // ⚡ Optimizaciones de rendimiento
          windowSize={5}
          maxToRenderPerBatch={5}
          removeClippedSubviews={true}
          initialNumToRender={6}
          updateCellsBatchingPeriod={100}
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
          ListEmptyComponent={() => (
            <FadeInView duration={400} delay={200} style={styles.emptyColumnState}>
              <View style={styles.emptyStateContent}>
                <View style={[styles.emptyStateIconContainer, { backgroundColor: status.color + '15' }]}>
                  <Ionicons 
                    name={status.key === 'cerrada' ? 'checkmark-circle-outline' : 'document-text-outline'} 
                    size={28} 
                    color={status.color} 
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  {status.key === 'cerrada' ? '¡Todo listo! 🎉' : 'Columna vacía'}
                </Text>
                <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
                  {status.key === 'cerrada' 
                    ? 'Todas las tareas están completadas' 
                    : 'Aquí aparecerán las tareas \n del estado ' + status.label}
                </Text>
              </View>
            </FadeInView>
          )}
        />
      </Animated.View>
    );
  }, [tasksByStatus, columnAnimations, theme, isDark]);

  const styles = React.useMemo(() => createStyles(theme, isDark, columnWidth, dimensions), [theme, isDark, columnWidth, dimensions]);

  // Estilo animado para FAB
  const fabAnimatedStyle = {
    transform: [{ scale: fabScale }],
    opacity: fabScale,
  };

  // Mostrar shimmer mientras se cargan las tareas
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
            <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heading}>Tablero Kanban</Text>
                </View>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', padding: 10, gap: 10 }}>
              {STATUSES.map(status => (
                <View key={status.key} style={{ flex: 1, borderRadius: 12, backgroundColor: theme.card, padding: 12, minWidth: 200 }}>
                  <ShimmerEffect width="60%" height={20} style={{ marginBottom: 12 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 8 }} />
                  <ShimmerEffect width="100%" height={80} style={{ marginBottom: 8, borderRadius: 8 }} />
                  <ShimmerEffect width="100%" height={80} style={{ borderRadius: 8 }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>Tablero Kanban</Text>
            </View>
            
            {/* Indicador de Vencidas Premium en el Header */}
            {taskStats.overdueCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ ...filters, overdue: !filters.overdue });
                  hapticLight();
                }}
                style={[
                  styles.overdueHeaderBadge,
                  filters.overdue && styles.overdueHeaderBadgeActive
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.overdueHeaderPulse}>
                  <Ionicons name="warning" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.overdueHeaderContent}>
                  <Text style={styles.overdueHeaderCount}>
                    {taskStats.overdueCount}
                  </Text>
                  <Text style={styles.overdueHeaderLabel}>vencidas</Text>
                </View>
                {filters.overdue && (
                  <View style={styles.overdueHeaderCheck}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            )}
            
            <View style={styles.headerActions}>
              {/* Toggle vista compacta */}
              <TouchableOpacity
                onPress={() => {
                  setCompactView(!compactView);
                  hapticLight();
                }}
                style={[styles.iconButton, compactView && styles.iconButtonActive]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={compactView ? 'Vista normal' : 'Vista compacta'}
                accessibilityRole="button"
              >
                <Ionicons
                  name={compactView ? 'list' : 'grid-outline'}
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              
              {/* Toggle ordenamiento */}
              <TouchableOpacity 
                onPress={() => {
                  setSortBy(sortBy === 'date' ? 'priority' : 'date');
                  hapticLight();
                }}
                style={styles.iconButton}
              >
                <Ionicons 
                  name={sortBy === 'date' ? 'time-outline' : 'flag-outline'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              
              {/* Estadísticas */}
              <TouchableOpacity 
                onPress={() => setShowStats(!showStats)}
                style={styles.iconButton}
              >
                <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Barra compacta de filtros */}
        <View style={[styles.filterCompactBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          {/* Chips de filtros activos */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.activeFiltersRow}
            style={{ flex: 1 }}
          >
            {/* Chip Mis tareas */}
            {currentUser && (
              <TouchableOpacity
                onPress={() => {
                  setFilters({ 
                    ...filters, 
                    responsible: filters.responsible === currentUser.email ? '' : currentUser.email 
                  });
                  hapticLight();
                }}
                style={[
                  styles.filterChipCompact,
                  { 
                    backgroundColor: filters.responsible === currentUser.email ? theme.primary : 'transparent',
                    borderColor: filters.responsible === currentUser.email ? theme.primary : theme.primary
                  }
                ]}
              >
                <Ionicons 
                  name="person" 
                  size={14} 
                  color={filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary} 
                />
                <Text style={[
                  styles.filterChipCompactText, 
                  { color: filters.responsible === currentUser.email ? '#FFFFFF' : theme.primary }
                ]}>
                  Mis tareas
                </Text>
              </TouchableOpacity>
            )}

            {/* Chip de prioridad activa */}
            {filters.priority && (
              <View style={[styles.filterChipCompact, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}>
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]}>
                  {filters.priority === 'alta' ? 'Urgente' : filters.priority === 'media' ? 'Media' : 'Baja'}
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, priority: '' })}>
                  <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chip de búsqueda activa */}
            {filters.searchText && (
              <View style={[styles.filterChipCompact, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                <Ionicons name="search" size={14} color="#FFFFFF" />
                <Text style={[styles.filterChipCompactText, { color: '#FFFFFF' }]} numberOfLines={1}>
                  "{filters.searchText.substring(0, 15)}"
                </Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, searchText: '' })}>
                  <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Botón abrir modal de filtros */}
          <TouchableOpacity
            onPress={() => {
              setShowFiltersModal(true);
              hapticLight();
            }}
            style={[styles.filterModalButton, { borderColor: theme.border }]}
          >
            <Ionicons name="options" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Modal de Filtros Premium */}
        <Modal
          visible={showFiltersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFiltersModal(false)}
        >
          <View style={styles.filterModalOverlay}>
            <View style={[styles.filterModalContainer, { backgroundColor: theme.background }]}>
              {/* Header del Modal */}
              <LinearGradient
                colors={['#9F2241', '#BE3356']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filterModalHeader}
              >
                <View style={styles.filterModalHeaderContent}>
                  <View>
                    <Text style={styles.filterModalTitle}>Filtros</Text>
                    <Text style={styles.filterModalSubtitle}>Personaliza tu vista</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowFiltersModal(false)}
                    style={styles.filterModalCloseBtn}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
                {/* Búsqueda */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="search" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Buscar tareas
                    </Text>
                  </View>
                  <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
                    <View style={styles.searchInputWrapper}>
                      <TouchableOpacity
                        style={styles.searchInputTouchable}
                        onPress={() => {
                          // Enfocar el FilterBar cuando se toca
                        }}
                      >
                        <Text style={[styles.searchInputPlaceholder, { color: filters.searchText ? theme.text : theme.textSecondary }]}>
                          {filters.searchText || 'Buscar tareas...'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {filters.searchText && (
                      <TouchableOpacity onPress={() => setFilters({ ...filters, searchText: '' })}>
                        <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Prioridad */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="flag" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Prioridad
                    </Text>
                  </View>
                  <View style={styles.priorityButtonsRow}>
                    {[
                      { key: 'alta', label: 'Urgente', color: '#EF4444', icon: 'flash' },
                      { key: 'media', label: 'Media', color: '#F59E0B', icon: 'remove' },
                      { key: 'baja', label: 'Normal', color: '#10B981', icon: 'arrow-down' }
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => {
                          setFilters({ ...filters, priority: filters.priority === p.key ? '' : p.key });
                          hapticLight();
                        }}
                        style={[
                          styles.priorityButton,
                          { 
                            backgroundColor: filters.priority === p.key ? p.color : theme.cardBackground,
                            borderColor: p.color
                          }
                        ]}
                      >
                        <Ionicons 
                          name={p.icon} 
                          size={18} 
                          color={filters.priority === p.key ? '#FFFFFF' : p.color} 
                        />
                        <Text style={[
                          styles.priorityButtonText,
                          { color: filters.priority === p.key ? '#FFFFFF' : p.color }
                        ]}>
                          {p.label}
                        </Text>
                        {taskStats.priorityCounts[p.key] > 0 && (
                          <View style={[styles.priorityBadge, { backgroundColor: filters.priority === p.key ? 'rgba(255,255,255,0.3)' : p.color }]}>
                            <Text style={[styles.priorityBadgeText, { color: filters.priority === p.key ? '#FFFFFF' : '#FFFFFF' }]}>
                              {taskStats.priorityCounts[p.key]}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Filtros rápidos */}
                <View style={styles.filterSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="options" size={16} color={theme.primary} />
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Filtros rápidos
                    </Text>
                  </View>
                  <View style={styles.quickFilterGrid}>
                    {/* Vencidas */}
                    {taskStats.overdueTasksCount > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setFilters({ ...filters, overdue: !filters.overdue });
                          hapticLight();
                        }}
                        style={[
                          styles.quickFilterCard,
                          { 
                            backgroundColor: filters.overdue ? '#FEE2E2' : theme.cardBackground,
                            borderColor: filters.overdue ? '#DC2626' : theme.border
                          }
                        ]}
                      >
                        <View style={[styles.quickFilterIconBg, { backgroundColor: '#DC2626' }]}>
                          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.quickFilterCardContent}>
                          <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Vencidas</Text>
                          <Text style={[styles.quickFilterCardCount, { color: '#DC2626' }]}>
                            {taskStats.overdueTasksCount} tareas
                          </Text>
                        </View>
                        {filters.overdue && (
                          <Ionicons name="checkmark-circle" size={24} color="#DC2626" />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Mis tareas */}
                    {currentUser && (
                      <TouchableOpacity
                        onPress={() => {
                          setFilters({ 
                            ...filters, 
                            responsible: filters.responsible === currentUser.email ? '' : currentUser.email 
                          });
                          hapticLight();
                        }}
                        style={[
                          styles.quickFilterCard,
                          { 
                            backgroundColor: filters.responsible === currentUser.email ? '#EDE9FE' : theme.cardBackground,
                            borderColor: filters.responsible === currentUser.email ? theme.primary : theme.border
                          }
                        ]}
                      >
                        <View style={[styles.quickFilterIconBg, { backgroundColor: theme.primary }]}>
                          <Ionicons name="person" size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.quickFilterCardContent}>
                          <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Mis tareas</Text>
                          <Text style={[styles.quickFilterCardCount, { color: theme.primary }]}>
                            {taskStats.myTasksCount} asignadas
                          </Text>
                        </View>
                        {filters.responsible === currentUser.email && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Hoy */}
                    <TouchableOpacity
                      onPress={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        // Toggle: si ya está activo, desactivar
                        if (filters.dueToday) {
                          setFilters({ ...filters, dueToday: false });
                        } else {
                          setFilters({ ...filters, dueToday: true });
                        }
                        hapticLight();
                      }}
                      style={[
                        styles.quickFilterCard,
                        { 
                          backgroundColor: filters.dueToday ? '#FEF3C7' : theme.cardBackground,
                          borderColor: filters.dueToday ? '#F59E0B' : theme.border
                        }
                      ]}
                    >
                      <View style={[styles.quickFilterIconBg, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="today" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.quickFilterCardContent}>
                        <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Para hoy</Text>
                        <Text style={[styles.quickFilterCardCount, { color: '#F59E0B' }]}>
                          {taskStats.todayCount} tareas
                        </Text>
                      </View>
                      {filters.dueToday && (
                        <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                      )}
                    </TouchableOpacity>

                    {/* Esta semana */}
                    <TouchableOpacity
                      onPress={() => {
                        if (filters.dueThisWeek) {
                          setFilters({ ...filters, dueThisWeek: false });
                        } else {
                          setFilters({ ...filters, dueThisWeek: true });
                        }
                        hapticLight();
                      }}
                      style={[
                        styles.quickFilterCard,
                        { 
                          backgroundColor: filters.dueThisWeek ? '#DBEAFE' : theme.cardBackground,
                          borderColor: filters.dueThisWeek ? '#3B82F6' : theme.border
                        }
                      ]}
                    >
                      <View style={[styles.quickFilterIconBg, { backgroundColor: '#3B82F6' }]}>
                        <Ionicons name="calendar" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.quickFilterCardContent}>
                        <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>Esta semana</Text>
                        <Text style={[styles.quickFilterCardCount, { color: '#3B82F6' }]}>
                          {taskStats.thisWeekCount} tareas
                        </Text>
                      </View>
                      {filters.dueThisWeek && (
                        <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Footer con botones */}
              <View style={[styles.filterModalFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    setFilters({ searchText: '', area: '', responsible: '', priority: '', overdue: false, dueToday: false, dueThisWeek: false });
                    hapticLight();
                  }}
                  style={[styles.filterModalClearBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name="refresh" size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterModalClearText, { color: theme.textSecondary }]}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowFiltersModal(false);
                    hapticLight();
                  }}
                  style={styles.filterModalApplyBtn}
                >
                  <LinearGradient
                    colors={['#9F2241', '#BE3356']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterModalApplyGradient}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.filterModalApplyText}>Aplicar filtros</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* FilterBar solo para búsqueda avanzada - oculto por defecto */}
        <FilterBar onFilterChange={setFilters} />
        
        {/* Wrapper para las columnas - diferente layout en web vs mobile */}
        {Platform.OS === 'web' ? (
          <View 
            style={[styles.board, { 
              flex: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'row'
            }]}
          >
            {STATUSES.map(renderColumn)}
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.board}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#9F2241"
                colors={['#9F2241']}
              />
            }
          >
            {STATUSES.map(renderColumn)}
          </ScrollView>
        )}
        
        {/* Indicador visual de drag en proceso */}
        {draggingTask && (
          <View style={styles.dragIndicator}>
            <Ionicons name="move" size={20} color={theme.primary} />
            <Text style={styles.dragIndicatorText}>
              Arrastra a una columna para cambiar estado
            </Text>
          </View>
        )}

        {/* FAB para crear tarea */}
        <Animated.View style={fabAnimatedStyle}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }]}
            onPress={() => {
              // Solo admin puede crear tareas
              if (!currentUser || (currentUser.role !== 'admin')) {
                showWarning('Solo administradores pueden crear tareas');
                return;
              }
              hapticMedium();
              navigation.navigate('TaskDetail', { task: null });
            }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Menú contextual */}
        {contextMenu.visible && contextMenu.task && (
          <BottomSheet
            visible={contextMenu.visible}
            onClose={() => setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } })}
            height={300}
            title="Edición Rápida"
          >
            <View style={styles.contextMenuContent}>
              <Text style={[styles.contextTaskTitle, { color: theme.text }]}>
                {contextMenu.task.title}
              </Text>
              
              <Text style={[styles.contextLabel, { color: theme.textSecondary }]}>Cambiar prioridad:</Text>
              <View style={styles.priorityOptions}>
                {['alta', 'media', 'baja'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: theme.surface },
                      contextMenu.task.priority === priority && { backgroundColor: theme.primary + '20' }
                    ]}
                    onPress={() => changePriority(contextMenu.task.id, priority)}
                  >
                    <Text style={[styles.priorityOptionText, { color: theme.text }]}>
                      {priority === 'alta' ? '🔴 Alta' : priority === 'media' ? '🟡 Media' : '🟢 Baja'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.contextLabel, { color: theme.textSecondary, marginTop: 16 }]}>Cambiar estado:</Text>
              <View style={styles.statusOptions}>
                {STATUSES.map(status => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusOption,
                      { backgroundColor: status.color + '20' },
                      contextMenu.task.status === status.key && { borderWidth: 2, borderColor: status.color }
                    ]}
                    onPress={() => {
                      changeStatus(contextMenu.task.id, status.key);
                      setContextMenu({ visible: false, task: null, position: { x: 0, y: 0 } });
                    }}
                  >
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={[styles.statusOptionText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BottomSheet>
        )}

        {/* BottomSheet para estadísticas */}
        <BottomSheet
          visible={showStats}
          onClose={() => setShowStats(false)}
          height={400}
          title="Estadísticas del Tablero"
        >
          <View style={styles.statsContainer}>
            {STATUSES.map(status => {
              const statusTasks = tasksByStatus[status.key]?.byStatus || [];
              const total = tasks.length;
              const percentage = total > 0 ? (statusTasks.length / total) * 100 : 0;
              
              return (
                <View key={status.key} style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <Ionicons name={status.icon} size={20} color={status.color} />
                    <Text style={styles.statLabel}>{status.label}</Text>
                  </View>
                  <View style={styles.statProgress}>
                    <CircularProgress
                      size={60}
                      strokeWidth={6}
                      progress={percentage}
                      color={status.color}
                    />
                    <View style={styles.statNumbers}>
                      <Text style={styles.statCount}>{statusTasks.length}</Text>
                      <Text style={styles.statPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </BottomSheet>

        
        {/* 💡 Tip de ayuda para tablero Kanban */}
        <QuickTip
          {...TIPS.KANBAN_DRAG}
          position="bottom"
          delay={2500}
        />
        <SyncIndicator />
        </View>{/* contentWrapper */}
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (theme, isDark, columnWidth = 300, dimensions = { width: 1200, height: 800 }) => {
  const screenWidth = dimensions.width;
  
  return StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    } : {})
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    } : {})
  },
  headerGradient: {
    paddingHorizontal: screenWidth > 768 ? 20 : 14,
    paddingTop: Platform.OS === 'web' ? 16 : 42,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.2
  },
  heading: { 
    fontSize: screenWidth > 768 ? 28 : 24, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  // Badge de vencidas en header
  overdueHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingLeft: 5,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  overdueHeaderBadgeActive: {
    backgroundColor: '#B91C1C',
    borderColor: '#FFFFFF',
  },
  overdueHeaderPulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  overdueHeaderContent: {
    alignItems: 'center',
  },
  overdueHeaderCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  overdueHeaderLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  overdueHeaderCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  priorityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120
  },
  areaText: {
    fontSize: 11,
    fontWeight: '600'
  },
  contextMenuContent: {
    padding: 12
  },
  contextTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600'
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  board: { 
    paddingHorizontal: Platform.OS === 'web' ? 10 : (dimensions.width > 480 ? 10 : 6), 
    paddingVertical: Platform.OS === 'web' ? 6 : (dimensions.width > 768 ? 8 : 6),
    ...(Platform.OS === 'web' ? (
      // En web: si pantalla > 600px, usar flexbox; sino scroll horizontal
      dimensions.width > 600 ? {
        display: 'flex',
        flexDirection: 'row',
        gap: dimensions.width > 1200 ? 10 : 8,
        alignItems: 'stretch',
        width: '100%',
        flex: 1
      } : {
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        alignItems: 'stretch',
        overflowX: 'auto',
        paddingBottom: 6
      }
    ) : {
      flexDirection: 'row',
      gap: dimensions.width > 768 ? 10 : 8
    })
  },
  column: { 
    ...(Platform.OS === 'web' ? (
      dimensions.width > 600 ? {
        flex: 1,
        minWidth: 180,
        minHeight: 'auto',
        maxHeight: '100%'
      } : {
        width: columnWidth,
        minWidth: columnWidth,
        flexShrink: 0
      }
    ) : {
      width: columnWidth,
      minWidth: columnWidth,
      marginRight: 0
    }),
    borderRadius: dimensions.width > 768 ? 14 : 12,
    backgroundColor: theme.card,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden'
  },
  columnHeader: { 
    paddingHorizontal: dimensions.width > 1000 ? 12 : 8,
    paddingVertical: dimensions.width > 768 ? 10 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  columnIconCircle: {
    width: dimensions.width > 768 ? 34 : 28,
    height: dimensions.width > 768 ? 34 : 28,
    borderRadius: dimensions.width > 768 ? 17 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  columnTitle: { 
    fontSize: dimensions.width > 1000 ? 14 : (dimensions.width > 768 ? 13 : 12),
    fontWeight: '700',
    letterSpacing: -0.2
  },
  columnCount: { 
    minWidth: dimensions.width > 768 ? 28 : 24,
    height: dimensions.width > 768 ? 28 : 24,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  columnBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  columnCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'relative'
  },
  overdueColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  priorityColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  progressBarContainer: {
    paddingHorizontal: dimensions.width > 1000 ? 12 : 8,
    paddingBottom: dimensions.width > 768 ? 6 : 4,
    gap: 3
  },
  progressBarBg: {
    height: dimensions.width > 768 ? 5 : 4,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  progressText: {
    fontSize: dimensions.width > 768 ? 9 : 8,
    fontWeight: '600',
    textAlign: 'center'
  },
  emptyColumnState: {
    paddingVertical: dimensions.width > 768 ? 20 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: 8
  },
  emptyStateIconContainer: {
    width: dimensions.width > 768 ? 52 : 40,
    height: dimensions.width > 768 ? 52 : 40,
    borderRadius: dimensions.width > 768 ? 26 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  emptyStateTitle: {
    fontSize: dimensions.width > 768 ? 13 : 11,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  emptyStateDescription: {
    fontSize: dimensions.width > 768 ? 11 : 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    opacity: 0.65
  },
  emptyColumnText: {
    fontSize: dimensions.width > 768 ? 14 : 12,
    fontWeight: '500',
    opacity: 0.6
  },
  statusAgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusAgeText: {
    fontSize: 9,
    fontWeight: '600'
  },
  filterToggleBar: {
    paddingHorizontal: dimensions.width > 768 ? 16 : 12,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
    paddingHorizontal: 12
  },
  filterToggleText: {
    fontSize: dimensions.width > 768 ? 13 : 12,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  unifiedFilterBarContainer: {
    flexDirection: 'row'
  },
  unifiedFilterBar: {
    paddingHorizontal: dimensions.width > 768 ? 16 : 12,
    paddingVertical: dimensions.width > 768 ? 6 : 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    width: '100%'
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: dimensions.width > 768 ? 8 : 6,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: dimensions.width > 768 ? 12 : 10,
    paddingVertical: dimensions.width > 768 ? 8 : 6,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilterText: {
    fontSize: dimensions.width > 768 ? 12 : 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: dimensions.width > 768 ? 10 : 8,
    paddingVertical: dimensions.width > 768 ? 8 : 6,
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: dimensions.width > 768 ? 11 : 10,
    fontWeight: '600',
  },
  columnCountText: {
    fontSize: dimensions.width > 768 ? 12 : 11,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  card: { 
    margin: dimensions.width > 600 ? 6 : 5,
    padding: dimensions.width > 600 ? 10 : 8,
    borderRadius: dimensions.width > 600 ? 12 : 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.12 : 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  cardDragging: {
    opacity: 0.95,
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 2,
    borderColor: theme.primary
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
    flexWrap: 'wrap'
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  priorityChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  compactPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  overdueChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  cardTitle: { 
    fontSize: dimensions.width > 600 ? 13 : 12,
    fontWeight: '600',
    color: theme.text,
    marginBottom: dimensions.width > 600 ? 8 : 6,
    lineHeight: dimensions.width > 600 ? 18 : 16,
    letterSpacing: -0.1
  },
  cardInfoGrid: {
    gap: 5,
    marginBottom: 8
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
  },
  cardInfoText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.1
  },
  cardTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6
  },
  cardTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: '600'
  },
  cardTagMore: {
    fontSize: 9,
    fontWeight: '600',
    paddingVertical: 2
  },
  dragIndicator: {
    position: 'absolute',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2.5,
    borderColor: theme.primary
  },
  dragIndicatorText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  statsContainer: {
    padding: 12,
  },
  statItem: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  statProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statNumbers: {
    alignItems: 'flex-end',
  },
  statCount: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statPercentage: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  // Estilos para barra compacta de filtros
  filterCompactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth > 768 ? 16 : 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  filterChipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipCompactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos del Modal de Filtros
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  filterModalHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  filterModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  filterModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  filterModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInputTouchable: {
    flex: 1,
  },
  searchInputPlaceholder: {
    fontSize: 15,
  },
  priorityButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickFilterGrid: {
    gap: 12,
  },
  quickFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  quickFilterIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFilterCardContent: {
    flex: 1,
  },
  quickFilterCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickFilterCardCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  filterModalClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  filterModalClearText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterModalApplyBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterModalApplyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  filterModalApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  });
};
