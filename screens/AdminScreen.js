// screens/AdminScreen.js
// Pantalla de configuración y administración
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated, Platform, Modal, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { getCurrentSession, logoutUser, isAdmin, registerUser } from '../services/authFirestore';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import OverdueAlert from '../components/OverdueAlert';
import ShimmerEffect from '../components/ShimmerEffect';
import { toMs } from '../utils/dateUtils';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

const ROLE_LABELS = { director: 'Director', secretario: 'Secretario', admin: 'Admin', otros: 'Otros' };
const ROLE_COLORS = { director: '#0EA5E9', secretario: '#8B5CF6', admin: '#EF4444', otros: '#F59E0B' };

export default function AdminScreen({ navigation, onLogout }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const { isDesktop } = useResponsive();
  const { tasks } = useTasks();
  const { showSuccess, showError, showWarning } = useNotification();
  const [notificationCount, setNotificationCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('director');
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);

  // Disable animations on web for compatibility
  const supportsNativeDriver = Platform.OS !== 'web';

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(supportsNativeDriver ? 0 : 1)).current;
  const headerSlide = useRef(new Animated.Value(supportsNativeDriver ? -20 : 0)).current;
  const statsOpacity = useRef(new Animated.Value(supportsNativeDriver ? 0 : 1)).current;
  const statsSlide = useRef(new Animated.Value(supportsNativeDriver ? 30 : 0)).current;
  const formOpacity = useRef(new Animated.Value(supportsNativeDriver ? 0 : 1)).current;
  const formSlide = useRef(new Animated.Value(supportsNativeDriver ? 30 : 0)).current;
  const usersOpacity = useRef(new Animated.Value(supportsNativeDriver ? 0 : 1)).current;
  const usersSlide = useRef(new Animated.Value(supportsNativeDriver ? 30 : 0)).current;

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadCurrentUser();
        await loadNotificationCount();
        await loadAllUsers();
      } catch (error) {
        showError('Error al cargar datos de administración');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Conteos de usuarios por rol — memoizados para evitar filter() en cada render
  const userCounts = useMemo(() => ({
    secretarios: allUsers.filter(u => u.role === 'secretario').length,
    directores: allUsers.filter(u => u.role === 'director').length,
    operativos: allUsers.filter(u => !['secretario', 'director', 'admin'].includes(u.role)).length,
    admins: allUsers.filter(u => u.role === 'admin').length,
  }), [allUsers]);

  // Detectar tareas urgentes desde el contexto global (sin suscripción extra)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000;
    const urgent = tasks.filter(task => {
      if (task.status === 'cerrada' || !task.dueAt) return false;
      const due = toMs(task.dueAt);
      const timeLeft = due - now;
      return timeLeft > 0 && timeLeft < sixHours;
    });
    if (urgent.length > 0) {
      setUrgentTasks(urgent);
      setShowUrgentModal(true);
    }
  }, [tasks]);

  // Removed duplicate useEffect - new one handles data loading
  
  const loadCurrentUser = async () => {
    try {
      const result = await getCurrentSession();
      if (result.success && result.session) {
        setCurrentUser(result.session);
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
      } else {
        showWarning('No hay sesión activa. Inicia sesión primero');
      }
    } catch (error) {
      showError('Error al cargar usuario');
    }
  };

  const loadNotificationCount = async () => {
    try {
      const notifications = await getAllScheduledNotifications();
      if (Array.isArray(notifications)) {
        setNotificationCount(notifications.length);
      } else {
        setNotificationCount(0);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading notifications:', error);
      setNotificationCount(0);
    }
  };

  const loadAllUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      if (querySnapshot.empty) {
        setAllUsers([]);
      } else {
        const users = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || new Date(),
            active: data.active !== false // Default to active if not specified
          };
        });
        setAllUsers(users);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const resetUserPassword = async () => {
    if (!resetEmail.trim() || !newPassword.trim()) {
      showError('Por favor completa email y nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      showWarning('Solo los administradores pueden resetear contraseñas');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', resetEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showError('Usuario no encontrado');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const simpleHash = (text) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      };

      const hashedPassword = simpleHash(newPassword + resetEmail.toLowerCase());
      await updateDoc(doc(db, 'users', userDoc.id), {
        password: hashedPassword
      });

      showSuccess('La contraseña ha sido actualizada');
      setResetEmail('');
      setNewPassword('');
    } catch (error) {
      showError('No se pudo resetear la contraseña: ' + error.message);
    }
  };

  const deleteUserAccount = (userId, userName) => {
    if (userId === currentUser?.userId) {
      showWarning('No puedes eliminar tu propia cuenta');
      return;
    }
    Alert.alert(
      'Eliminar Cuenta',
      `¿Eliminar la cuenta de ${userName}?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticMedium();
              await deleteDoc(doc(db, 'users', userId));
              showSuccess(`Cuenta de ${userName} eliminada`);
              loadAllUsers();
            } catch (error) {
              showError('No se pudo eliminar: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const changeUserRole = async (userId, newRole, userName) => {
    if (userId === currentUser?.userId) {
      showWarning('No puedes cambiar tu propio rol');
      return;
    }
    try {
      hapticLight();
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showSuccess(`${userName} ahora es ${ROLE_LABELS[newRole]}`);
      setEditingRoleUserId(null);
      loadAllUsers();
    } catch (error) {
      showError('No se pudo cambiar el rol: ' + error.message);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const createUser = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      showError('Por favor completa nombre, email y contraseña');
      return;
    }

    if (!validateEmail(userEmail.trim())) {
      showError('Por favor ingresa un email válido');
      return;
    }

    if (userPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      showWarning('Solo los administradores pueden crear usuarios');
      return;
    }

    try {
      const result = await registerUser(userEmail.trim(), userPassword, userName.trim(), userRole);

      if (result.success) {
        showSuccess(`${userName} ha sido agregado como ${userRole}`);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setUserRole('director');
        loadAllUsers(); // Recargar lista
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('No se pudo crear el usuario: ' + error.message);
    }
  };

  const testNotification = async () => {
    try {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Permisos Denegados', 
          'Las notificaciones push no están disponibles en Expo Go. Para probarlas necesitas crear un build de desarrollo.'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notificación de Prueba',
          body: 'Esta es una notificación de prueba del sistema TODO',
          data: { type: 'test' },
          sound: true,
        },
        trigger: { seconds: 2 }
      });

      Alert.alert(
        'Notificación Programada', 
        'Recibirás una notificación en 2 segundos.\n\nNOTA: Las notificaciones push no funcionan en Expo Go, pero se guardan para builds nativos.'
      );
      
      // Actualizar contador
      setTimeout(() => loadNotificationCount(), 100);
    } catch (error) {
      Alert.alert(
        'Información', 
        'Las notificaciones push no están disponibles en Expo Go.\n\nPara usarlas necesitas crear un build de desarrollo con:\n\neas build --profile development --platform android'
      );
    }
  };

  const viewScheduledNotifications = async () => {
    const notifications = await getAllScheduledNotifications();
    if (notifications.length === 0) {
      Alert.alert('Sin Notificaciones', 'No hay notificaciones programadas');
    } else {
      Alert.alert(
        'Notificaciones Programadas',
        `Total: ${notifications.length}\n\n${notifications.slice(0, 5).map((n, i) => 
          `${i+1}. ${n.content.title}`
        ).join('\n')}${notifications.length > 5 ? `\n\n...y ${notifications.length - 5} más` : ''}`
      );
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Confirmar',
      '¿Cancelar TODAS las notificaciones programadas?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar todo',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            setNotificationCount(0);
            Alert.alert('Completado', 'Todas las notificaciones han sido canceladas');
          }
        }
      ]
    );
  };

  // Show shimmer while fetching data
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header shimmer */}
        <ShimmerEffect width="100%" height={110} borderRadius={0} style={{ marginBottom: 16 }} />
        {/* Stat cards row 1 */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 }}>
          {[1,2,3].map(i => <ShimmerEffect key={i} width="30%" height={90} borderRadius={12} />)}
        </View>
        {/* Stat cards row 2 */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 }}>
          {[1,2,3].map(i => <ShimmerEffect key={i} width="30%" height={90} borderRadius={12} />)}
        </View>
        {/* Section rows */}
        {[1,2,3,4].map(i => (
          <ShimmerEffect key={i} width="90%" height={56} borderRadius={12} style={{ marginHorizontal: 16, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  // Show error if no user session
  if (!currentUser) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={60} color={theme.text} style={{ marginBottom: 16, opacity: 0.5 }} />
        <Text style={[styles.loadingText, { color: theme.text, marginBottom: 24 }]}>No hay sesión activa</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Ir a Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Modal de Tareas Urgentes */}
      <Modal
        visible={showUrgentModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUrgentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.urgentModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.urgentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={32} color="#FF3B30" style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.urgentModalTitle, { color: theme.text }]}>¡Alerta Urgente!</Text>
                  <Text style={[styles.urgentModalSubtitle, { color: theme.textSecondary }]}>
                    Tareas críticas próximas a vencer
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.urgentModalScroll}>
              {urgentTasks.map((task) => {
                const timeLeft = toMs(task.dueAt) - Date.now();
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.urgentTaskCard, { 
                      backgroundColor: theme.surface,
                      borderColor: hoursLeft < 2 ? '#FF3B30' : '#FF9500'
                    }]}
                    onPress={() => {
                      setShowUrgentModal(false);
                      navigation.navigate('Home');
                    }}
                  >
                    <View style={styles.urgentTaskHeader}>
                      <Ionicons 
                        name={hoursLeft < 2 ? "alert-circle" : "time"} 
                        size={28} 
                        color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} 
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.urgentTaskTitle, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Ionicons name="location" size={14} color={theme.textSecondary} />
                          <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                            {task.area}
                          </Text>
                          <Ionicons name="person" size={14} color={theme.textSecondary} />
                          <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                            {task.assignedTo}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.urgentTaskTimer, { 
                      backgroundColor: hoursLeft < 2 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)' 
                    }]}>
                      <Ionicons name="hourglass" size={18} color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? '#FF3B30' : '#FF9500' 
                      }]}>
                        {hoursLeft}h {minutesLeft}m restantes
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.urgentModalFooter}>
              <TouchableOpacity 
                style={[styles.urgentModalButton, { backgroundColor: '#FF3B30' }]}
                onPress={() => setShowUrgentModal(false)}
              >
                <Text style={styles.urgentModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Flujo del Sistema */}
      <Modal
        visible={showFlowModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFlowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.flowModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.flowModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LinearGradient
                  colors={['#9F2241', '#7D1A33']}
                  style={[styles.iconCircleSection, { marginRight: 12 }]}
                >
                  <Ionicons name="git-network" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.flowModalTitle, { color: theme.text }]}>Flujo del Sistema</Text>
                  <Text style={[styles.flowModalSubtitle, { color: theme.textSecondary }]}>
                    Guía de funcionamiento
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowFlowModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.flowModalScroll} showsVerticalScrollIndicator={false}>
              {/* Jerarquía de Roles */}
              <View style={[styles.flowSection, { backgroundColor: isDark ? '#1E1E23' : '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={[styles.flowTitle, { color: theme.text }]}>👥 Jerarquía de Roles</Text>
                
                <View style={styles.hierarchyContainer}>
                  <View style={[styles.roleBox, { backgroundColor: '#DC2626' }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.roleBoxText}>ADMIN</Text>
                    <Text style={styles.roleBoxDesc}>Ve TODO</Text>
                  </View>
                  
                  <Ionicons name="arrow-down" size={24} color={theme.textSecondary} style={{ alignSelf: 'center', marginVertical: 8 }} />
                  
                  <View style={styles.roleRow}>
                    <View style={[styles.roleBoxSmall, { backgroundColor: theme.primary }]}>
                      <Text style={styles.roleBoxTextSmall}>SECRETARIO</Text>
                      <Text style={styles.roleBoxDescSmall}>Ve su área</Text>
                    </View>
                    <View style={[styles.roleBoxSmall, { backgroundColor: theme.primary }]}>
                      <Text style={styles.roleBoxTextSmall}>SECRETARIO</Text>
                      <Text style={styles.roleBoxDescSmall}>Ve su área</Text>
                    </View>
                  </View>
                  
                  <Ionicons name="arrow-down" size={24} color={theme.textSecondary} style={{ alignSelf: 'center', marginVertical: 8 }} />
                  
                  <View style={styles.roleRow}>
                    <View style={[styles.roleBoxSmall, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.roleBoxTextSmall}>DIRECTOR</Text>
                      <Text style={styles.roleBoxDescSmall}>Ve su área</Text>
                    </View>
                    <View style={[styles.roleBoxSmall, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.roleBoxTextSmall}>DIRECTOR</Text>
                      <Text style={styles.roleBoxDescSmall}>Ve su área</Text>
                    </View>
                    <View style={[styles.roleBoxSmall, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.roleBoxTextSmall}>DIRECTOR</Text>
                      <Text style={styles.roleBoxDescSmall}>Ve su área</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.flowInfo, { backgroundColor: isDark ? '#2A2A30' : '#E8F4FD', marginTop: 12 }]}>
                  <Ionicons name="information-circle" size={18} color="#3B82F6" />
                  <Text style={[styles.flowInfoText, { color: theme.textSecondary }]}>
                    7 Secretarías • 35 Directores registrados
                  </Text>
                </View>
              </View>

              {/* Flujo de Tareas */}
              <View style={[styles.flowSection, { backgroundColor: isDark ? '#1E1E23' : '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={[styles.flowTitle, { color: theme.text }]}>📋 Flujo de Tareas</Text>
                
                <View style={styles.flowSteps}>
                  <View style={styles.flowStep}>
                    <View style={[styles.flowStepNumber, { backgroundColor: theme.primary }]}>
                      <Text style={styles.flowStepNumberText}>1</Text>
                    </View>
                    <View style={styles.flowStepContent}>
                      <Text style={[styles.flowStepTitle, { color: theme.text }]}>Crear Tarea</Text>
                      <Text style={[styles.flowStepDesc, { color: theme.textSecondary }]}>Admin asigna a usuarios o área</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />
                  
                  <View style={styles.flowStep}>
                    <View style={[styles.flowStepNumber, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.flowStepNumberText}>2</Text>
                    </View>
                    <View style={styles.flowStepContent}>
                      <Text style={[styles.flowStepTitle, { color: theme.text }]}>Ver en Bandeja</Text>
                      <Text style={[styles.flowStepDesc, { color: theme.textSecondary }]}>Cada usuario ve sus tareas asignadas</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />
                  
                  <View style={styles.flowStep}>
                    <View style={[styles.flowStepNumber, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.flowStepNumberText}>3</Text>
                    </View>
                    <View style={styles.flowStepContent}>
                      <Text style={[styles.flowStepTitle, { color: theme.text }]}>Ejecutar</Text>
                      <Text style={[styles.flowStepDesc, { color: theme.textSecondary }]}>Subtareas, chat, adjuntos</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />
                  
                  <View style={styles.flowStep}>
                    <View style={[styles.flowStepNumber, { backgroundColor: '#8B5CF6' }]}>
                      <Text style={styles.flowStepNumberText}>4</Text>
                    </View>
                    <View style={styles.flowStepContent}>
                      <Text style={[styles.flowStepTitle, { color: theme.text }]}>Confirmar Parte</Text>
                      <Text style={[styles.flowStepDesc, { color: theme.textSecondary }]}>Cada asignado confirma su trabajo</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.flowConnector, { backgroundColor: theme.border }]} />
                  
                  <View style={styles.flowStep}>
                    <View style={[styles.flowStepNumber, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.flowStepNumberText}>5</Text>
                    </View>
                    <View style={styles.flowStepContent}>
                      <Text style={[styles.flowStepTitle, { color: theme.text }]}>Cerrar Tarea</Text>
                      <Text style={[styles.flowStepDesc, { color: theme.textSecondary }]}>Admin cierra cuando todos confirman</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Pantallas Principales */}
              <View style={[styles.flowSection, { backgroundColor: isDark ? '#1E1E23' : '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={[styles.flowTitle, { color: theme.text }]}>📱 Pantallas Principales</Text>
                
                <View style={styles.screensGrid}>
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="home" size={24} color={theme.primary} />
                    <Text style={[styles.screenName, { color: theme.text }]}>Inicio</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Lista + crear</Text>
                  </View>
                  
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="apps" size={24} color="#3B82F6" />
                    <Text style={[styles.screenName, { color: theme.text }]}>Tablero</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Vista Kanban</Text>
                  </View>
                  
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="calendar" size={24} color="#F59E0B" />
                    <Text style={[styles.screenName, { color: theme.text }]}>Calendario</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Por fecha</Text>
                  </View>
                  
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="file-tray-full" size={24} color="#8B5CF6" />
                    <Text style={[styles.screenName, { color: theme.text }]}>Bandeja</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Mis tareas</Text>
                  </View>
                  
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="bar-chart" size={24} color="#10B981" />
                    <Text style={[styles.screenName, { color: theme.text }]}>Reportes</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Métricas</Text>
                  </View>
                  
                  <View style={[styles.screenItem, { backgroundColor: isDark ? '#2A2A30' : '#FFFFFF' }]}>
                    <Ionicons name="settings" size={24} color="#DC2626" />
                    <Text style={[styles.screenName, { color: theme.text }]}>Admin</Text>
                    <Text style={[styles.screenDesc, { color: theme.textSecondary }]}>Usuarios</Text>
                  </View>
                </View>
              </View>

              {/* Métricas por Rol */}
              <View style={[styles.flowSection, { backgroundColor: isDark ? '#1E1E23' : '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 }]}>
                <Text style={[styles.flowTitle, { color: theme.text }]}>📊 ¿Quién ve qué métricas?</Text>
                
                <View style={styles.metricsInfo}>
                  <View style={[styles.metricRole, { borderLeftColor: '#DC2626' }]}>
                    <Text style={[styles.metricRoleTitle, { color: theme.text }]}>Admin</Text>
                    <Text style={[styles.metricRoleDesc, { color: theme.textSecondary }]}>
                      Cumplimiento de TODOS • Gráficos de área • Alertas globales
                    </Text>
                  </View>
                  
                  <View style={[styles.metricRole, { borderLeftColor: theme.primary }]}>
                    <Text style={[styles.metricRoleTitle, { color: theme.text }]}>Secretario</Text>
                    <Text style={[styles.metricRoleDesc, { color: theme.textSecondary }]}>
                      Rendimiento de sus directores • Tareas de su área • Promedio de cumplimiento
                    </Text>
                  </View>
                  
                  <View style={[styles.metricRole, { borderLeftColor: '#3B82F6' }]}>
                    <Text style={[styles.metricRoleTitle, { color: theme.text }]}>Director</Text>
                    <Text style={[styles.metricRoleDesc, { color: theme.textSecondary }]}>
                      Sus propias métricas • Tareas de su área
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Credenciales */}
              <View style={styles.flowSection}>
                <View style={styles.flowSectionHeader}>
                  <Ionicons name="key" size={20} color={theme.primary} />
                  <Text style={[styles.flowSectionTitle, { color: theme.text }]}>🔐 Credenciales de Acceso</Text>
                </View>
                
                <View style={[styles.credentialsBox, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Text style={[styles.credentialHeader, { color: theme.primary }]}>👤 ADMINISTRADOR</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>admin@todo.com → admin123</Text>
                </View>
                
                <View style={[styles.credentialsBox, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Text style={[styles.credentialHeader, { color: theme.primary }]}>📋 SECRETARIOS</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>secretaria.general@municipio.com → SecGen2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>tesoreria@municipio.com → Teso2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>obras.publicas@municipio.com → Obras2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>planeacion@municipio.com → Plan2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>desarrollo.economico@municipio.com → DesEco2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>bienestar.social@municipio.com → Bien2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>seguridad.publica@municipio.com → Seg2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>pueblos.indigenas@municipio.com → Pueblos2024</Text>
                </View>
                
                <View style={[styles.credentialsBox, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Text style={[styles.credentialHeader, { color: theme.primary }]}>🏢 DIRECTORES - Contraseña: Dir2024</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría General Municipal (11)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>amalia.escalante@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>jose.angeles@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>brenda.martinez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>ernesto.espinoza@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>gerardo.mendoza@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>dulce.rosas@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>marcos.aguirre@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>luis.olguin@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>anahi.catalan@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>taurino.gonzalez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>roberto.ruiz@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Tesorería Municipal (6)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>alejandro.diaz@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>miguel.tolentino@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>juan.sanchez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>hector.perez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>juana.moctezuma@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>isabel.munoz@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Obras Públicas (5)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>vanessa.martinez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>gladys.zapote@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>alfonso.alavez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>rosalio.romero@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>julio.palma@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Planeación y Evaluación (2)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>efrain.volteada@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>luis.chavero@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Desarrollo Económico y Turismo (3)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>berenice.moreno@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>claudia.ramirez@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>pablo.vaquero@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Bienestar Social (6)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>hipolito.bartolo@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>christian.trejo@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>rosa.labra@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>jesus.zapata@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>alicia.feregrino@municipio.com</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>michelle.chiapa@municipio.com</Text>
                  
                  <Text style={[styles.areaHeader, { color: '#235B4E' }]}>📁 Secretaría de Seguridad Pública (1)</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>marcelino.capula@municipio.com</Text>
                </View>
                
                <View style={[styles.credentialsBox, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Text style={[styles.credentialHeader, { color: '#6B7280' }]}>👥 OTROS FUNCIONARIOS</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>contraloria@municipio.com → Cont2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>transparencia@municipio.com → Trans2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>juridico@municipio.com → Juri2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>mujeres@municipio.com → Muj2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>comunicacion@municipio.com → Com2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>sipinna@municipio.com → Sip2024</Text>
                  <Text style={[styles.credentialItem, { color: theme.text }]}>asamblea@municipio.com → Asam2024</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.flowModalFooter}>
              <TouchableOpacity 
                style={[styles.flowModalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowFlowModal(false)}
              >
                <Text style={styles.flowModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.headerSection}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingContainer}>
                <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Hola!</Text>
              </View>
              <Text style={styles.heading}>Administración</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={async () => {
                hapticMedium();
                Alert.alert(
                  'Cerrar Sesión',
                  '¿Estás seguro que deseas cerrar sesión?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Cerrar Sesión',
                      style: 'destructive',
                      onPress: async () => {
                        if (onLogout) {
                          await onLogout();
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={[]} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats Overview - Estadísticas por Rol */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(159, 34, 65, 0.95)', 'rgba(127, 29, 53, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="briefcase" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{userCounts.secretarios}</Text>
              <Text style={styles.statLabel}>SECRETARIOS</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(35, 91, 78, 0.95)', 'rgba(28, 73, 62, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="people" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{userCounts.directores}</Text>
              <Text style={styles.statLabel}>DIRECTORES</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(107, 114, 128, 0.95)', 'rgba(75, 85, 99, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="people" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{userCounts.operativos}</Text>
              <Text style={styles.statLabel}>OTROS</Text>
            </LinearGradient>
          </View>
        </View>
        
        {/* Segunda fila de stats */}
        <View style={[styles.statsContainer, { marginTop: 12 }]}>
          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.95)', 'rgba(124, 58, 237, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{userCounts.admins}</Text>
              <Text style={styles.statLabel}>ADMINS</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.95)', 'rgba(217, 119, 6, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="notifications" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{notificationCount}</Text>
              <Text style={styles.statLabel}>ALERTAS</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{allUsers.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </LinearGradient>
          </View>
        </View>

        {/* 📋 BOTÓN PARA VER FLUJO DEL SISTEMA */}
        <TouchableOpacity 
          style={[styles.actionButton, { marginBottom: 16 }]}
          onPress={() => {
            hapticMedium();
            setShowFlowModal(true);
          }}
        >
          <LinearGradient
            colors={['#9F2241', '#7D1A33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="git-network" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Ver Flujo del Sistema</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Crear Usuario */}
        <View>
          <View style={[
            styles.sectionCard, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.iconCircleSection}
              >
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Crear Usuario</Text>
            </View>
          
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Nombre del usuario"
              placeholderTextColor={theme.textSecondary}
              value={userName}
              onChangeText={setUserName}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="words"
            />
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={userEmail}
              onChangeText={setUserEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor={theme.textSecondary}
              value={userPassword}
              onChangeText={setUserPassword}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.roleSelectorLabel, { color: theme.textSecondary }]}>Seleccionar Rol:</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.background, borderColor: theme.border },
                userRole === 'director' && { backgroundColor: '#235B4E', borderColor: '#235B4E' }
              ]}
              onPress={() => { hapticLight(); setUserRole('director'); }}
            >
              <Text style={[styles.roleButtonText, { color: theme.text }, userRole === 'director' && { color: '#FFFFFF' }]}>Director</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.background, borderColor: theme.border },
                userRole === 'secretario' && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => { hapticLight(); setUserRole('secretario'); }}
            >
              <Text style={[styles.roleButtonText, { color: theme.text }, userRole === 'secretario' && { color: '#FFFFFF' }]}>Secretario</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.background, borderColor: theme.border },
                userRole === 'admin' && { backgroundColor: '#DC2626', borderColor: '#DC2626' }
              ]}
              onPress={() => { hapticLight(); setUserRole('admin'); }}
            >
              <Text style={[styles.roleButtonText, { color: theme.text }, userRole === 'admin' && { color: '#FFFFFF' }]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => { hapticMedium(); createUser(); }}
          >
            <LinearGradient
              colors={['#34C759', '#30B351']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Crear Usuario</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

        {/* Gestión de Áreas */}
        <TouchableOpacity 
          style={[styles.actionButton, { marginTop: 12 }]}
          onPress={() => {
            hapticMedium();
            navigation.navigate('AreaManagement');
          }}
        >
          <LinearGradient
            colors={['#9F2241', '#7D1A33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="folder-open" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Gestión de Áreas</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Analytics & Reports */}
        <TouchableOpacity 
          style={[styles.actionButton, { marginTop: 12 }]}
          onPress={() => {
            hapticMedium();
            navigation.navigate('Analytics');
          }}
        >
          <LinearGradient
            colors={['#06B6D4', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="analytics" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Analytics & Reportes</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Reportes de Áreas - Directores y Secretarios */}
        <TouchableOpacity 
          style={[styles.actionButton, { marginTop: 12 }]}
          onPress={() => {
            hapticMedium();
            navigation.navigate('AdminReports');
          }}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Reportes de Áreas</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Lista de Usuarios */}
        <View>
          <View style={[
            styles.sectionCard, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.iconCircleSection}
              >
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Usuarios ({allUsers.length})</Text>
            </View>

            <TouchableOpacity 
              style={[styles.expandButton, { backgroundColor: theme.background, borderColor: theme.border }]} 
              onPress={() => {
                hapticLight();
                setShowUserList(!showUserList);
              }}
            >
            <Ionicons 
              name={showUserList ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.primary} 
              style={{ marginRight: 8 }} 
            />
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>
              {showUserList ? 'Ocultar Lista' : 'Ver Todos los Usuarios'}
            </Text>
          </TouchableOpacity>

          {showUserList && (
            <View style={styles.userListContainer}>
              {/* Agrupar usuarios por categoría */}
              {[
                { role: 'secretario', label: '💼 Secretarios', color: '#8B5CF6', lightBg: 'rgba(139, 92, 246, 0.08)', icon: 'briefcase' },
                { role: 'director', label: '🏢 Directores', color: '#0EA5E9', lightBg: 'rgba(14, 165, 233, 0.08)', icon: 'business' },
                { role: 'otros', label: '👥 Otros Funcionarios', color: '#F59E0B', lightBg: 'rgba(245, 158, 11, 0.08)', icon: 'people' },
                { role: 'admin', label: '🛡️ Administradores', color: '#EF4444', lightBg: 'rgba(239, 68, 68, 0.08)', icon: 'shield-checkmark' },
              ].map(section => {
                // Filtrar usuarios según la sección
                let sectionUsers;
                if (section.role === 'otros') {
                  // "Otros" incluye cualquier rol no especificado
                  sectionUsers = allUsers.filter(u => !['secretario', 'director', 'admin'].includes(u.role));
                } else {
                  sectionUsers = allUsers.filter(u => u.role === section.role);
                }
                if (sectionUsers.length === 0) return null;
                
                return (
                  <View key={section.role} style={{ marginBottom: 16 }}>
                    {/* Header de sección */}
                    <View style={[styles.roleSectionHeader, { backgroundColor: section.lightBg, borderLeftColor: section.color }]}>
                      <View style={[styles.sectionIconWrapper, { backgroundColor: section.color }]}>
                        <Ionicons name={section.icon} size={16} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.roleSectionTitle, { color: theme.text }]}>
                        {section.label}
                      </Text>
                      <View style={[styles.roleSectionBadge, { backgroundColor: section.color }]}>
                        <Text style={styles.roleSectionCount}>{sectionUsers.length}</Text>
                      </View>
                    </View>
                    
                    {/* Lista de usuarios de esta sección */}
                    {sectionUsers.map((user) => (
                      <View 
                        key={user.id} 
                        style={[styles.userCard, { 
                          backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : '#FFFFFF', 
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]}
                      >
                        <View style={styles.userInfo}>
                          <View style={styles.userHeader}>
                            <View style={[styles.userAvatar, { backgroundColor: `${section.color}15`, borderColor: section.color }]}>
                              <Text style={[styles.avatarInitial, { color: section.color }]}>
                                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                              </Text>
                            </View>
                            <View style={styles.userTextContainer}>
                              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{user.displayName}</Text>
                              
                              {/* Cargo/Puesto - Destacado */}
                              {(user.position || user.area) && (
                                <View style={[styles.positionBadge, { backgroundColor: `${section.color}12`, borderColor: `${section.color}30` }]}>
                                  <Ionicons name="briefcase" size={11} color={section.color} />
                                  <Text style={[styles.positionText, { color: section.color }]} numberOfLines={1}>
                                    {user.position || user.area}
                                  </Text>
                                </View>
                              )}
                              
                              {/* Área/Dirección (si hay position, mostrar área aparte) */}
                              {user.position && user.area && user.position !== user.area && (
                                <View style={styles.areaTextRow}>
                                  <Ionicons name="business-outline" size={10} color={theme.textSecondary} />
                                  <Text style={[styles.areaText, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {user.area}
                                  </Text>
                                </View>
                              )}
                              
                              {/* Email */}
                              <View style={styles.emailRow}>
                                <Ionicons name="mail-outline" size={10} color={theme.textSecondary} />
                                <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{user.email}</Text>
                              </View>
                              
                              {/* Teléfono si existe */}
                              {user.phone && (
                                <View style={styles.phoneRow}>
                                  <Ionicons name="call-outline" size={10} color={theme.textSecondary} />
                                  <Text style={[styles.phoneText, { color: theme.textSecondary }]}>{user.phone}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.userActions}>
                          {/* Rol: chip o selector inline */}
                          {editingRoleUserId === user.id ? (
                            <View style={styles.roleEditContainer}>
                              {['director', 'secretario', 'admin'].map(role => (
                                <TouchableOpacity
                                  key={role}
                                  style={[
                                    styles.roleOptionChip,
                                    { borderColor: ROLE_COLORS[role] },
                                    user.role === role && { backgroundColor: ROLE_COLORS[role] }
                                  ]}
                                  onPress={() => changeUserRole(user.id, role, user.displayName)}
                                >
                                  <Text style={[
                                    styles.roleOptionText,
                                    { color: user.role === role ? '#fff' : ROLE_COLORS[role] }
                                  ]}>
                                    {ROLE_LABELS[role]}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                              <TouchableOpacity
                                style={styles.roleEditClose}
                                onPress={() => setEditingRoleUserId(null)}
                              >
                                <Ionicons name="close" size={16} color={theme.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.roleChip,
                                { backgroundColor: `${ROLE_COLORS[user.role] || '#6B7280'}18`, borderColor: ROLE_COLORS[user.role] || '#6B7280' }
                              ]}
                              onPress={() => { hapticLight(); setEditingRoleUserId(user.id); }}
                              disabled={user.id === currentUser?.userId}
                            >
                              <Ionicons name="swap-horizontal-outline" size={11} color={ROLE_COLORS[user.role] || '#6B7280'} />
                              <Text style={[styles.roleChipText, { color: ROLE_COLORS[user.role] || '#6B7280' }]}>
                                {ROLE_LABELS[user.role] || user.role}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Eliminar */}
                          {user.id !== currentUser?.userId && (
                            <TouchableOpacity
                              style={styles.deleteUserBtn}
                              onPress={() => deleteUserAccount(user.id, user.displayName)}
                            >
                              <Ionicons name="trash-outline" size={13} color="#EF4444" />
                              <Text style={styles.deleteUserBtnText}>Eliminar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
          </View>
        </View>

        {/* Recuperación de Contraseña */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="key" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resetear Contraseña</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email del usuario"
              placeholderTextColor={theme.textSecondary}
              value={resetEmail}
              onChangeText={setResetEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Nueva contraseña"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              resetUserPassword();
            }}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Resetear Contraseña</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Solo administradores pueden resetear contraseñas de otros usuarios.
          </Text>
        </View>

        {/* Notificaciones */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#06B6D4', '#0891B2']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              testNotification();
            }}
          >
            <LinearGradient
              colors={['#34C759', '#30B351']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="flask" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Enviar Notificación de Prueba</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: theme.background, borderColor: theme.border }]} 
            onPress={() => {
              hapticLight();
              viewScheduledNotifications();
            }}
          >
            <Ionicons name="list-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>Ver Programadas ({notificationCount})</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]} 
            onPress={() => {
              hapticMedium();
              clearAllNotifications();
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: '#DC2626' }]}>Cancelar Todas</Text>
          </TouchableOpacity>
        </View>


        {/* Información de la App */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#6B7280', '#4B5563']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="information-circle" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Información</Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Versión</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Firebase Auth</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Activo</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Firestore Sync</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Conectado</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Modo Oscuro</Text>
            <TouchableOpacity
              style={[styles.themeToggle, isDark && { ...styles.themeToggleActive, backgroundColor: theme.primary }]}
              onPress={() => {
                hapticMedium();
                toggleTheme();
              }}
            >
              <View style={[styles.themeToggleCircle, isDark && styles.themeToggleCircleActive]}>
                <Ionicons 
                  name={isDark ? "moon" : "sunny"} 
                  size={16} 
                  color={isDark ? "#FFFFFF" : "#FFA500"} 
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      </View>
    </View>
  );
}

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600'
  },
  headerSection: {
    // Container for header without animations
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4
  },
  heading: { 
    fontSize: 36, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 4
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 16,
    paddingBottom: 80
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 135,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden'
  },
  statCardGlass: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  statCardGradient: {
    flex: 1,
    width: '100%',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    opacity: 0.98,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  iconCircleSection: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 52,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600'
  },
  roleSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8
  },
  roleButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2.5,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    minHeight: 52
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 14,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  userListContainer: {
    marginTop: 8
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  roleSectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  roleSectionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    gap: 12
  },
  userInfo: {
    flex: 1
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1
  },
  userTextContainer: {
    flex: 1,
    minWidth: 0
  },
  userAvatar: {
    width: Platform.OS === 'web' ? 48 : 44,
    height: Platform.OS === 'web' ? 48 : 44,
    borderRadius: Platform.OS === 'web' ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    flexShrink: 0
  },
  avatarInitial: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
  },
  userActions: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  roleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 200,
  },
  roleOptionChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleEditClose: {
    padding: 4,
  },
  deleteUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
  },
  deleteUserBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  areaTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  areaText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 2,
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userName: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 0
  },
  userRoleBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexShrink: 0
  },
  userRoleText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  userEmail: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
    flex: 1,
  },
  userArea: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  userDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  userDate: {
    fontSize: 12
  },
  statusButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: Platform.OS === 'web' ? 44 : 40,
    flexShrink: 0,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.7
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857'
  },
  themeToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    padding: 3,
    justifyContent: 'center'
  },
  themeToggleActive: {
    backgroundColor: '#9F2241'
  },
  themeToggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  themeToggleCircleActive: {
    alignSelf: 'flex-end'
  },
  // Estilos del Modal de Tareas Urgentes
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  urgentModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 28,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  urgentModalSubtitle: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  urgentModalScroll: {
    maxHeight: 400,
    padding: 18
  },
  urgentModalFooter: {
    padding: 18,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 100
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.3
  },
  urgentTaskArea: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 40
  },
  urgentTaskTime: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: -0.2
  },
  urgentModalFooter: {
    padding: 18,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentModalButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  // Estilos del Flujo del Sistema
  flowSection: {
    marginBottom: 8,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  hierarchyContainer: {
    alignItems: 'center',
  },
  roleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 160,
  },
  roleBoxText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  roleBoxDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBoxSmall: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 90,
  },
  roleBoxTextSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  roleBoxDescSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  flowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  flowInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  flowSteps: {
    gap: 4,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowStepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  flowStepContent: {
    flex: 1,
  },
  flowStepTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  flowStepDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  flowConnector: {
    width: 2,
    height: 16,
    marginLeft: 15,
  },
  screensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  screenItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  screenName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  screenDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  metricsInfo: {
    gap: 12,
  },
  metricRole: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  metricRoleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricRoleDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  // Estilos del Modal de Flujo
  flowModalContent: {
    width: '94%',
    maxHeight: '90%',
    borderRadius: 24,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  flowModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 34, 65, 0.2)',
  },
  flowModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  flowModalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  flowModalScroll: {
    maxHeight: 500,
    padding: 16,
  },
  flowModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(159, 34, 65, 0.1)',
  },
  flowModalButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  flowModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Estilos de Credenciales
  credentialsBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  credentialHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  credentialItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    paddingVertical: 3,
    lineHeight: 18,
  },
  credentialNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  areaHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
});




