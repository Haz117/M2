// screens/NotificationsScreen.js
// Pantalla de notificaciones con historial y acciones

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ListRenderItem,
  FlatList,
  Platform,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';
import { getMyNotifications, markNotificationAsRead, deleteNotification } from '../services/notificationsAdvanced';
import { hapticSuccess, hapticLight, hapticWarning } from '../utils/haptics';
import ShimmerEffect from '../components/ShimmerEffect';
import { getSwipeable } from '../utils/platformComponents';
const Swipeable = getSwipeable();
import { useNotification } from '../contexts/NotificationContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

const NotificationCard = React.memo(({ item, onPress, onDelete, theme, isDark, getColor, getIcon }) => (
  <View
    style={[
      cardStyles.notificationCard,
      {
        backgroundColor: item.read ? (isDark ? '#1a1a1f' : '#f9f9fb') : (isDark ? '#2a2a2e' : '#f0f0f5'),
        borderColor: item.read ? theme.border : getColor(item.type),
        borderLeftWidth: item.read ? 1 : 4,
      },
    ]}
  >
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={item.read ? 'Ver detalles' : 'Marcar como leída y ver detalles'}
      style={({ pressed }) => [cardStyles.notificationTouchable, pressed && { opacity: 0.7 }]}
    >
      <View style={[cardStyles.notificationIcon, { backgroundColor: getColor(item.type) + '20' }]}>
        <Ionicons name={getIcon(item.type)} size={20} color={getColor(item.type)} />
      </View>
      <View style={cardStyles.notificationContent}>
        <Text style={[cardStyles.notificationTitle, { color: theme.text, fontWeight: item.read ? '600' : '700' }]}>
          {item.title}
        </Text>
        <Text style={[cardStyles.notificationBody, { color: theme.textSecondary }]}>{item.body}</Text>
        <Text style={[cardStyles.notificationTime, { color: theme.textTertiary }]}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={[cardStyles.unreadBadge, { backgroundColor: getColor(item.type) }]} />}
    </Pressable>
    {Platform.OS === 'web' && (
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Eliminar notificación"
        style={({ pressed }) => [cardStyles.deleteButton, pressed && { opacity: 0.5, transform: [{ scale: 0.95 }] }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
      </Pressable>
    )}
  </View>
));

export default function NotificationsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { showError, showSuccess } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, tasks, areas

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setError(false);
      setLoading(true);
      const data = await getMyNotifications(100);
      setNotifications(data);
    } catch (err) {
      if (__DEV__) console.error('Error cargando notificaciones:', err);
      setError(true);
      showError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    hapticSuccess();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(unread.map((n) => markNotificationAsRead(n.id)));
      showSuccess(`${unread.length} notificaciones marcadas como leídas`);
    } catch (err) {
      if (__DEV__) console.error('Error marcando todas como leídas:', err);
      await loadNotifications();
      showError('Error al marcar como leídas');
    }
  }, [notifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    hapticLight();
    // Marcar como leída
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        if (__DEV__) console.error('Error marcando como leída:', error);
      }
    }

    // Navegar según tipo
    if (notification.type === 'new_report' && notification.taskId) {
      navigation.navigate('TaskReportsAndActivity', { 
        taskId: notification.taskId,
        taskTitle: 'Reporte'
      });
    } else if (notification.taskId && notification.type === 'task_assigned') {
      navigation.navigate('TaskProgress', { taskId: notification.taskId });
    } else if (notification.areaId && notification.type === 'area_created') {
      navigation.navigate('AreaManagement');
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'tasks':
        return notifications.filter((n) => n.type.includes('task'));
      case 'areas':
        return notifications.filter((n) => n.type.includes('area'));
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const handleDeleteNotification = async (notificationId, notificationTitle) => {
    // En web, Alert.alert no funciona - usar confirm nativo
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Deseas eliminar "${notificationTitle}"?`);
      if (confirmed) {
        try {
          await deleteNotification(notificationId);
          await loadNotifications();
          showSuccess('Notificación eliminada');
        } catch (error) {
          if (__DEV__) console.error('Error eliminando notificación:', error);
          showError(`Error: ${error.message || 'No se pudo eliminar'}`);
        }
      }
    } else {
      // En móvil, usar Alert nativo
      Alert.alert(
        'Eliminar notificación',
        `¿Deseas eliminar "${notificationTitle}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            onPress: async () => {
              try {
                await deleteNotification(notificationId);
                await loadNotifications();
                showSuccess('Notificación eliminada');
              } catch (error) {
                if (__DEV__) console.error('Error eliminando notificación:', error);
                showError(`Error: ${error.message || 'No se pudo eliminar'}`);
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return 'checkbox-outline';
      case 'subtask_completed':
        return 'checkmark-circle';
      case 'task_due_soon':
        return 'time';
      case 'area_created':
        return 'folder';
      case 'area_chief_assigned':
        return 'person-circle';
      case 'new_report':
        return 'document-text';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'subtask_completed':
        return '#34C759';
      case 'task_due_soon':
        return '#FF9500';
      case 'area_created':
        return '#9F2241';
      case 'area_chief_assigned':
        return '#5E72E4';
      case 'new_report':
        return '#3B82F6';
      default:
        return theme.primary;
    }
  };

  const renderNotifSwipeActions = useCallback((progress, dragX, item) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={{ transform: [{ translateX: trans }], justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => handleDeleteNotification(item.id, item.title)}
          style={{
            backgroundColor: '#FF3B30',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            height: '100%',
            borderRadius: 12,
          }}
          accessibilityLabel="Eliminar notificación"
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleDeleteNotification]);

  const renderNotification = useCallback(({ item }) => {
    const card = (
      <NotificationCard
        item={item}
        onPress={() => handleNotificationPress(item)}
        onDelete={() => handleDeleteNotification(item.id, item.title)}
        theme={theme}
        isDark={isDark}
        getColor={getNotificationColor}
        getIcon={getNotificationIcon}
      />
    );

    if (Platform.OS === 'web') return card;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) =>
          renderNotifSwipeActions(progress, dragX, item)
        }
        friction={2}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    );
  }, [handleNotificationPress, handleDeleteNotification, theme, isDark, renderNotifSwipeActions]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingHorizontal: 16, paddingTop: 60 }]}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ShimmerEffect width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 8 }}>
              <ShimmerEffect width="70%" height={14} borderRadius={6} />
              <ShimmerEffect width="45%" height={12} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.primary, theme.primary + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Notificaciones</Text>
            <Text style={styles.subtitle}>
              {filteredNotifications.length} notificacion{filteredNotifications.length !== 1 ? 'es' : ''}
              {unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={handleMarkAllAsRead}
                accessibilityLabel="Marcar todas como leídas"
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityLabel="Cerrar notificaciones" accessibilityRole="button">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {['all', 'unread', 'tasks', 'areas'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            accessibilityLabel={f === 'all' ? 'Todas' : f === 'unread' ? 'No leídas' : f === 'tasks' ? 'Tareas' : 'Áreas'}
            style={[
              styles.filterButton,
              filter === f && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
              {
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[
                  styles.filterLabel,
                  filter === f && { color: '#FFFFFF' },
                  { color: filter === f ? '#FFFFFF' : theme.text },
                ]}
              >
                {f === 'all'
                  ? 'Todas'
                  : f === 'unread'
                  ? 'No leídas'
                  : f === 'tasks'
                  ? 'Tareas'
                  : 'Áreas'}
              </Text>
              {f === 'unread' && unreadCount > 0 && (
                <View style={[styles.unreadBadgeFilter, { backgroundColor: filter === 'unread' ? 'rgba(255,255,255,0.3)' : theme.primary }]}>
                  <Text style={styles.unreadBadgeFilterText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de notificaciones */}
      {error ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? '#1E1E22' : '#FFF0EE' }]}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Error de conexión</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>No se pudieron cargar las notificaciones.</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadNotifications}
            accessibilityLabel="Reintentar"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          scrollEnabled={true}
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={10}
          removeClippedSubviews={true}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? '#1E1E22' : '#F5F5F7' }]}>
            <Ionicons name="notifications-off-outline" size={48} color={isDark ? '#444' : '#C7C7CC'} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {filter === 'all' ? 'Sin notificaciones' : 'Sin notificaciones aquí'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {filter === 'unread' ? 'Estás al día, todo leído.' :
             filter === 'tasks' ? 'No hay notificaciones de tareas.' :
             filter === 'areas' ? 'No hay notificaciones de áreas.' :
             'Las notificaciones aparecerán aquí cuando tengas actividad.'}
          </Text>
        </View>
      )}

      </View>
    </View>
  );
}

const formatTime = (timestamp) => {
  if (!timestamp) return '';

  const date = new Date(toMs(timestamp));
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;

  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  notificationTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 8,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  notificationBody: {
    fontSize: 12,
  },
  notificationTime: {
    fontSize: 11,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    zIndex: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  unreadBadgeFilter: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeFilterText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

// Static styles for NotificationCard (no theme dependency — theme passed as prop)
const cardStyles = StyleSheet.create({
  notificationCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  notificationTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 8,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  notificationBody: {
    fontSize: 12,
  },
  notificationTime: {
    fontSize: 11,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    zIndex: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
});
