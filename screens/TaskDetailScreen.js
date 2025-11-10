// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { loadTasks, saveTasks } from '../storage';
import { scheduleNotificationForTask, cancelNotification, cancelNotifications, scheduleDailyReminders, notifyAssignment } from '../services/notifications';

export default function TaskDetailScreen({ route, navigation }) {
  // Si route.params.task está presente, estamos editando; si no, creamos nueva
  const editingTask = route.params?.task || null;

  const [title, setTitle] = useState(editingTask ? editingTask.title : '');
  const [description, setDescription] = useState(editingTask ? editingTask.description : '');
  const [assignedTo, setAssignedTo] = useState(editingTask ? editingTask.assignedTo : '');
  const [area, setArea] = useState(editingTask ? editingTask.area : 'Jurídica');
  const [priority, setPriority] = useState(editingTask ? editingTask.priority : 'media');
  const [status, setStatus] = useState(editingTask ? editingTask.status : 'pendiente');
  const [dueAt, setDueAt] = useState(editingTask ? new Date(editingTask.dueAt) : new Date(Date.now() + 3600 * 1000));
  const [showPicker, setShowPicker] = useState(false);

  const areas = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
  const priorities = ['baja', 'media', 'alta'];
  const statuses = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

  useEffect(() => {
    navigation.setOptions({ title: editingTask ? 'Editar tarea' : 'Crear tarea' });
  }, [editingTask]);

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || dueAt;
    
    // En Android, el picker se cierra automáticamente
    if (Platform.OS === 'android') {
      setShowPicker(false);
      // Solo actualizar si se seleccionó una fecha (no se canceló)
      if (selectedDate) {
        setDueAt(currentDate);
      }
    } else {
      // En iOS, el picker permanece visible
      setDueAt(currentDate);
    }
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Validación', 'El título es obligatorio');
      return;
    }

    // Construir objeto tarea
    const task = editingTask
      ? { ...editingTask, title: title.trim(), description: description.trim(), assignedTo: assignedTo.trim(), area, priority, status, dueAt: dueAt.getTime(), updatedAt: Date.now() }
      : { id: String(Date.now()), title: title.trim(), description: description.trim(), assignedTo: assignedTo.trim(), area, priority, status, dueAt: dueAt.getTime(), createdAt: Date.now(), updatedAt: Date.now() };

    // Cargar tareas actuales, upsert y guardar
    try {
      const all = await loadTasks();
      const exists = all.findIndex(t => t.id === task.id);
      if (exists >= 0) {
        all[exists] = task;
      } else {
        all.unshift(task);
      }

      // Si la tarea ya tenía notificaciones previas, cancelarlas
      if (editingTask) {
        if (editingTask.notificationId) await cancelNotification(editingTask.notificationId);
        if (editingTask.dailyReminderIds) await cancelNotifications(editingTask.dailyReminderIds);
      }

      // Programar nueva notificación (10 min antes)
      const notifId = await scheduleNotificationForTask(task, { minutesBefore: 10 });
      if (notifId) task.notificationId = notifId;

      // Programar recordatorios diarios cada 24 hrs (solo si no está cerrada)
      if (task.status !== 'cerrada') {
        const dailyIds = await scheduleDailyReminders(task);
        if (dailyIds.length > 0) task.dailyReminderIds = dailyIds;
      }

      // Si es una tarea nueva o se cambió el responsable, notificar asignación
      const isNewTask = !editingTask;
      const assignedToChanged = editingTask && editingTask.assignedTo !== task.assignedTo;
      if ((isNewTask || assignedToChanged) && task.assignedTo) {
        await notifyAssignment(task);
      }

      // Actualizar la tarea con los IDs de notificación antes de guardar
      if (exists >= 0) {
        all[exists] = task;
      } else {
        all[0] = task; // Actualizar la primera posición con los IDs de notificación
      }

      await saveTasks(all);
      
      // Mostrar confirmación
      Alert.alert('Éxito', editingTask ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error guardando tarea:', e);
      Alert.alert('Error', `No se pudo guardar la tarea: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>TÍTULO</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Título corto" placeholderTextColor="#C7C7CC" style={styles.input} />

      <Text style={styles.label}>DESCRIPCIÓN</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Descripción" placeholderTextColor="#C7C7CC" style={[styles.input, {height:80}]} multiline />

      <Text style={styles.label}>ASIGNADO A</Text>
      <TextInput value={assignedTo} onChangeText={setAssignedTo} placeholder="Nombre del responsable" placeholderTextColor="#C7C7CC" style={styles.input} />

      <Text style={styles.label}>ÁREA</Text>
      <View style={styles.pickerRow}>
        {areas.map(a => (
          <TouchableOpacity
            key={a}
            onPress={() => setArea(a)}
            style={[styles.optionBtn, area === a && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, area === a && styles.optionTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>PRIORIDAD</Text>
      <View style={styles.pickerRow}>
        {priorities.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            style={[styles.optionBtn, priority === p && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, priority === p && styles.optionTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>ESTADO</Text>
      <View style={styles.pickerRow}>
        {statuses.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatus(s)}
            style={[styles.optionBtn, status === s && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, status === s && styles.optionTextActive]}>
              {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>FECHA COMPROMISO</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{dueAt.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dueAt}
          mode="datetime"
          display="default"
          onChange={onChangeDate}
          minimumDate={new Date()}
          is24Hour={true}
        />
      )}

      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>{editingTask ? 'Guardar Cambios' : 'Crear Tarea'}</Text>
      </TouchableOpacity>

      {editingTask && (
        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title })}>
          <Text style={styles.chatButtonText}>Abrir Chat</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFA'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6E6E73',
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3
  },
  scrollContent: {
    padding: 24
  },
  label: { 
    marginTop: 24, 
    marginBottom: 10,
    color: '#6E6E73', 
    fontWeight: '700', 
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    padding: 16, 
    backgroundColor: '#fff', 
    borderRadius: 12,
    color: '#1A1A1A',
    fontSize: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  dateButton: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  dateText: {
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '500'
  },
  pickerRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 10, 
    marginBottom: 8,
    gap: 10
  },
  optionBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA'
  },
  optionBtnActive: { 
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  optionText: { 
    fontSize: 15, 
    color: '#1A1A1A', 
    fontWeight: '600',
    letterSpacing: 0.2
  },
  optionTextActive: { 
    color: '#fff', 
    fontWeight: '700'
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  chatButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  chatButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600'
  }
});
