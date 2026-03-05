// screens/NotificationsScreen.js
// Pantalla de notificaciones con historial y acciones

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { toMs } from '../utils/dateUtils';
import { getMyNotifications, markNotificationAsRead, deleteNotification } from '../services/notificationsAdvanced';
import LoadingIndicator from '../components/LoadingIndicator';
import Toast from '../components/Toast';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

export default function NotificationsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, tasks, areas
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getMyNotifications(100);
      setNotifications(data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      setToastMessage('Error al cargar notificaciones');
      setShowToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    // Marcar como leída
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Error marcando como leída:', error);
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

  const getFilteredNotifications = () => {
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
  };

  const handleDeleteNotification = async (notificationId, notificationTitle) => {
    // En web, Alert.alert no funciona - usar confirm nativo
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Deseas eliminar "${notificationTitle}"?`);
      if (confirmed) {
        try {
          console.log('Eliminando notificación (web):', notificationId);
          await deleteNotification(notificationId);
          await loadNotifications();
          setToastMessage('Notificación eliminada');
          setShowToast(true);
        } catch (error) {
          console.error('Error eliminando notificación:', error);
          setToastMessage(`Error: ${error.message || 'No se pudo eliminar'}`);
          setShowToast(true);
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
                console.log('Eliminando notificación (móvil):', notificationId);
                await deleteNotification(notificationId);
                await loadNotifications();
                setToastMessage('Notificación eliminada');
                setShowToast(true);
              } catch (error) {
                console.error('Error eliminando notificación:', error);
                setToastMessage(`Error: ${error.message || 'No se pudo eliminar'}`);
                setShowToast(true);
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

  const filteredNotifications = getFilteredNotifications();

  const renderNotification = ({ item }) => {
    const onDeletePress = (e) => {
      // Prevenir propagación del evento
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      handleDeleteNotification(item.id, item.title);
    };

    const onCardPress = () => {
      handleNotificationPress(item);
    };

    return (
      <View
        style={[
          styles.notificationCard,
          {
            backgroundColor: item.read
              ? isDark
                ? '#1a1a1f'
                : '#f9f9fb'
              : isDark
              ? '#2a2a2e'
              : '#f0f0f5',
            borderColor: item.read ? theme.border : getNotificationColor(item.type),
            borderLeftWidth: item.read ? 1 : 4,
          },
        ]}
      >
        <Pressable
          onPress={onCardPress}
          style={({ pressed }) => [
            styles.notificationTouchable,
            pressed && { opacity: 0.7 }
          ]}
        >
          <View
            style={[
              styles.notificationIcon,
              {
                backgroundColor: getNotificationColor(item.type) + '20',
              },
            ]}
          >
            <Ionicons
              name={getNotificationIcon(item.type)}
              size={20}
              color={getNotificationColor(item.type)}
            />
          </View>

          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: theme.text,
                  fontWeight: item.read ? '600' : '700',
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationBody,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              {item.body}
            </Text>
            <Text
              style={[
                styles.notificationTime,
                {
                  color: theme.textTertiary,
                },
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
          </View>

          {!item.read && (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: getNotificationColor(item.type),
                },
              ]}
            />
          )}
        </Pressable>

        <Pressable
          onPress={onDeletePress}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && { opacity: 0.5, transform: [{ scale: 0.95 }] }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingIndicator />
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
              {filteredNotifications.length} notificaciones
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        {['all', 'unread', 'tasks', 'areas'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
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
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de notificaciones */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {filter === 'all' ? 'Sin notificaciones' : 'Sin notificaciones en esta categoría'}
          </Text>
        </View>
      )}

      <Toast visible={showToast} message={toastMessage} onDismiss={() => setShowToast(false)} />
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
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
