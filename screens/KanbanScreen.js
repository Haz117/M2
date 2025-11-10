// screens/KanbanScreen.js
// Tablero Kanban con columnas por estado. Usa botones para cambiar estado de tareas.
// Estados: pendiente, en_proceso, en_revision, cerrada
// NOTA: Drag-and-drop requiere un build personalizado (Expo Dev Client), por ahora usa botones.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FilterBar from '../components/FilterBar';
import { loadTasks, saveTasks } from '../storage';

const STATUSES = [
  { key: 'pendiente', label: 'Pendiente', color: '#ff9800' },
  { key: 'en_proceso', label: 'En proceso', color: '#2196f3' },
  { key: 'en_revision', label: 'En revisión', color: '#9c27b0' },
  { key: 'cerrada', label: 'Cerrada', color: '#4caf50' }
];

export default function KanbanScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const t = await loadTasks();
    setTasks(t || []);
  };

  const persistTasks = async (newTasks) => {
    setTasks(newTasks);
    await saveTasks(newTasks);
  };

  const changeStatus = (taskId, newStatus) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t));
    persistTasks(updated);
  };

  const openDetail = (task) => navigation.navigate('TaskDetail', { task });

  // Aplicar filtros
  const applyFilters = (taskList) => {
    return taskList.filter(task => {
      if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      if (filters.area && task.area !== filters.area) return false;
      if (filters.responsible && task.assignedTo !== filters.responsible) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.overdue && task.dueAt >= Date.now()) return false;
      return true;
    });
  };

  const renderColumn = (status) => {
    const byStatus = tasks.filter(t => (t.status || 'pendiente') === status.key);
    const filtered = applyFilters(byStatus);

    return (
      <View key={status.key} style={styles.column}>
        <View style={[styles.columnHeader, { backgroundColor: status.color }]}>
          <Text style={styles.columnTitle}>{status.label}</Text>
          <Text style={styles.columnCount}>{filtered.length}</Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetail(item)}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.assignedTo || 'Sin asignar'} • {item.priority || 'media'}
              </Text>
              <Text style={styles.cardDue}>
                Vence: {new Date(item.dueAt).toLocaleDateString()}
              </Text>

              {/* Botones rápidos para cambiar estado */}
              <View style={styles.actionsRow}>
                {STATUSES.filter(s => s.key !== status.key).map(s => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => changeStatus(item.id, s.key)}
                    style={[styles.miniBtn, { backgroundColor: s.color }]}
                  >
                    <Text style={styles.miniBtnText}>{s.label.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 12 }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Vista de tablero 📊</Text>
            <Text style={styles.heading}>Kanban</Text>
          </View>
        </View>
      </LinearGradient>
      <FilterBar onFilterChange={setFilters} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {STATUSES.map(renderColumn)}
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
  board: { paddingHorizontal: 16, paddingVertical: 20 },
  column: { 
    width: 300, 
    marginHorizontal: 8, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  columnHeader: { 
    padding: 18, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  columnTitle: { 
    color: '#1A1A1A', 
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.2
  },
  columnCount: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '700',
    backgroundColor: '#6E6E73',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 28,
    textAlign: 'center'
  },
  card: { 
    margin: 12, 
    padding: 14, 
    backgroundColor: '#FAFAFA', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  cardActive: { 
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF'
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 8, 
    color: '#1A1A1A',
    letterSpacing: -0.3
  },
  cardMeta: { 
    fontSize: 14, 
    color: '#6E6E73', 
    marginBottom: 4, 
    fontWeight: '500'
  },
  cardDue: { 
    fontSize: 13, 
    color: '#AEAEB2',
    fontWeight: '500'
  },
  actionsRow: { 
    flexDirection: 'row', 
    marginTop: 12, 
    gap: 8, 
    flexWrap: 'wrap'
  },
  miniBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E5EA'
  },
  miniBtnText: { 
    color: '#007AFF', 
    fontSize: 13, 
    fontWeight: '600',
    letterSpacing: 0.2
  }
});
