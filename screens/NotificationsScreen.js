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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { getMyNotifications, markNotificationAsRead } from '../services/notificationsAdvanced';
import LoadingIndicator from '../components/LoadingIndicator';
import Toast from '../components/Toast';

export default function NotificationsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
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

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
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
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
  );
}

const formatTime = (timestamp) => {
  if (!timestamp) return '';

  const date = new Date(timestamp.toMillis?.() || timestamp);
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
    alignItems: 'flex-start',
    gap: 12,
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
