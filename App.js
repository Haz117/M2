// App.js - VERSIÓN COMPLETA CON TABS - Compatible con web
import './polyfills'; // Debe ser lo primero
import 'react-native-gesture-handler';

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Platform, StatusBar, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TasksProvider } from './contexts/TasksContext';
import { getGestureHandlerRootView } from './utils/platformComponents';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import KanbanScreen from './screens/KanbanScreen';
import CalendarScreen from './screens/CalendarScreen';
import DashboardScreen from './screens/DashboardScreen';
import AdminScreen from './screens/AdminScreen';
import MyInboxScreen from './screens/MyInboxScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import TaskChatScreen from './screens/TaskChatScreen';
import TaskProgressScreen from './screens/TaskProgressScreen';
import ReportsScreen from './screens/ReportsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AreaChiefDashboard from './screens/AreaChiefDashboard';
import AreaManagementScreen from './screens/area/AreaManagementScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import TaskReportsAndActivityScreen from './screens/TaskReportsAndActivityScreen';
import { getCurrentSession, logoutUser } from './services/authFirestore';
import { startConnectivityMonitoring } from './services/offlineQueue';
import { setupNotificationResponseListener } from './services/notifications';
import { registerPushToken, setupPushNotificationListener } from './services/pushNotifications';
import { initConnectionListener, syncPendingOperations, clearOfflineData } from './services/offlineSync';
import OfflineIndicator from './components/OfflineIndicator';

