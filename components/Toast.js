// components/Toast.js
// Componente de Toast para feedback visual de acciones
// Versión compatible con web y mobile
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ 
  message, 
  type = 'success', 
  visible, 
  onHide, 
  duration = 3000,
  action = null
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Disable native driver on web
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: useNativeDriver,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: useNativeDriver
        })
      ]).start();

      // Hide automatically after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: useNativeDriver
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: useNativeDriver
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return '#34C759';
      case 'error': return '#FF3B30';
      case 'warning': return '#FF9500';
      case 'info': return '#5856D6';
      default: return '#34C759';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: getColor()
        }
      ]}
    >
      <Ionicons name={getIcon()} size={24} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      
      {action && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            hideToast();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999
  },
  icon: {
    marginRight: 12
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  actionButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  }
});

export default Toast;
