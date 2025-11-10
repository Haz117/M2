// screens/ReportScreen.js
// Reporte para reunión: tarjetas por área con contadores, lista de críticas (alta prioridad) y vencidas.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadTasks } from '../storage';

const AREAS = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
const STATUSES = [
  { key: 'pendiente', label: 'Pendientes', color: '#ff9800' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196f3' },
  { key: 'en_revision', label: 'En revisión', color: '#9c27b0' },
  { key: 'cerrada', label: 'Cerradas', color: '#4caf50' }
];

export default function ReportScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const t = await loadTasks();
    setTasks(t || []);
  };

  // Agrupar por área
  const groupByArea = () => {
    const groups = {};
    AREAS.forEach(area => {
      groups[area] = {
        pendiente: 0,
        en_proceso: 0,
        en_revision: 0,
        cerrada: 0,
        vencidas: 0,
        total: 0
      };
    });

    tasks.forEach(task => {
      const area = task.area || 'Administración';
      if (!groups[area]) groups[area] = { pendiente: 0, en_proceso: 0, en_revision: 0, cerrada: 0, vencidas: 0, total: 0 };
      
      const status = task.status || 'pendiente';
      groups[area][status]++;
      groups[area].total++;
      
      // Contar vencidas
      if (task.dueAt && task.dueAt < Date.now() && status !== 'cerrada') {
        groups[area].vencidas++;
      }
    });

    return groups;
  };

  // Tareas críticas (alta prioridad que no están cerradas)
  const getCriticalTasks = () => {
    return tasks.filter(t => 
      t.priority === 'alta' && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  };

  // Tareas vencidas (no cerradas y fecha pasada)
  const getOverdueTasks = () => {
    return tasks.filter(t => 
      t.dueAt && 
      t.dueAt < Date.now() && 
      (t.status !== 'cerrada')
    ).sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
  };

  const areaData = groupByArea();
  const criticalTasks = getCriticalTasks();
  const overdueTasks = getOverdueTasks();

  const renderAreaCard = (area) => {
    const data = areaData[area];
    return (
      <View key={area} style={styles.areaCard}>
        <Text style={styles.areaTitle}>{area}</Text>
        <View style={styles.statsGrid}>
          {STATUSES.map(status => (
            <View key={status.key} style={styles.statItem}>
              <View style={[styles.statBadge, { backgroundColor: status.color }]}>
                <Text style={styles.statNumber}>{data[status.key]}</Text>
              </View>
              <Text style={styles.statLabel}>{status.label}</Text>
            </View>
          ))}
          {data.vencidas > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statBadge, { backgroundColor: '#e53935' }]}>
                <Text style={styles.statNumber}>{data.vencidas}</Text>
              </View>
              <Text style={styles.statLabel}>Vencidas</Text>
            </View>
          )}
        </View>
        <Text style={styles.totalText}>Total: {data.total}</Text>
      </View>
    );
  };

  const renderTaskItem = (task) => (
    <TouchableOpacity
      key={task.id}
      onPress={() => navigation.navigate('TaskDetail', { task })}
      style={styles.taskCard}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.priority === 'alta' && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>ALTA</Text>
          </View>
        )}
      </View>
      <Text style={styles.taskMeta}>
        {task.area} • {task.assignedTo || 'Sin asignar'}
      </Text>
      <Text style={styles.taskDue}>
        Vence: {new Date(task.dueAt).toLocaleDateString()} • {task.status || 'pendiente'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Análisis y métricas 📈</Text>
            <Text style={styles.heading}>Reportes</Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</Text>

      {/* Resumen general */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen General</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{tasks.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#e53935' }]}>
            <Text style={styles.summaryNumber}>{overdueTasks.length}</Text>
            <Text style={styles.summaryLabel}>Vencidas</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.summaryNumber}>{criticalTasks.length}</Text>
            <Text style={styles.summaryLabel}>Críticas</Text>
          </View>
        </View>
      </View>

      {/* Tarjetas por área */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por Área</Text>
        {AREAS.map(renderAreaCard)}
      </View>

      {/* Tareas críticas */}
      {criticalTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔴 Tareas Críticas (Alta Prioridad)</Text>
          {criticalTasks.map(renderTaskItem)}
        </View>
      )}

      {/* Tareas vencidas */}
      {overdueTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Tareas Vencidas</Text>
          {overdueTasks.map(renderTaskItem)}
        </View>
      )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  header: { 
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 28
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
    letterSpacing: 0.3
  },
  heading: { 
    fontSize: 42, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5
  },
  scrollContent: {
    padding: 20
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6E6E73', 
    fontWeight: '500',
    marginBottom: 24,
    letterSpacing: 0.2
  },
  section: { marginBottom: 28 },
  sectionTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 16, 
    color: '#1A1A1A',
    letterSpacing: -0.5
  },
  summaryRow: { flexDirection: 'row', gap: 14 },
  summaryCard: { 
    flex: 1, 
    backgroundColor: '#34C759', 
    padding: 24, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5
  },
  summaryNumber: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  summaryLabel: { fontSize: 14, color: '#fff', marginTop: 6, fontWeight: '700', letterSpacing: 0.5 },
  areaCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 16, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  areaTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#1A1A1A', letterSpacing: -0.3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statItem: { alignItems: 'center', marginRight: 8, marginBottom: 8 },
  statBadge: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#6E6E73', textAlign: 'center', fontWeight: '600', letterSpacing: 0.3 },
  totalText: { fontSize: 16, fontWeight: '700', color: '#6E6E73', marginTop: 12, letterSpacing: 0.2 },
  taskCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 12, 
    borderLeftWidth: 4, 
    borderLeftColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { fontSize: 17, fontWeight: '700', flex: 1, color: '#1A1A1A', letterSpacing: -0.3 },
  priorityBadge: { 
    backgroundColor: '#FF3B30', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8
  },
  priorityText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  taskMeta: { fontSize: 15, color: '#6E6E73', marginBottom: 6, fontWeight: '500' },
  taskDue: { fontSize: 14, color: '#AEAEB2', fontWeight: '500', letterSpacing: 0.2 }
});
