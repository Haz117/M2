// screens/CalendarScreen.js
// Vista de calendario mensual con tareas por día
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../components/EmptyState';
import SpringCard from '../components/SpringCard';
import CircularProgress from '../components/CircularProgress';
import PulsingDot from '../components/PulsingDot';
import AnimatedBadge from '../components/AnimatedBadge';
import { subscribeToTasks } from '../services/tasks';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import Toast from '../components/Toast';
import OverdueAlert from '../components/OverdueAlert';
import { getCurrentSession } from '../services/authFirestore';
import { useResponsive } from '../utils/responsive';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS, MAX_WIDTHS } from '../theme/tokens';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { width, isDesktop, isTablet, columns, padding } = useResponsive();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Animaciones de entrada
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const calendarSlide = useRef(new Animated.Value(100)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    let unsubscribe;
    
    // Cargar usuario actual
    getCurrentSession().then(result => {
      if (result.success) {
        setCurrentUser(result.session);
      }
    });
    
    subscribeToTasks((updatedTasks) => {
      setTasks(updatedTasks);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  
  // Animar elementos de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(calendarSlide, {
        toValue: 0,
        delay: 150,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
    
    // FAB con retraso
    Animated.spring(fabScale, {
      toValue: 1,
      delay: 500,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Generar días del mes con memoización para mejor rendimiento
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Agrupar tareas por fecha con memoización
  const tasksByDate = useMemo(() => {
    const grouped = {};
    
    tasks.forEach(task => {
      if (task.dueAt) {
        const date = new Date(task.dueAt);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return tasksByDate[dateKey] || [];
  };

  const previousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate]);

  const nextMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate]);

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const openDayDetail = (date) => {
    hapticLight(); // Light haptic on date selection
    setSelectedDate(date);
    setModalVisible(true);
  };

  const renderDay = (date, index) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const dayTasks = getTasksForDate(date);
    const hasHighPriority = dayTasks.some(t => t.priority === 'alta');
    const isOverdue = dayTasks.some(t => t.dueAt < Date.now() && t.status !== 'cerrada');
    const today = isToday(date);

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.day,
          { backgroundColor: theme.surface, borderColor: theme.border },
          today && { backgroundColor: theme.primary, borderColor: theme.primary },
          hasHighPriority && styles.dayHighPriority,
          isOverdue && styles.dayOverdue
        ]}
        onPress={() => {
          if (dayTasks.length > 0) {
            hapticLight();
            openDayDetail(date);
          } else {
            setToastMessage('No hay tareas para este día');
            setToastType('info');
            setToastVisible(true);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.dayNumber,
          { color: theme.text },
          today && styles.dayNumberToday,
          (hasHighPriority || isOverdue) && styles.dayNumberActive
        ]}>
          {date.getDate()}
        </Text>
        
        {dayTasks.length > 0 && (
          <View style={styles.taskIndicators}>
            {dayTasks.slice(0, 3).map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.taskDot,
                  task.priority === 'alta' && styles.taskDotHigh,
                  task.priority === 'media' && styles.taskDotMedium,
                  task.priority === 'baja' && styles.taskDotLow
                ]}
              />
            ))}
            {dayTasks.length > 3 && (
              <Text style={styles.moreTasks}>+{dayTasks.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTaskItem = (task) => (
    <TouchableOpacity
      key={task.id}
      style={[styles.modalTaskCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => {
        hapticLight();
        setModalVisible(false);
        navigation.navigate('TaskDetail', { task });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.modalTaskHeader}>
        <View style={[
          styles.modalTaskPriority,
          task.priority === 'alta' && styles.modalTaskPriorityHigh,
          task.priority === 'media' && styles.modalTaskPriorityMedium,
          task.priority === 'baja' && styles.modalTaskPriorityLow
        ]} />
        <Text style={[styles.modalTaskTitle, { color: theme.text }]} numberOfLines={2}>{task.title}</Text>
      </View>
      
      <View style={styles.modalTaskMeta}>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="business-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.area}</Text>
        </View>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>{task.assignedTo || 'Sin asignar'}</Text>
        </View>
        <View style={styles.modalTaskMetaItem}>
          <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.modalTaskMetaText, { color: theme.textSecondary }]}>
            {new Date(task.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      
      <View style={styles.modalTaskStatus}>
        <Text style={[
          styles.modalTaskStatusText,
          task.status === 'cerrada' && styles.modalTaskStatusClosed
        ]}>
          {task.status === 'en_proceso' ? 'En proceso' : 
           task.status === 'en_revision' ? 'En revisión' : 
           task.status === 'cerrada' ? 'Cerrada' : 'Pendiente'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const styles = React.useMemo(() => createStyles(theme, isDark, isDesktop, isTablet, width, padding), [theme, isDark, isDesktop, isTablet, width, padding]);
  
  // Estilos animados
  const headerAnimatedStyle = {
    transform: [{ translateY: headerSlide }],
  };
  
  const calendarAnimatedStyle = {
    opacity: calendarSlide.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0]
    }),
    transform: [{ translateY: calendarSlide }],
  };
  
  const fabAnimatedStyle = {
    transform: [{ scale: fabScale }],
    opacity: fabScale,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      <Animated.View style={[styles.headerGradient, { backgroundColor: isDark ? '#1A1A1A' : '#9F2241' }, headerAnimatedStyle]}>
        <View style={styles.header}>
          <View>
            <View style={styles.greetingContainer}>
              <Ionicons name="calendar" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
              <Text style={styles.greeting}>Vista mensual</Text>
            </View>
            <Text style={styles.heading}>Calendario</Text>
          </View>
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={() => {
              hapticMedium();
              setCurrentDate(new Date());
              setToastMessage('¡Vista actualizada a hoy!');
              setToastType('info');
              setToastVisible(true);
            }}
          >
            <Text style={styles.todayButtonText}>HOY</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={tasks} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Controles de mes */}
        <Animated.View style={[styles.monthControls, calendarAnimatedStyle]}>
          <TouchableOpacity 
            onPress={() => {
              hapticLight();
              previousMonth();
            }} 
            style={[styles.monthButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          
          <View style={[styles.monthDisplay, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.monthText, { color: theme.text }]}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              hapticLight();
              nextMonth();
            }} 
            style={[styles.monthButton, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Encabezado de días */}
        <View style={styles.weekHeader}>
          {DAYS.map(day => (
            <View key={day} style={styles.weekDay}>
              <Text style={[styles.weekDayText, { color: theme.textSecondary }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Grid de calendario */}
        <View style={styles.calendar}>
          {calendarDays.map((date, index) => renderDay(date, index))}
        </View>

        {/* Leyenda */}
        <View style={[styles.legend, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>Leyenda:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotHigh]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Alta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotMedium]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Media</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.taskDot, styles.taskDotLow]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Baja</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de tareas del día */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'tarea' : 'tareas'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  hapticLight();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedDateTasks.map(renderTaskItem)}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%'
  },
  headerGradient: {
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOWS.lg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 48,
    paddingBottom: SPACING.lg
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.3
  },
  heading: { 
    fontSize: 32, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2
  },
  todayButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: isDesktop ? 16 : isTablet ? 14 : 18,
    paddingVertical: isDesktop ? 10 : isTablet ? 10 : 12,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: isDesktop ? 13 : 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  scrollContent: {
    padding: padding
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm
  },
  monthButton: {
    width: isDesktop ? 48 : isTablet ? 46 : 50,
    height: isDesktop ? 48 : isTablet ? 46 : 50,
    borderRadius: isDesktop ? 24 : isTablet ? 23 : 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9F2241'
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center'
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.4
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.15)' : 'rgba(159, 34, 65, 0.08)',
    borderRadius: 12,
    padding: isDesktop ? 8 : isTablet ? 10 : 12,
    borderWidth: 2,
    borderColor: '#9F2241'
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: isDesktop ? 6 : isTablet ? 8 : 10
  },
  weekDayText: {
    fontSize: isDesktop ? 12 : isTablet ? 13 : 14,
    fontWeight: '800',
    color: '#9F2241',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: isDesktop ? 4 : isTablet ? 6 : 8,
    minHeight: isDesktop ? 50 : isTablet ? 55 : 60
  },
  dayToday: {
    backgroundColor: '#9F2241',
    borderRadius: 12,
    margin: 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5
  },
  dayHighPriority: {
    borderWidth: 3,
    borderColor: '#EF4444',
    borderRadius: 12,
    margin: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  dayOverdue: {
    backgroundColor: '#FFE4E1',
    borderRadius: 12,
    margin: 2
  },
  dayNumber: {
    fontSize: isDesktop ? 15 : isTablet ? 14 : 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4
  },
  dayNumberToday: {
    color: '#FFFFFF'
  },
  dayNumberActive: {
    color: '#9F2241',
    fontWeight: '900'
  },
  taskIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3
  },
  taskDot: {
    width: isDesktop ? 5 : isTablet ? 6 : 7,
    height: isDesktop ? 5 : isTablet ? 6 : 7,
    borderRadius: isDesktop ? 2.5 : isTablet ? 3 : 3.5,
    backgroundColor: '#22C55E'
  },
  taskDotHigh: {
    backgroundColor: '#EF4444'
  },
  taskDotMedium: {
    backgroundColor: '#F97316'
  },
  taskDotLow: {
    backgroundColor: '#22C55E'
  },
  moreTasks: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8E8E93',
    marginLeft: 2
  },
  legend: {
    marginTop: 20,
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.15)' : 'rgba(159, 34, 65, 0.08)',
    padding: isDesktop ? 14 : isTablet ? 12 : 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(159, 34, 65, 0.4)' : '#9F2241',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  legendTitle: {
    fontSize: isDesktop ? 13 : 14,
    fontWeight: '900',
    color: theme.text,
    marginBottom: isDesktop ? 10 : 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  legendItems: {
    flexDirection: 'row',
    gap: isDesktop ? 16 : isTablet ? 18 : 20,
    justifyContent: 'space-around'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isDesktop ? 6 : 8,
    flex: 1,
    justifyContent: 'center'
  },
  legendText: {
    fontSize: isDesktop ? 12 : 13,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: isDesktop ? 24 : isTablet ? 18 : 20,
    maxHeight: '85%',
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0'
  },
  modalTitle: {
    fontSize: isDesktop ? 18 : 20,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
    textTransform: 'capitalize',
    marginBottom: 6
  },
  modalSubtitle: {
    fontSize: isDesktop ? 13 : 14,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 0.2
  },
  modalScroll: {
    maxHeight: 500
  },
  modalTaskCard: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFAF0',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#F5DEB3',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3
  },
  modalTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10
  },
  modalTaskPriority: {
    width: 5,
    height: '100%',
    minHeight: 50,
    borderRadius: 3,
    backgroundColor: '#34C759'
  },
  modalTaskPriorityHigh: {
    backgroundColor: '#EF4444'
  },
  modalTaskPriorityMedium: {
    backgroundColor: '#F97316'
  },
  modalTaskPriorityLow: {
    backgroundColor: '#22C55E'
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 22
  },
  modalTaskMeta: {
    gap: 10,
    marginBottom: 12
  },
  modalTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTaskMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.2
  },
  modalTaskStatus: {
    alignSelf: 'flex-start'
  },
  modalTaskStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F2241',
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  modalTaskStatusClosed: {
    color: '#34C759',
    backgroundColor: '#E8F5E9'
  }
});