// Vercel Analytics y Speed Insights (solo en web)
let Analytics, SpeedInsights;
if (Platform.OS === 'web') {
  try {
    Analytics = require('@vercel/analytics/react').Analytics;
    SpeedInsights = require('@vercel/speed-insights/react').SpeedInsights;
  } catch (e) {
    // Vercel analytics not available
  }
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GestureHandlerRootView = getGestureHandlerRootView();

// Referencia global de navegación
let globalNavigationRef = null;

// Tab Navigator con todas las pantallas
function MainTabs({ onLogout }) {
  const { theme, isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Obtener sesión actual solo una vez al montar
  useEffect(() => {
    let mounted = true;
    getCurrentSession().then((result) => {
      if (result.success && mounted) {
        setCurrentUser(result.session);
        // Inicializar notificaciones locales
        const { configureNotifications } = require('./services/notificationsAdvanced');
        configureNotifications().catch(console.error);
        
        // Registrar push notification token para FCM
        const { registerPushToken, setupPushNotificationListener } = require('./services/pushNotifications');
        registerPushToken(result.session.uid).catch((err) => {
          console.warn('Push token registration skipped (non-critical):', err.message);
        });
        
        // Setup push notification listener
        const unsubPush = setupPushNotificationListener((notification) => {
          console.log('Push notification received:', notification);
          // Toast de notificación
          Toast.show({
            type: 'success',
            text1: notification.title,
            text2: notification.body,
            position: 'top'
          });
        });
        
        return () => unsubPush?.();
      }
    });
    return () => { mounted = false; };
  }, []);

  // Suscribirse a tareas solo cuando currentUser esté disponible
  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    const { subscribeToTasks } = require('./services/tasks');
    
    const unsubscribe = subscribeToTasks((tasks) => {
      if (!mounted) return;
      
      let userOverdue = [];
      if (currentUser.role === 'admin') {
        userOverdue = tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada');
      } else {
        userOverdue = tasks.filter(t => 
          t.dueAt < Date.now() && 
          t.status !== 'cerrada' && 
          t.assignedTo === currentUser.email
        );
      }
      
      const newCount = userOverdue.length;
      setOverdueCount(newCount);
      
      // Actualizar badge de app (solo si cambió)
      try {
        const Notifications = require('expo-notifications');
        Notifications.default?.setBadgeCountAsync(newCount).catch(() => {});
      } catch (error) {
        // Ignorar si no está disponible
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser?.email, currentUser?.role]);

  const isAdmin = currentUser?.role === 'admin';
  const isSecretario = currentUser?.role === 'secretario';
  const isDirector = currentUser?.role === 'director';
  const isJefe = currentUser?.role === 'jefe';
  const canSeeReports = isAdmin || isSecretario || isDirector || isJefe;

  // Función para obtener el label del rol
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'secretario': return 'Secretario';
      case 'director': return 'Director';
      case 'jefe': return 'Jefe';
      default: return 'Operativo';
    }
  };

  // Función para obtener el color del badge por rol
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#DC2626';
      case 'secretario': return '#9F2241';
      case 'director': return '#235B4E';
      case 'jefe': return '#06B6D4';
      default: return '#3B82F6';
    }
  };

  // Función para obtener el icono del rol
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'shield-checkmark';
      case 'secretario': return 'briefcase';
      case 'director': return 'business';
      case 'jefe': return 'ribbon';
      default: return 'person';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header con usuario y botón de logout */}
      {currentUser && (
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[
              styles.roleBadge, 
              { backgroundColor: getRoleBadgeColor(currentUser.role) }
            ]}>
              <Ionicons 
                name={getRoleIcon(currentUser.role)} 
                size={12} 
                color="#FFFFFF" 
                style={{ marginRight: 4 }}
              />
              <Text style={styles.roleBadgeText}>
                {getRoleLabel(currentUser.role)}
              </Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{currentUser.displayName || currentUser.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!onLogout) {
                alert('Error: No se puede cerrar sesión');
                return;
              }
              
              onLogout();
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#9F2241" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Kanban') iconName = focused ? 'apps' : 'apps-outline';
            else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
            else if (route.name === 'Reports') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            else if (route.name === 'Admin') iconName = focused ? 'settings' : 'settings-outline';
            else if (route.name === 'Inbox') iconName = focused ? 'file-tray-full' : 'file-tray-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 85 : 70,
            paddingBottom: Platform.OS === 'ios' ? 25 : 12,
            paddingTop: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: 0.3,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          // Animaciones entre tabs
          tabBarHideOnKeyboard: true,
          animation: 'fade',
          animationDuration: 250,
        })}
      >
      <Tab.Screen 
        name="Home" 
        options={{ 
          title: 'Inicio',
        }}
      >
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Kanban" 
        options={{ title: 'Tablero' }} 
        component={KanbanScreen} 
      />
      
      <Tab.Screen 
        name="Calendar" 
        options={{ title: 'Calendario' }} 
        component={CalendarScreen} 
      />
      
      <Tab.Screen 
        name="Inbox" 
        options={{ 
          title: 'Bandeja',
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          tabBarBadgeStyle: { 
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: theme.card,
            top: -2
          }
        }} 
        component={MyInboxScreen} 
      />
      
      {canSeeReports && (
        <Tab.Screen 
          name="Reports" 
          options={{ title: 'Reportes' }} 
          component={ReportsScreen} 
        />
      )}
      
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          options={{ title: 'Admin' }}
        >
          {(props) => <AdminScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const navigationRef = useRef(null);
  
  // Función de logout que maneja todo el proceso
  const handleLogout = async () => {
    try {
      // Limpiar sesión de AsyncStorage
      await logoutUser();
      
      // Limpiar cache offline
      await clearOfflineData();
      
      // Forzar actualización completa
      setIsAuthenticated(false);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
      
      // Toast de confirmación
      Toast.show({
        type: 'success',
        text1: 'Sesión cerrada',
        text2: 'Has cerrado sesión exitosamente',
        position: 'top'
      });
      
    } catch (error) {
      // Forzar logout incluso con error
      setIsAuthenticated(false);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    let mounted = true;
    
    // Iniciar monitoreo de conectividad para sincronización offline
    const unsubscribeConnectivity = startConnectivityMonitoring();
    
    // 🌐 Inicializar listener de conexión para sincronización offline-first
    const unsubscribeConnection = initConnectionListener();
    
    // 🔔 Setup del listener de respuestas de notificaciones
    const notificationSubscription = setupNotificationResponseListener();
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2000);
    
    getCurrentSession()
      .then((result) => {
        if (mounted) {
          setIsAuthenticated(result.success);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      });
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribeConnectivity) unsubscribeConnectivity();
      if (unsubscribeConnection) unsubscribeConnection();
      if (notificationSubscription) notificationSubscription.remove();
    };
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }
  
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Indicador de estado offline */}
        {isAuthenticated && <OfflineIndicator />}
        
        <NavigationContainer ref={navigationRef} key={`navigation-${forceUpdate}`}>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 250,
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen 
                name="Login"
                options={{ animation: 'fade' }}
              >
                {(props) => (
                  <LoginScreen 
                    {...props} 
                    onLogin={() => {
                      setIsAuthenticated(true);
                      setForceUpdate(prev => prev + 1);
                    }} 
                  />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen 
                  name="Main"
                  options={{ animation: 'fade' }}
                >
                  {(props) => (
                    <TasksProvider>
                      <MainTabs 
                        {...props}
                        onLogout={handleLogout}
                      />
                    </TasksProvider>
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskDetail" 
                  component={TaskDetailScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="TaskChat" 
                  component={TaskChatScreen}
                  options={{ 
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                  }}
                />
                <Stack.Screen 
                  name="TaskProgress" 
                  component={TaskProgressScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="AreaManagement" 
                  component={AreaManagementScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="Notifications" 
                  component={NotificationsScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="AreaChiefDashboard" 
                  component={AreaChiefDashboard}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="Analytics" 
                  component={AnalyticsScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="TaskReportsAndActivity" 
                  component={TaskReportsAndActivityScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <Toast />
        {/* Vercel Analytics - Solo en web */}
        {Platform.OS === 'web' && Analytics && <Analytics />}
        {Platform.OS === 'web' && SpeedInsights && <SpeedInsights />}
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9F2241',
    fontWeight: '600'
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 45,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  roleBadgeAdmin: {
    backgroundColor: '#9F2241'
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  userName: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  logoutText: {
    fontSize: 12,
    color: '#9F2241',
    fontWeight: '700'
  }
});
