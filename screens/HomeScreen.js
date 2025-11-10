// screens/HomeScreen.js
// Lista simple de tareas, añade tareas de ejemplo y persiste con AsyncStorage.
// Usa navigation para ir a detalle y chat.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import TaskItem from '../components/TaskItem';
import FilterBar from '../components/FilterBar';
import { loadTasks, saveTasks } from '../storage';
import * as Notifications from 'expo-notifications';

export default function HomeScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [filters, setFilters] = useState({ searchText: '', area: '', responsible: '', priority: '', overdue: false });

  // Cargar tareas cada vez que la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const loaded = await loadTasks();
        setTasks(loaded);
      })();
    }, [])
  );

  // Navegar a pantalla para crear nueva tarea
  const goToCreate = () => navigation.navigate('TaskDetail');

  const openDetail = (task) => {
    navigation.navigate('TaskDetail', { task });
  };

  const openChat = (task) => {
    navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
  };

  // Aplicar filtros
  const filteredTasks = tasks.filter(task => {
    // Búsqueda por título
    if (filters.searchText && !task.title.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    // Filtro por área
    if (filters.area && task.area !== filters.area) return false;
    // Filtro por responsable
    if (filters.responsible && task.assignedTo !== filters.responsible) return false;
    // Filtro por prioridad
    if (filters.priority && task.priority !== filters.priority) return false;
    // Filtro por vencidas
    if (filters.overdue && task.dueAt >= Date.now()) return false;
    return true;
  });

  const renderItem = ({ item }) => (
    <TaskItem
      task={item}
      onPress={(t) => openDetail(t)}
    />
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola! 👋</Text>
            <Text style={styles.heading}>Mis Tareas</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={goToCreate}>
            <LinearGradient
              colors={['#FFFFFF', '#F0F0F0']}
              style={styles.addButtonGradient}
            >
              <Text style={styles.addButtonText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FilterBar onFilterChange={setFilters} />

      <FlatList
        data={filteredTasks}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TaskItem task={item} onPress={() => openDetail(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Sin tareas pendientes</Text>
            <Text style={styles.emptySubtext}>Toca el botón + para crear una nueva tarea</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA'
  },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  addButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addButtonText: {
    color: '#667eea',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  },
  listContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.3
  },
  emptyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.8
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500'
  }
});
