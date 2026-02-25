// screens/AdminExecutiveDashboard.js
// Dashboard ÚNICO y UNIFICADO para Admin
// Combina: KPIs, Evolución, Comparativa, Cumplimiento, Rendimiento

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTasks } from '../services/tasks';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import TrafficLightDashboard from '../components/TrafficLightDashboard';
import HelpButton from '../components/HelpButton';

const { width } = Dimensions.get('window');
const chartWidth = Math.min(width - 48, 500);

export default function AdminExecutiveDashboard({ navigation }) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, evolution, compliance, performance
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, quarter
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // === MÉTRICAS CALCULADAS ===
  
  // Métricas globales
  const globalMetrics = useMemo(() => {
    if (!tasks.length) return {
      totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0,
      overdueTasks: 0, coordinationTasks: 0, completionRate: 0, onTimeRate: 0,
    };
    
    const now = new Date();
    const pending = tasks.filter(t => t.status === 'pendiente');
    const inProgress = tasks.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso');
    const completed = tasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
    const overdue = tasks.filter(t => {
      if (t.status === 'completada' || t.status === 'cerrada') return false;
      const dueDate = t.dueAt ? new Date(t.dueAt) : null;
      return dueDate && dueDate < now;
    });
    const coordination = tasks.filter(t => t.isCoordinationTask);
    
    const completedOnTime = completed.filter(t => {
      if (!t.dueAt || !t.completedAt) return true;
      return new Date(t.completedAt) <= new Date(t.dueAt);
    });
    
    return {
      totalTasks: tasks.length,
      pendingTasks: pending.length,
      inProgressTasks: inProgress.length,
      completedTasks: completed.length,
      overdueTasks: overdue.length,
      coordinationTasks: coordination.length,
      completionRate: tasks.length > 0 
        ? Math.round((completed.length / tasks.length) * 100) 
        : 0,
      onTimeRate: completed.length > 0 
        ? Math.round((completedOnTime.length / completed.length) * 100) 
        : 0,
    };
  }, [tasks]);

  // Datos para gráfica de evolución
  const evolutionData = useMemo(() => {
    if (!tasks.length) return null;
    
    const now = new Date();
    const labels = [];
    const completedData = [];
    const createdData = [];
    
    // Últimos 7 días o 4 semanas según período
    const periods = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 4 : 12;
    const periodType = selectedPeriod === 'week' ? 'day' : selectedPeriod === 'month' ? 'week' : 'month';
    
    for (let i = periods - 1; i >= 0; i--) {
      let startDate, endDate, label;
      
      if (periodType === 'day') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        label = startDate.toLocaleDateString('es', { weekday: 'short' });
      } else if (periodType === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (i * 7));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        label = `Sem ${periods - i}`;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        label = startDate.toLocaleDateString('es', { month: 'short' });
      }
      
      const completedInPeriod = tasks.filter(t => {
        if (t.status !== 'completada' && t.status !== 'cerrada') return false;
        const completedAt = t.completedAt ? new Date(t.completedAt) : null;
        return completedAt && completedAt >= startDate && completedAt <= endDate;
      });
      
      const createdInPeriod = tasks.filter(t => {
        const createdAt = t.createdAt ? new Date(t.createdAt) : null;
        return createdAt && createdAt >= startDate && createdAt <= endDate;
      });
      
      labels.push(label);
      completedData.push(completedInPeriod.length);
      createdData.push(createdInPeriod.length);
    }
    
    return { labels, completedData, createdData };
  }, [tasks, selectedPeriod]);

  // Comparativa mensual
  const monthlyComparison = useMemo(() => {
    if (!tasks.length) return { thisMonth: 0, lastMonth: 0, change: 0, improving: false };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    const thisMonthCompleted = tasks.filter(t => {
      if (t.status !== 'completada' && t.status !== 'cerrada') return false;
      const completedAt = t.completedAt ? new Date(t.completedAt) : null;
      return completedAt && completedAt >= thisMonthStart;
    });
    
    const lastMonthCompleted = tasks.filter(t => {
      if (t.status !== 'completada' && t.status !== 'cerrada') return false;
      const completedAt = t.completedAt ? new Date(t.completedAt) : null;
      return completedAt && completedAt >= lastMonthStart && completedAt <= lastMonthEnd;
    });
    
    const thisMonthRate = thisMonthCompleted.length;
    const lastMonthRate = lastMonthCompleted.length;
    const change = lastMonthRate > 0 
      ? Math.round(((thisMonthRate - lastMonthRate) / lastMonthRate) * 100) 
      : thisMonthRate > 0 ? 100 : 0;
    
    return {
      thisMonth: thisMonthRate,
      lastMonth: lastMonthRate,
      change,
      improving: change >= 0,
    };
  }, [tasks]);

  // Métricas por usuario (para cumplimiento)
  const userMetrics = useMemo(() => {
    const directores = users.filter(u => u.role === 'director' || u.role === 'jefe');
    const now = new Date();
    
    return directores.map(user => {
      const userTasks = tasks.filter(t => 
        t.assignedTo?.includes(user.email) || t.area === user.area
      );
      const completed = userTasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
      const pending = userTasks.filter(t => t.status === 'pendiente');
      const overdue = userTasks.filter(t => {
        if (t.status === 'completada' || t.status === 'cerrada') return false;
        const dueDate = t.dueAt ? new Date(t.dueAt) : null;
        return dueDate && dueDate < now;
      });
      
      return {
        ...user,
        totalTasks: userTasks.length,
        completedTasks: completed.length,
        pendingTasks: pending.length,
        overdueTasks: overdue.length,
        completionRate: userTasks.length > 0 
          ? Math.round((completed.length / userTasks.length) * 100) 
          : 0,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks, users]);

  // Métricas por secretaría
  const secretariaMetrics = useMemo(() => {
    const secretarios = users.filter(u => u.role === 'secretario');
    const directores = users.filter(u => u.role === 'director');
    const now = new Date();
    
    return secretarios.map(sec => {
      const direcciones = sec.direcciones || [];
      const secArea = sec.area || '';
      
      const secTasks = tasks.filter(t => {
        const taskArea = t.area || '';
        const taskAreas = t.areas || [taskArea];
        return direcciones.some(dir => taskAreas.includes(dir) || taskArea === dir) ||
               taskArea.includes(secArea);
      });
      
      const secDirectors = directores.filter(d => 
        direcciones.includes(d.area) || direcciones.includes(d.department)
      );
      
      const secCompleted = secTasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
      const secOverdue = secTasks.filter(t => {
        if (t.status === 'completada' || t.status === 'cerrada') return false;
        const dueDate = t.dueAt ? new Date(t.dueAt) : null;
        return dueDate && dueDate < now;
      });
      
      return {
        secretario: sec,
        totalTasks: secTasks.length,
        completedTasks: secCompleted.length,
        overdueTasks: secOverdue.length,
        pendingTasks: secTasks.filter(t => t.status === 'pendiente').length,
        completionRate: secTasks.length > 0 
          ? Math.round((secCompleted.length / secTasks.length) * 100) 
          : 0,
        directorsCount: secDirectors.length,
        directors: secDirectors,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks, users]);

  // === EFECTOS ===
  
  useEffect(() => {
    loadInitialData();
    
    let unsubscribeTasks = null;
    
    const setupTasksSubscription = async () => {
      unsubscribeTasks = await subscribeToTasks((updatedTasks) => {
        setTasks(updatedTasks);
      });
    };
    
    setupTasksSubscription();

    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();

    return () => {
      if (typeof unsubscribeTasks === 'function') unsubscribeTasks();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  // === UTILIDADES ===
  
  const getCompletionColor = (rate) => {
    if (rate >= 80) return '#10B981';
    if (rate >= 60) return '#F59E0B';
    if (rate >= 40) return '#F97316';
    return '#EF4444';
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'secretario': return 'Secretario';
      case 'director': return 'Director';
      case 'jefe': return 'Jefe de Área';
      default: return 'Operativo';
    }
  };

  // === COMPONENTES DE TABS ===
  
  const TabButton = ({ id, label, icon }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === id && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Ionicons 
        name={icon} 
        size={18} 
        color={activeTab === id ? theme.primary : theme.textSecondary} 
      />
      <Text style={[
        styles.tabLabel,
        { color: activeTab === id ? theme.primary : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // === SECCIONES ===
  
  // Sección: Resumen General
  const renderOverview = () => (
    <View>
      {/* KPIs en Grid */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="speedometer" size={20} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen General</Text>
        </View>
        
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="document-text" size={22} color="#3B82F6" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.text }]}>{globalMetrics.totalTasks}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#ECFDF5' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            </View>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>{globalMetrics.completedTasks}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Listas</Text>
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#DBEAFE' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="sync" size={22} color="#3B82F6" />
            </View>
            <Text style={[styles.kpiValue, { color: '#3B82F6' }]}>{globalMetrics.inProgressTasks}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Activas</Text>
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="time" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{globalMetrics.pendingTasks}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Espera</Text>
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1E293B' : '#FEF2F2' }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
            </View>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{globalMetrics.overdueTasks}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Vencidas</Text>
          </View>
        </View>
        
        {/* Barras de tasa */}
        <View style={styles.ratesContainer}>
          <View style={styles.rateItem}>
            <View style={styles.rateHeader}>
              <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>Tasa de Cumplimiento</Text>
              <Text style={[styles.rateValue, { color: getCompletionColor(globalMetrics.completionRate) }]}>
                {globalMetrics.completionRate}%
              </Text>
            </View>
            <ProgressBar progress={globalMetrics.completionRate} color={getCompletionColor(globalMetrics.completionRate)} size="medium" />
          </View>
          
          <View style={styles.rateItem}>
            <View style={styles.rateHeader}>
              <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>Entregadas a Tiempo</Text>
              <Text style={[styles.rateValue, { color: getCompletionColor(globalMetrics.onTimeRate) }]}>
                {globalMetrics.onTimeRate}%
              </Text>
            </View>
            <ProgressBar progress={globalMetrics.onTimeRate} color={getCompletionColor(globalMetrics.onTimeRate)} size="medium" />
          </View>
        </View>
      </View>

      {/* Comparativa Mensual */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color="#9C27B0" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Comparativa Mensual</Text>
        </View>
        
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Este Mes</Text>
            <Text style={[styles.comparisonValue, { color: theme.text }]}>{monthlyComparison.thisMonth}</Text>
          </View>
          
          <View style={[styles.comparisonArrow, { backgroundColor: monthlyComparison.improving ? '#10B98120' : '#EF444420' }]}>
            <Ionicons 
              name={monthlyComparison.improving ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color={monthlyComparison.improving ? '#10B981' : '#EF4444'} 
            />
            <Text style={{ 
              color: monthlyComparison.improving ? '#10B981' : '#EF4444',
              fontWeight: '700',
              fontSize: 13,
            }}>
              {monthlyComparison.change > 0 ? '+' : ''}{monthlyComparison.change}%
            </Text>
          </View>
          
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>Mes Anterior</Text>
            <Text style={[styles.comparisonValue, { color: theme.textSecondary }]}>{monthlyComparison.lastMonth}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: monthlyComparison.improving ? '#10B98120' : '#EF444420' }]}>
          <Ionicons 
            name={monthlyComparison.improving ? 'checkmark-circle' : 'alert-circle'} 
            size={16} 
            color={monthlyComparison.improving ? '#10B981' : '#EF4444'} 
          />
          <Text style={{ color: monthlyComparison.improving ? '#10B981' : '#EF4444', fontWeight: '600', fontSize: 13 }}>
            {monthlyComparison.improving ? 'Mejorando' : 'Necesita atención'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Sección: Evolución
  const renderEvolution = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="analytics" size={20} color="#3B82F6" />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Evolución</Text>
      </View>
      
      {/* Selector de período */}
      <View style={styles.periodSelector}>
        {['week', 'month', 'quarter'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              { color: selectedPeriod === period ? '#FFFFFF' : theme.textSecondary }
            ]}>
              {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Trimestre'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {evolutionData && evolutionData.completedData.some(v => v > 0) ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: evolutionData.labels,
              datasets: [
                { data: evolutionData.completedData.length ? evolutionData.completedData : [0], color: () => '#10B981', strokeWidth: 3 },
                { data: evolutionData.createdData.length ? evolutionData.createdData : [0], color: () => '#3B82F6', strokeWidth: 2 },
              ],
              legend: ['Completadas', 'Creadas'],
            }}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 0,
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              labelColor: () => theme.textSecondary,
              propsForDots: { r: '4', strokeWidth: '2' },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Sin datos para mostrar en este período
          </Text>
        </View>
      )}
      
      {/* Leyenda */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Completadas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Creadas</Text>
        </View>
      </View>
    </View>
  );

  // Sección: Cumplimiento
  const renderCompliance = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="bar-chart" size={20} color="#F59E0B" />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Reporte de Cumplimiento</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Quién trabaja y quién no</Text>
      </View>
      
      {/* Resumen rápido */}
      <View style={styles.complianceSummary}>
        <View style={[styles.complianceCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
          <Text style={[styles.complianceValue, { color: theme.text }]}>{userMetrics.length}</Text>
          <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Asignados</Text>
        </View>
        <View style={[styles.complianceCard, { backgroundColor: isDark ? '#1E2620' : '#ECFDF5' }]}>
          <Text style={[styles.complianceValue, { color: '#10B981' }]}>
            {userMetrics.filter(u => u.completionRate >= 70).length}
          </Text>
          <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Cumpliendo</Text>
        </View>
        <View style={[styles.complianceCard, { backgroundColor: isDark ? '#2D1E1E' : '#FEF2F2' }]}>
          <Text style={[styles.complianceValue, { color: '#EF4444' }]}>
            {userMetrics.filter(u => u.overdueTasks > 0).length}
          </Text>
          <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Con Retrasos</Text>
        </View>
        <View style={[styles.complianceCard, { backgroundColor: isDark ? '#1E293B' : '#DBEAFE' }]}>
          <Text style={[styles.complianceValue, { color: '#3B82F6' }]}>
            {userMetrics.length > 0 
              ? Math.round(userMetrics.reduce((a, b) => a + b.completionRate, 0) / userMetrics.length) 
              : 0}%
          </Text>
          <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Promedio</Text>
        </View>
      </View>
      
      {/* Lista de usuarios ordenada */}
      <View style={styles.sortButtons}>
        <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>Ordenar por:</Text>
        <TouchableOpacity style={[styles.sortButton, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.sortButtonText, { color: theme.primary }]}>Cumplimiento ↓</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.usersList}>
        {userMetrics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No hay directores o jefes asignados
            </Text>
          </View>
        ) : (
          userMetrics.map((user, index) => (
            <TouchableOpacity
              key={user.id || index}
              style={[
                styles.userCard,
                { 
                  backgroundColor: isDark ? '#1E1E23' : '#F8FAFC',
                  borderLeftColor: getCompletionColor(user.completionRate),
                }
              ]}
              onPress={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            >
              <View style={styles.userRank}>
                <Text style={[styles.rankNumber, { color: index < 3 ? '#F59E0B' : theme.textSecondary }]}>
                  #{index + 1}
                </Text>
              </View>
              <Avatar name={user.displayName || user.email} size={40} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                  {user.displayName || user.email?.split('@')[0]}
                </Text>
                <Text style={[styles.userRole, { color: theme.textSecondary }]} numberOfLines={1}>
                  {getRoleLabel(user.role)} · {user.area || 'Sin área'}
                </Text>
              </View>
              <View style={styles.userStats}>
                <Text style={[styles.userRate, { color: getCompletionColor(user.completionRate) }]}>
                  {user.completionRate}%
                </Text>
                {user.overdueTasks > 0 && (
                  <View style={[styles.overdueBadge]}>
                    <Text style={styles.overdueText}>{user.overdueTasks} vencidas</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );

  // Sección: Rendimiento por Secretaría
  const renderPerformance = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="business" size={20} color="#9C27B0" />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Rendimiento por Secretaría</Text>
      </View>
      
      {secretariaMetrics.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No hay secretarios configurados
          </Text>
        </View>
      ) : (
        secretariaMetrics.map((data, index) => (
          <TouchableOpacity
            key={data.secretario.id || index}
            style={[
              styles.secretariaCard,
              { 
                backgroundColor: isDark ? '#1E1E23' : '#F8FAFC',
                borderLeftColor: getCompletionColor(data.completionRate)
              }
            ]}
            onPress={() => {
              setSelectedUser({ ...data.secretario, ...data });
              setShowUserModal(true);
            }}
          >
            <View style={styles.secretariaHeader}>
              <Avatar name={data.secretario.displayName || data.secretario.email} size={44} />
              <View style={styles.secretariaInfo}>
                <Text style={[styles.secretariaName, { color: theme.text }]} numberOfLines={1}>
                  {data.secretario.displayName || data.secretario.email?.split('@')[0]}
                </Text>
                <Text style={[styles.secretariaArea, { color: theme.textSecondary }]} numberOfLines={1}>
                  {data.secretario.area || 'Sin área'}
                </Text>
              </View>
              <View style={styles.secretariaScore}>
                <Text style={[styles.scoreValue, { color: getCompletionColor(data.completionRate) }]}>
                  {data.completionRate}%
                </Text>
              </View>
            </View>
            
            <View style={styles.secretariaStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>{data.totalTasks}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{data.completedTasks}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{data.pendingTasks}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendientes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{data.overdueTasks}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Vencidas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{data.directorsCount}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Directores</Text>
              </View>
            </View>
            
            <ProgressBar progress={data.completionRate} color={getCompletionColor(data.completionRate)} size="small" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // === RENDER PRINCIPAL ===
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#9F2241', '#BC955C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerLabel}>PANEL DE CONTROL</Text>
            <Text style={styles.headerTitle}>Dashboard Admin</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HelpButton
              title="Dashboard Admin"
              variant="header"
              size="medium"
              items={[
                { icon: 'grid-outline', title: 'Resumen General', description: 'Vista rápida de KPIs: tareas totales, completadas, en proceso y vencidas.' },
                { icon: 'speedometer-outline', title: 'Semáforo', description: 'Visualiza el estado de cada área con indicadores verde/amarillo/rojo.' },
                { icon: 'trending-up-outline', title: 'Evolución', description: 'Gráficos de línea que muestran la tendencia de cumplimiento en el tiempo.' },
                { icon: 'people-outline', title: 'Cumplimiento', description: 'Analiza el rendimiento individual de cada usuario y su tasa de cierre.' },
                { icon: 'business-outline', title: 'Secretarías', description: 'Compara el desempeño entre las diferentes áreas de la organización.', color: '#10B981' },
              ]}
            />
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{globalMetrics.totalTasks}</Text>
              <Text style={styles.headerBadgeLabel}>tareas</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs de navegación */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TabButton id="overview" label="Resumen" icon="grid" />
          <TabButton id="trafficlight" label="Semáforo" icon="traffic-light-outline" />
          <TabButton id="evolution" label="Evolución" icon="trending-up" />
          <TabButton id="compliance" label="Cumplimiento" icon="people" />
          <TabButton id="performance" label="Secretarías" icon="business" />
        </ScrollView>
      </View>

      {/* Contenido */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'trafficlight' && (
            <TrafficLightDashboard 
              tasks={tasks} 
              onAreaPress={(area) => navigation.navigate('Tasks', { filterArea: area })}
            />
          )}
          {activeTab === 'evolution' && renderEvolution()}
          {activeTab === 'compliance' && renderCompliance()}
          {activeTab === 'performance' && renderPerformance()}
          
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Modal de detalle de usuario */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Detalle</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalUserInfo}>
                  <Avatar name={selectedUser.displayName || selectedUser.email} size={64} />
                  <Text style={[styles.modalUserName, { color: theme.text }]}>
                    {selectedUser.displayName || selectedUser.email?.split('@')[0]}
                  </Text>
                  <Text style={[styles.modalUserRole, { color: theme.textSecondary }]}>
                    {getRoleLabel(selectedUser.role)} · {selectedUser.area || 'Sin área'}
                  </Text>
                </View>
                
                <View style={styles.modalStats}>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                    <Text style={[styles.modalStatValue, { color: theme.text }]}>{selectedUser.totalTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Total</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#1E2620' : '#ECFDF5' }]}>
                    <Text style={[styles.modalStatValue, { color: '#10B981' }]}>{selectedUser.completedTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Completadas</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#2D1E1E' : '#FEF2F2' }]}>
                    <Text style={[styles.modalStatValue, { color: '#EF4444' }]}>{selectedUser.overdueTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Vencidas</Text>
                  </View>
                </View>
                
                <View style={styles.modalCompletion}>
                  <View style={styles.modalCompletionHeader}>
                    <Text style={[styles.modalCompletionLabel, { color: theme.textSecondary }]}>
                      Tasa de Cumplimiento
                    </Text>
                    <Text style={[styles.modalCompletionValue, { color: getCompletionColor(selectedUser.completionRate || 0) }]}>
                      {selectedUser.completionRate || 0}%
                    </Text>
                  </View>
                  <ProgressBar 
                    progress={selectedUser.completionRate || 0} 
                    color={getCompletionColor(selectedUser.completionRate || 0)}
                    size="large"
                  />
                </View>
                
                {/* Directores si es secretario */}
                {selectedUser.directors && selectedUser.directors.length > 0 && (
                  <View style={styles.modalDirectors}>
                    <Text style={[styles.modalDirectorsTitle, { color: theme.text }]}>
                      Directores ({selectedUser.directors.length})
                    </Text>
                    {selectedUser.directors.map((director, i) => (
                      <View key={i} style={[styles.modalDirectorItem, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Avatar name={director.displayName || director.email} size={32} />
                        <Text style={[styles.modalDirectorName, { color: theme.text }]}>
                          {director.displayName || director.email?.split('@')[0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  // Header
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  headerBadgeText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerBadgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  
  // Tabs
  tabsContainer: { borderBottomWidth: 1, paddingVertical: 10 },
  tabsScroll: { paddingHorizontal: 16, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', gap: 6 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  
  // Content
  scrollContent: { padding: 16 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  sectionSubtitle: { fontSize: 12, width: '100%', marginTop: 2 },
  
  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  kpiCard: { width: (width - 64 - 20) / 5, minWidth: 62, padding: 10, borderRadius: 12, alignItems: 'center' },
  kpiIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 9, marginTop: 2, textAlign: 'center', fontWeight: '500' },
  
  // Rates
  ratesContainer: { gap: 12 },
  rateItem: { gap: 6 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { fontSize: 13, fontWeight: '500' },
  rateValue: { fontSize: 16, fontWeight: '700' },
  
  // Comparison
  comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  comparisonItem: { alignItems: 'center', flex: 1 },
  comparisonLabel: { fontSize: 12, marginBottom: 4 },
  comparisonValue: { fontSize: 28, fontWeight: '800' },
  comparisonArrow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
  
  // Chart
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  emptyChart: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyChartText: { fontSize: 14, textAlign: 'center' },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  periodButtonText: { fontSize: 12, fontWeight: '600' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  
  // Compliance
  complianceSummary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  complianceCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  complianceValue: { fontSize: 22, fontWeight: '800' },
  complianceLabel: { fontSize: 10, marginTop: 2 },
  sortButtons: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sortLabel: { fontSize: 12 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  sortButtonText: { fontSize: 12, fontWeight: '600' },
  
  // Users List
  usersList: { gap: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderLeftWidth: 4, gap: 10 },
  userRank: { width: 28, alignItems: 'center' },
  rankNumber: { fontSize: 12, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  userRole: { fontSize: 11, marginTop: 2 },
  userStats: { alignItems: 'flex-end' },
  userRate: { fontSize: 18, fontWeight: '800' },
  overdueBadge: { backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  overdueText: { color: '#EF4444', fontSize: 10, fontWeight: '600' },
  
  // Secretaria Cards
  secretariaCard: { padding: 14, borderRadius: 14, marginBottom: 12, borderLeftWidth: 4 },
  secretariaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  secretariaInfo: { flex: 1, marginLeft: 10 },
  secretariaName: { fontSize: 15, fontWeight: '700' },
  secretariaArea: { fontSize: 11, marginTop: 2 },
  secretariaScore: { alignItems: 'flex-end' },
  scoreValue: { fontSize: 22, fontWeight: '800' },
  secretariaStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  
  // Empty
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalUserInfo: { alignItems: 'center', marginBottom: 16 },
  modalUserName: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  modalUserRole: { fontSize: 13, marginTop: 4 },
  modalStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modalStatCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modalStatValue: { fontSize: 22, fontWeight: '700' },
  modalStatLabel: { fontSize: 10, marginTop: 4 },
  modalCompletion: { marginBottom: 16 },
  modalCompletionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalCompletionLabel: { fontSize: 13 },
  modalCompletionValue: { fontSize: 18, fontWeight: '700' },
  modalDirectors: { marginTop: 8 },
  modalDirectorsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  modalDirectorItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 6, gap: 10 },
  modalDirectorName: { fontSize: 13, fontWeight: '500' },
});
