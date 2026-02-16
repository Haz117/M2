// components/NotificationsBell.js
// Botón de notificaciones con badge

import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyNotifications } from '../services/notificationsAdvanced';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationsBell({ onPress, theme }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    // Recargar cada 30 segundos
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const notifications = await getMyNotifications(100);
      const unread = notifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        onPress();
        // Recargar cuando se toca
        loadUnreadCount();
      }}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications" size={24} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
