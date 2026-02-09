// components/OverdueAlert.js
// ✨ Alerta mejorada para tareas vencidas - Con tarjetas visuales para próximos vencimientos
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function OverdueAlert({ tasks, currentUserEmail, role = 'operativo', onTaskPress }) {
  const { theme, isDark } = useTheme();
  
  if (!tasks || tasks.length === 0) {
    console.log('[OverdueAlert] Sin tareas', { tasks, role });
    return null;
  }

  // Categorizar tareas por estado de vencimiento
  const categorizedTasks = useMemo(() => {
    const now = Date.now();
    let overdue = [];
    let urgent = [];      // < 6 horas
    let soonDue = [];     // < 24 horas
    let upcoming = [];    // < 7 días

    const applicableTasks = role === 'admin' || role === 'jefe' 
      ? tasks.filter(task => task.status !== 'cerrada')
      : tasks.filter(task => 
          task.status !== 'cerrada' && 
          task.assignedTo === currentUserEmail
        );

    console.log('[OverdueAlert] Debug:', {
      rol: role,
      totalTareas: tasks.length,
      tareasAplicables: applicableTasks.length,
      estatuses: tasks.map(t => t.status),
    });

    applicableTasks.forEach(task => {
      const dueTime = new Date(task.dueAt).getTime();
      const diffMs = dueTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffMs < 0) {
        overdue.push({ ...task, hoursOverdue: Math.floor(-diffHours) });
      } else if (diffHours < 6) {
        urgent.push({ ...task, hoursLeft: Math.ceil(diffHours) });
      } else if (diffHours < 24) {
        soonDue.push({ ...task, hoursLeft: Math.ceil(diffHours) });
      } else if (diffDays < 7) {
        upcoming.push({ ...task, daysLeft: Math.ceil(diffDays) });
      }
    });

    console.log('[OverdueAlert] Categorías:', { overdue: overdue.length, urgent: urgent.length, soonDue: soonDue.length, upcoming: upcoming.length });

    return { overdue, urgent, soonDue, upcoming };
  }, [tasks, currentUserEmail, role]);

  const { overdue, urgent, soonDue, upcoming } = categorizedTasks;
  const totalCritical = overdue.length + urgent.length;

  console.log('[OverdueAlert] Renderizar?', {
    totalCritical,
    soonDue: soonDue.length,
    upcoming: upcoming.length,
    deberia: !(totalCritical === 0 && soonDue.length === 0 && upcoming.length === 0)
  });

  if (totalCritical === 0 && soonDue.length === 0 && upcoming.length === 0) {
    console.log('[OverdueAlert] No hay tareas para mostrar');
    return null;
  }

  const isWeb = Platform.OS === 'web';
  console.log('[OverdueAlert] Renderizando en:', isWeb ? 'WEB' : 'MÓVIL');

  // Renderizar tarjeta web (grid)
  const renderWebCard = (task, idx, backgroundColor) => (
    <TouchableOpacity
      key={`${task.id}-${idx}`}
      style={[
        styles.alertCardWeb,
        { 
          backgroundColor: isDark ? `${backgroundColor}20` : `${backgroundColor}15`,
          borderColor: backgroundColor,
          borderWidth: 1.5,
        }
      ]}
      onPress={() => onTaskPress?.(task)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTaskTitleWeb, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="calendar" size={11} color={backgroundColor} />
          <Text style={[styles.cardDateWeb, { color: theme.textSecondary }]}>
            {new Date(task.dueAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="time" size={11} color={backgroundColor} />
          <Text style={[styles.cardTimeWeb, { color: theme.textSecondary }]}>
            {new Date(task.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <View style={[styles.cardBadgeWeb, { backgroundColor }]}>
        {task.hoursOverdue !== undefined && <Text style={styles.badgeTextWeb}>-{task.hoursOverdue}h</Text>}
        {task.hoursLeft !== undefined && <Text style={styles.badgeTextWeb}>{task.hoursLeft}h</Text>}
        {task.daysLeft !== undefined && <Text style={styles.badgeTextWeb}>{task.daysLeft}d</Text>}
      </View>
    </TouchableOpacity>
  );

  // Renderizar tarjeta móvil (scroll)
  const renderMobileCard = (task, idx, backgroundColor) => (
    <TouchableOpacity
      key={`${task.id}-${idx}`}
      style={[
        styles.alertCard,
        { 
          backgroundColor: isDark ? `${backgroundColor}20` : `${backgroundColor}15`,
          borderColor: backgroundColor,
          borderWidth: 1.5,
          marginRight: 10,
        }
      ]}
      onPress={() => onTaskPress?.(task)}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTaskTitle, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="calendar" size={12} color={backgroundColor} />
          <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
            {new Date(task.dueAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="time" size={12} color={backgroundColor} />
          <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
            {new Date(task.dueAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <View style={[styles.cardBadge, { backgroundColor }]}>
        {task.hoursOverdue !== undefined && <Text style={styles.badgeText}>-{task.hoursOverdue}h</Text>}
        {task.hoursLeft !== undefined && <Text style={styles.badgeText}>{task.hoursLeft}h</Text>}
        {task.daysLeft !== undefined && <Text style={styles.badgeText}>{task.daysLeft}d</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderAlertCard = (type, items, title, icon, backgroundColor, borderColor) => {
    if (items.length === 0) return null;

    if (isWeb) {
      // Grid layout en web
      return (
        <View key={type} style={[styles.alertSection, { marginBottom: 12 }]}>
          <View style={[styles.alertHeader, { backgroundColor: borderColor, opacity: 0.15 }]}>
            <Ionicons name={icon} size={18} color={borderColor} style={{ marginRight: 8 }} />
            <Text style={[styles.alertTitle, { color: borderColor }]}>
              {title} ({items.length})
            </Text>
          </View>
          <View style={styles.alertGridWeb}>
            {items.map((task, idx) => renderWebCard(task, idx, backgroundColor))}
          </View>
        </View>
      );
    }

    // Scroll horizontal en móvil
    return (
      <View key={type} style={[styles.alertSection, { marginBottom: 12 }]}>
        <View style={[styles.alertHeader, { backgroundColor: borderColor, opacity: 0.15 }]}>
          <Ionicons name={icon} size={18} color={borderColor} style={{ marginRight: 8 }} />
          <Text style={[styles.alertTitle, { color: borderColor }]}>
            {title} ({items.length})
          </Text>
        </View>
        <View style={styles.cardScrollContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.cardScroll}
            contentContainerStyle={{ paddingRight: 8 }}
            scrollEnabled={items.length > 1}
          >
            {items.map((task, idx) => renderMobileCard(task, idx, backgroundColor))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tareas vencidas */}
      {renderAlertCard(
        'overdue',
        overdue,
        'Vencidas',
        'alert-circle',
        '#FF3B30',
        '#FF3B30'
      )}

      {/* Tareas urgentes (< 6 horas) */}
      {renderAlertCard(
        'urgent',
        urgent,
        'Tareas Urgentes',
        'time',
        '#FF9500',
        '#FF9500'
      )}

      {/* Próximo vencimiento (< 24 horas) */}
      {renderAlertCard(
        'soonDue',
        soonDue,
        'Próximas a vencer',
        'alert',
        '#FFCC00',
        '#FFCC00'
      )}

      {/* Próximas (< 7 días) */}
      {renderAlertCard(
        'upcoming',
        upcoming,
        'Próximas semana',
        'calendar',
        '#00C853',
        '#00C853'
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    width: '100%',
  },
  alertSection: {
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // ========== ESTILOS PARA WEB (GRID) ==========
  alertGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  alertCardWeb: {
    borderRadius: 10,
    padding: 10,
    width: '31.333%',
    minWidth: 180,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  cardTaskTitleWeb: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDateWeb: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardTimeWeb: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardBadgeWeb: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  badgeTextWeb: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ========== ESTILOS PARA MÓVIL (SCROLL) ==========
  cardScrollContainer: {
    maxWidth: '100%',
    overflow: 'hidden',
  },
  cardScroll: {
    paddingHorizontal: 0,
    paddingLeft: 8,
  },
  alertCard: {
    borderRadius: 12,
    padding: 12,
    minWidth: 240,
    maxWidth: 280,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginRight: 8,
    flexShrink: 0,
  },
  cardTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
