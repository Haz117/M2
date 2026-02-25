// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, Alert, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTask, updateTask, deleteTask } from '../services/tasks';
import { createTaskMultiple, updateTaskMultiple } from '../services/tasksMultiple';
import { getAllUsersNames } from '../services/roles';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { scheduleNotificationForTask, cancelNotification, notifyAssignment } from '../services/notifications';
import { getCurrentSession } from '../services/authFirestore';
import Toast from '../components/Toast';
import ShakeInput from '../components/ShakeInput';
import LoadingIndicator from '../components/LoadingIndicator';
import PressableButton from '../components/PressableButton';
import PomodoroTimer from '../components/PomodoroTimer';
import TagInput from '../components/TagInput';
import TaskStatusButtons from '../components/TaskStatusButtons';
import MultiUserSelector from '../components/MultiUserSelector';
import SubtasksList from '../components/SubtasksList';
import AreaSelectorModal from '../components/AreaSelectorModal';
import AssigneeProgress from '../components/AssigneeProgress';
import AreaCoordinationProgress from '../components/AreaCoordinationProgress';
import { confirmTaskCompletion, removeTaskConfirmation, hasUserConfirmed } from '../services/taskConfirmations';
import { useTheme } from '../contexts/ThemeContext';
import { savePomodoroSession } from '../services/pomodoro';
import { AREAS } from '../config/areas';
import { getAreaType } from '../config/areas';
import { 
  canEditTask, 
  canDelegateTask, 
  canCreateSubtask, 
  canChangeTaskStatus,
  canDeleteTask,
  canCreateTask,
  canAssignAreaSubtask,
  getPermissionsSummary,
  ROLES 
} from '../services/permissions';
import { createAreaSubtasks, getAreaSubtasks, subscribeToAreaSubtasks, getAreaProgressSummary } from '../services/areaSubtasks';

// Importar DateTimePicker solo en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function TaskDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  // Si route.params.task está presente, estamos editando; si no, creamos nueva
  const editingTask = route.params?.task || null;

  // Función para obtener mañana a las 9am por defecto
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };

  const [title, setTitle] = useState(editingTask ? editingTask.title : '');
  const [description, setDescription] = useState(editingTask ? editingTask.description : '');
  
  // Estado para múltiples asignados
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  
  // Mantener backward compatibility
  const [assignedTo, setAssignedTo] = useState(editingTask ? editingTask.assignedTo : '');
  
  // Múltiples áreas
  const [selectedAreas, setSelectedAreas] = useState(
    editingTask?.areas && Array.isArray(editingTask.areas) 
      ? editingTask.areas 
      : (editingTask?.area ? [editingTask.area] : [])
  );
  const [priority, setPriority] = useState(editingTask ? editingTask.priority : 'media');
  const [status, setStatus] = useState(editingTask ? editingTask.status : 'pendiente');
  const [dueAt, setDueAt] = useState(editingTask ? new Date(editingTask.dueAt) : getDefaultDate());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editingTask ? editingTask.isRecurring || false : false);
  const [recurrencePattern, setRecurrencePattern] = useState(editingTask ? editingTask.recurrencePattern || 'daily' : 'daily');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dueAt);
  const [peopleNames, setPeopleNames] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [canDelegate, setCanDelegate] = useState(false);
  const [canAddSubtask, setCanAddSubtask] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateUsers, setDelegateUsers] = useState([]);
  
  // Modal de selección de área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [saveProgress, setSaveProgress] = useState(null);
  
  // Estado de confirmaciones por asignado
  const [assigneeConfirmations, setAssigneeConfirmations] = useState([]);
  
  // Pomodoro & Tags state
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [tags, setTags] = useState(editingTask?.tags || []);
  const [estimatedHours, setEstimatedHours] = useState(editingTask?.estimatedHours?.toString() || '');
  
  // Expandir opciones avanzadas automáticamente si hay datos
  useEffect(() => {
    if (editingTask && (editingTask.tags?.length > 0 || editingTask.estimatedHours || editingTask.isRecurring)) {
      setShowAdvancedOptions(true);
    }
  }, [editingTask]);
  
  // Refs para inputs
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  
  // Animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const priorities = ['baja', 'media', 'alta'];
  const statuses = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

  // Mapeo de áreas a departamentos (usar useMemo para evitar recrear objetos)
  const areaToDepMap = useMemo(() => ({
    'Jurídica': 'juridica',
    'Obras': 'obras',
    'Tesorería': 'tesoreria',
    'Administración': 'administracion',
    'Recursos Humanos': 'rrhh'
  }), []);

  const depToAreaMap = useMemo(() => ({
    'juridica': 'Jurídica',
    'obras': 'Obras',
    'tesoreria': 'Tesorería',
    'administracion': 'Administración',
    'rrhh': 'Recursos Humanos'
  }), []);

  // Filtrar áreas según el rol del usuario
  const availableAreas = useMemo(() => {
    if (!currentUser) return AREAS;
    
    // Admin ve todas las áreas
    if (currentUser.role === 'admin') return AREAS;
    
    // Secretario solo ve su área principal y sus direcciones
    if (currentUser.role === 'secretario') {
      const secretarioAreas = [];
      
      // Agregar el área principal del secretario
      if (currentUser.area) {
        secretarioAreas.push(currentUser.area);
      }
      
      // Agregar las direcciones a cargo
      if (currentUser.direcciones && Array.isArray(currentUser.direcciones)) {
        secretarioAreas.push(...currentUser.direcciones);
      }
      
      // También usar areasPermitidas si está definido
      if (currentUser.areasPermitidas && Array.isArray(currentUser.areasPermitidas)) {
        currentUser.areasPermitidas.forEach(area => {
          if (!secretarioAreas.includes(area)) {
            secretarioAreas.push(area);
          }
        });
      }
      
      // Filtrar AREAS para solo mostrar las que coinciden EXACTAMENTE
      if (secretarioAreas.length > 0) {
        return AREAS.filter(area => secretarioAreas.includes(area));
      }
      
      // Si no tiene áreas definidas, solo mostrar su área principal
      return currentUser.area ? [currentUser.area] : [];
    }
    
    // Director solo ve su área específica
    if (currentUser.role === 'director') {
      if (currentUser.area) {
        return AREAS.filter(area => area === currentUser.area);
      }
      return [];
    }
    
    // Jefe ve su área/departamento
    if (currentUser.role === 'jefe') {
      const jefeAreas = [];
      if (currentUser.area) jefeAreas.push(currentUser.area);
      if (currentUser.department && !jefeAreas.includes(currentUser.department)) {
        jefeAreas.push(currentUser.department);
      }
      if (jefeAreas.length > 0) {
        return AREAS.filter(area => jefeAreas.includes(area));
      }
    }
    
    // Operativo ve todas las áreas pero solo para ver (no crear)
    return AREAS;
  }, [currentUser]);

  // 🔥 NUEVO: Filtrar áreas según los usuarios seleccionados (para admin)
  const areasFromSelectedUsers = useMemo(() => {
    // Solo para admin - filtrar áreas según usuarios seleccionados
    if (!currentUser || currentUser.role !== 'admin') return availableAreas;
    
    // Si no hay usuarios seleccionados, mostrar todas las áreas
    if (!selectedAssignees || selectedAssignees.length === 0) return availableAreas;
    
    // Recopilar todas las áreas de los usuarios seleccionados
    const userAreas = new Set();
    
    selectedAssignees.forEach(user => {
      // Agregar área principal del usuario
      if (user.area) {
        userAreas.add(user.area);
      }
      
      // Si es secretario, agregar sus direcciones
      if (user.role === 'secretario' && user.direcciones) {
        user.direcciones.forEach(dir => userAreas.add(dir));
      }
      
      // Agregar areasPermitidas si existen
      if (user.areasPermitidas && Array.isArray(user.areasPermitidas)) {
        user.areasPermitidas.forEach(area => userAreas.add(area));
      }
      
      // Agregar department si existe y es diferente
      if (user.department && user.department !== user.area) {
        userAreas.add(user.department);
      }
    });
    
    // Si encontramos áreas de usuarios, filtrar
    if (userAreas.size > 0) {
      return AREAS.filter(area => userAreas.has(area));
    }
    
    return availableAreas;
  }, [currentUser, selectedAssignees, availableAreas]);

  // 🔥 NUEVO: Auto-seleccionar área cuando se selecciona un usuario
  useEffect(() => {
    // Solo para admin y al crear nueva tarea
    if (!currentUser || currentUser.role !== 'admin' || editingTask) return;
    if (!selectedAssignees || selectedAssignees.length === 0) return;
    
    // Obtener las áreas de los usuarios seleccionados
    const userAreas = new Set();
    selectedAssignees.forEach(user => {
      if (user.area) userAreas.add(user.area);
    });
    
    // Si hay exactamente un área y no está ya seleccionada, auto-seleccionar
    if (userAreas.size === 1) {
      const userArea = Array.from(userAreas)[0];
      if (!selectedAreas.includes(userArea)) {
        setSelectedAreas([userArea]);
      }
    }
  }, [selectedAssignees, currentUser, editingTask]);

  // 🔥 Validar y auto-ajustar áreas cuando se selecciona un secretario (SOLO AL CREAR, NO AL EDITAR)
  useEffect(() => {
    const validateSecretarioAreas = async () => {
      // Solo validar al crear nueva tarea, no al editar
      if (editingTask) return;
      
      if (!selectedAssignees || selectedAssignees.length === 0) return;

      try {
        // Buscar secretarios en selectedAssignees
        const secretarios = selectedAssignees.filter(user => user.role === 'secretario');
        
        if (secretarios.length === 0) return;

        let needsUpdate = false;
        let validAreaFound = false;
        let firstValidArea = null;
        let secretarioName = null;

        // Obtener datos completos del secretario desde Firestore
        for (const secretario of secretarios) {
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', secretario.email));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) continue;
            
            const secretarioData = snapshot.docs[0].data();
            const secretarioAreas = new Set();
            
            // Recopilar todas las áreas disponibles del secretario
            if (secretarioData.area) secretarioAreas.add(secretarioData.area);
            if (secretarioData.direcciones && Array.isArray(secretarioData.direcciones)) {
              secretarioData.direcciones.forEach(dir => secretarioAreas.add(dir));
            }
            if (secretarioData.areasPermitidas && Array.isArray(secretarioData.areasPermitidas)) {
              secretarioData.areasPermitidas.forEach(area => secretarioAreas.add(area));
            }
            if (secretarioData.allowedAreas && Array.isArray(secretarioData.allowedAreas)) {
              secretarioData.allowedAreas.forEach(area => secretarioAreas.add(area));
            }

            // Validar que selectedAreas tengan overlap con las áreas del secretario
            validAreaFound = selectedAreas && selectedAreas.length > 0 && 
                           selectedAreas.some(area => secretarioAreas.has(area));
            
            // Si no hay área válida, preparar auto-selección
            if (!validAreaFound && secretarioAreas.size > 0) {
              needsUpdate = true;
              firstValidArea = Array.from(secretarioAreas)[0];
              secretarioName = secretario.displayName || secretario.email;
              break; // Solo procesamos el primer secretario sin área válida
            }
          } catch (error) {
            console.error(`Error validando secretario ${secretario.email}:`, error);
          }
        }

        // Si necesita actualización, hacerlo
        if (needsUpdate && firstValidArea) {
          setSelectedAreas([firstValidArea]);
          
          // Mostrar alerta al usuario
          Alert.alert(
            'Área Auto-Seleccionada',
            `El área fue auto-seleccionada a "${firstValidArea}" para coincidir con las áreas permitidas del secretario "${secretarioName}".`,
            [{ text: 'Entendido' }]
          );
        }
      } catch (error) {
        console.error('Error en validación de áreas:', error);
      }
    };

    validateSecretarioAreas();
  }, [selectedAssignees, editingTask]);

  const filteredAreas = useMemo(() => {
    // Usar areasFromSelectedUsers en lugar de availableAreas para admin
    const baseAreas = currentUser?.role === 'admin' ? areasFromSelectedUsers : availableAreas;
    if (!areaSearchQuery.trim()) return baseAreas;
    const query = areaSearchQuery.toLowerCase();
    return baseAreas.filter(area => area.toLowerCase().includes(query));
  }, [areaSearchQuery, areasFromSelectedUsers, availableAreas, currentUser]);

  useEffect(() => {
    navigation.setOptions({ 
      title: editingTask ? 'Editar tarea' : 'Crear tarea',
      headerRight: () => editingTask ? (
        <TouchableOpacity 
          onPress={() => setShowPomodoroModal(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="timer" size={24} color={theme.primary} />
        </TouchableOpacity>
      ) : null
    });
  }, [editingTask, theme, navigation]);

  useEffect(() => {
    loadUserNames();
    checkPermissions();
    initializeAssignees();
    
    // Animar entrada del formulario
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Inicializar asignados múltiples desde tarea existente
  const initializeAssignees = async () => {
    if (!editingTask) return;
    
    try {
      const names = await getAllUsersNames();
      
      // Backward compatibility: convertir assignedTo string a array
      let assigneesToConvert = [];
      
      if (editingTask.assignedToNames && Array.isArray(editingTask.assignedToNames)) {
        // Nueva estructura: ya es array
        const emails = editingTask.assignedTo || [];
        assigneesToConvert = Array.isArray(emails) ? emails : [emails];
      } else if (editingTask.assignments && Array.isArray(editingTask.assignments)) {
        // Si tiene array de assignments
        assigneesToConvert = editingTask.assignments.map(a => a.email || a);
      } else if (editingTask.assignedTo && typeof editingTask.assignedTo === 'string') {
        // Tarea antigua con string => convertir a array
        assigneesToConvert = [editingTask.assignedTo];
      }
      
      // Convertir a objetos con email y displayName
      const assigneesObjects = assigneesToConvert.map(email => ({
        email: email,
        displayName: names.includes(email) ? email : email
      }));
      
      setSelectedAssignees(assigneesObjects);
      
      // Inicializar estado de confirmaciones
      initializeConfirmations();
    } catch (error) {
      console.error('Error inicializando asignados:', error);
    }
  };
  
  // Inicializar confirmaciones de asignados
  const initializeConfirmations = () => {
    if (!editingTask) return;
    
    const assignedTo = editingTask.assignedTo || [];
    const assignedToNames = editingTask.assignedToNames || [];
    const completedBy = editingTask.completedBy || [];
    
    const confirmations = (Array.isArray(assignedTo) ? assignedTo : [assignedTo]).map((email, index) => {
      const confirmation = completedBy.find(c => c.email?.toLowerCase() === email?.toLowerCase());
      return {
        email,
        displayName: assignedToNames[index] || email,
        completed: !!confirmation,
        completedAt: confirmation?.completedAt || null
      };
    });
    
    setAssigneeConfirmations(confirmations);
  };
  
  // Confirmar mi parte de la tarea
  const handleConfirmMyPart = async () => {
    if (!editingTask || !currentUser) return;
    
    try {
      const result = await confirmTaskCompletion(editingTask.id, {
        email: currentUser.email,
        displayName: currentUser.displayName || currentUser.email,
        area: currentUser.department || ''
      });
      
      setToastMessage(result.allCompleted 
        ? '¡Tarea lista para revisión!' 
        : `Confirmado (${result.completedCount}/${result.totalAssigned})`
      );
      setToastType('success');
      setToastVisible(true);
      
      // Actualizar estado local
      initializeConfirmations();
      
      // Si todos confirmaron, actualizar status en pantalla
      if (result.allCompleted) {
        setStatus('en_revision');
      }
    } catch (error) {
      setToastMessage(error.message);
      setToastType('error');
      setToastVisible(true);
    }
  };
  
  // Quitar confirmación (solo admin)
  const handleRemoveConfirmation = async (userEmail) => {
    if (!editingTask) return;
    
    Alert.alert(
      'Quitar confirmación',
      '¿Quieres quitar la confirmación de este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Quitar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTaskConfirmation(editingTask.id, userEmail);
              setToastMessage('Confirmación removida');
              setToastType('success');
              setToastVisible(true);
              initializeConfirmations();
              setStatus('en_proceso');
            } catch (error) {
              setToastMessage(error.message);
              setToastType('error');
              setToastVisible(true);
            }
          }
        }
      ]
    );
  };

  const loadUserNames = async () => {
    const names = await getAllUsersNames();
    setPeopleNames(names);
  };

  const checkPermissions = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session);
      const role = result.session.role;
      setUserRole(role);
      
      // BLOQUEAR creación de tareas principales para secretarios y directores
      if (!editingTask && (role === 'secretario' || role === 'director')) {
        Alert.alert(
          'Acción no permitida',
          role === 'secretario' 
            ? 'Los secretarios solo pueden crear subtareas desde las tareas asignadas por el administrador.'
            : 'Los directores no pueden crear tareas. Contacta a tu secretario o administrador.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // NUEVO SISTEMA DE PERMISOS
      const user = result.session;
      
      // Si es operativo y está viendo una tarea, modo solo lectura
      if (role === 'operativo' && editingTask) {
        setIsReadOnly(true);
        setCanEdit(false);
        setCanDelegate(false);
        setCanAddSubtask(false);
      } else if (editingTask) {
        // Verificar permisos específicos para tarea existente
        const editPermission = canEditTask(user, editingTask);
        const delegatePermission = canDelegateTask(user, editingTask);
        const subtaskPermission = canCreateSubtask(user, editingTask);
        
        setCanEdit(editPermission.canEdit);
        setCanDelegate(delegatePermission.canDelegate);
        setCanAddSubtask(subtaskPermission.canCreate);
        setIsReadOnly(role === 'operativo' || role === 'director');
        
        console.log('Permisos:', { 
          canEdit: editPermission.canEdit, 
          canDelegate: delegatePermission.canDelegate,
          canAddSubtask: subtaskPermission.canCreate,
          reason: editPermission.reason 
        });
      } else {
        // Creando nueva tarea - solo admin y jefe
        const createPermission = canCreateTask(user);
        setCanEdit(createPermission.canCreate);
        setCanDelegate(false);
        setCanAddSubtask(false);
        setIsReadOnly(!createPermission.canCreate);
      }
      
      // Cargar usuarios para delegación si es secretario
      if (role === 'secretario' && editingTask) {
        loadDelegateUsers(user);
      }
    }
  };
  
  // Cargar usuarios disponibles para delegación
  const loadDelegateUsers = async (user) => {
    try {
      const delegatePermission = canDelegateTask(user, editingTask);
      if (!delegatePermission.canDelegate) return;
      
      // Obtener directores de las áreas permitidas
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'director'));
      const snapshot = await getDocs(q);
      
      const allowedAreas = delegatePermission.allowedAreas || [];
      const directors = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        // Solo mostrar directores de las áreas del secretario
        if (allowedAreas.includes(userData.area)) {
          directors.push({
            email: userData.email,
            displayName: userData.displayName || userData.email,
            area: userData.area
          });
        }
      });
      
      setDelegateUsers(directors);
    } catch (error) {
      console.error('Error cargando usuarios para delegación:', error);
    }
  };

  const onChangeDate = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        // En Android, mostrar el time picker después de seleccionar la fecha
        setTimeout(() => setShowTimePicker(true), 100);
      } else {
        // En iOS, actualizar directamente
        const newDate = new Date(dueAt);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDueAt(newDate);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  }, [dueAt]);

  const onChangeTime = useCallback((event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      // Combinar fecha de tempDate con la hora seleccionada
      const finalDate = new Date(tempDate);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setDueAt(finalDate);
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  }, [tempDate]);

  const save = async () => {
    if (isSaving) return; // Prevenir doble clic
    
    // Validaciones de campos
    if (!title.trim()) {
      titleInputRef.current?.shake();
      setToastMessage('El título es obligatorio');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (title.trim().length < 3) {
      titleInputRef.current?.shake();
      setToastMessage('El título debe tener al menos 3 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (title.trim().length > 100) {
      titleInputRef.current?.shake();
      setToastMessage('El título no puede tener más de 100 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!description.trim()) {
      descriptionInputRef.current?.shake();
      setToastMessage('La descripción es obligatoria');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (description.trim().length < 10) {
      descriptionInputRef.current?.shake();
      setToastMessage('La descripción debe tener al menos 10 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validar múltiples asignados
    if (!selectedAssignees || selectedAssignees.length === 0) {
      setToastMessage('Debes asignar la tarea a al menos una persona');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validar múltiples áreas
    if (!selectedAreas || selectedAreas.length === 0) {
      setToastMessage('Debes seleccionar al menos una área');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validar que la fecha no sea demasiado en el pasado
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hora atrás
    if (!editingTask && dueAt.getTime() < oneHourAgo) {
      Alert.alert(
        'Fecha en el pasado',
        '¿Estás seguro de crear una tarea con fecha vencida?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => proceedWithSave() }
        ]
      );
      return;
    }

    await proceedWithSave();
  };

  // Helper para actualizar progreso del padre si es subtarea de área
  const updateParentProgressIfNeeded = async () => {
    if (editingTask?.isAreaSubtask && editingTask?.parentTaskId) {
      try {
        const { updateParentTaskProgress } = await import('../services/areaSubtasks');
        await updateParentTaskProgress(editingTask.parentTaskId);
        console.log('[TaskDetail] Progreso del padre actualizado');
      } catch (error) {
        console.error('[TaskDetail] Error actualizando progreso del padre:', error);
      }
    }
  };

  const proceedWithSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    
    // Simular progreso
    const progressInterval = setInterval(() => {
      setSaveProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);
    
    try {
      // Validar permisos
      if (!currentUser) {
        Alert.alert('Error', 'No estás autenticado');
        setIsSaving(false);
        return;
      }

      // NUEVO SISTEMA DE PERMISOS
      // Verificar si puede editar usando el servicio centralizado
      const editPermission = canEditTask(currentUser, editingTask || {});
      
      // Operativos solo pueden actualizar status de sus tareas asignadas
      if (currentUser.role === 'operativo' && editingTask) {
        const statusPermission = canChangeTaskStatus(currentUser, editingTask);
        if (!statusPermission.canChange) {
          Alert.alert('Sin permisos', statusPermission.reason);
          setIsSaving(false);
          return;
        }
        // Actualizar solo el status
        await updateTask(editingTask.id, { status });
        await updateParentProgressIfNeeded(); // Actualizar progreso del padre si es subtarea
        setIsSaving(false);
        setToastMessage('Estado actualizado');
        setToastType('success');
        setToastVisible(true);
        setTimeout(() => navigation.goBack(), 800);
        return;
      }

      // Secretarios solo pueden cambiar status, NO editar datos de la tarea
      if (currentUser.role === 'secretario' && editingTask) {
        const statusPermission = canChangeTaskStatus(currentUser, editingTask);
        if (statusPermission.canChange) {
          // Solo actualizar el status
          await updateTask(editingTask.id, { status });
          await updateParentProgressIfNeeded(); // Actualizar progreso del padre si es subtarea
          setIsSaving(false);
          setToastMessage('Estado actualizado');
          setToastType('success');
          setToastVisible(true);
          setTimeout(() => navigation.goBack(), 800);
          return;
        } else {
          Alert.alert('Sin permisos', 'Los secretarios solo pueden delegar tareas y crear subtareas');
          setIsSaving(false);
          return;
        }
      }
      
      // Directores solo pueden cambiar status de sus tareas
      if (currentUser.role === 'director' && editingTask) {
        const statusPermission = canChangeTaskStatus(currentUser, editingTask);
        if (statusPermission.canChange) {
          await updateTask(editingTask.id, { status });
          await updateParentProgressIfNeeded(); // Actualizar progreso del padre si es subtarea
          setIsSaving(false);
          setToastMessage('Estado actualizado');
          setToastType('success');
          setToastVisible(true);
          setTimeout(() => navigation.goBack(), 800);
          return;
        } else {
          Alert.alert('Sin permisos', statusPermission.reason);
          setIsSaving(false);
          return;
        }
      }

      // Solo admin y jefe pueden crear/editar tareas completas
      if (!editPermission.canEdit) {
        Alert.alert('Sin permisos', editPermission.reason);
        setIsSaving(false);
        return;
      }

      // Jefes solo pueden crear/editar tareas de su área
      if (currentUser.role === 'jefe') {
        const hasPermissionForAreas = selectedAreas.some(area => {
          const taskDepartment = areaToDepMap[area] || area.toLowerCase();
          return taskDepartment === currentUser.department;
        });
        if (!hasPermissionForAreas) {
          Alert.alert('Sin permisos', 'Solo puedes crear/editar tareas de tu área');
          setIsSaving(false);
          return;
        }
      }

      // Animación de presión
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Construir objeto tarea con múltiples asignados y múltiples áreas
      const assignedEmails = selectedAssignees.map(a => a.email);
      
      // 🔥 VALIDAR Y LIMPIAR ÁREAS INVÁLIDAS PARA SECRETARIOS AL ACTUALIZAR
      let validareas = selectedAreas;
      if (editingTask) {
        try {
          const secretariosEnTarea = selectedAssignees.filter(user => user.role === 'secretario');
          
          if (secretariosEnTarea.length > 0) {
            // Obtener todas las áreas válidas de los secretarios
            const areasValidasParaSecretarios = new Set();
            
            for (const secretario of secretariosEnTarea) {
              try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', secretario.email));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                  const secretarioData = snapshot.docs[0].data();
                  
                  if (secretarioData.area) areasValidasParaSecretarios.add(secretarioData.area);
                  if (secretarioData.direcciones && Array.isArray(secretarioData.direcciones)) {
                    secretarioData.direcciones.forEach(dir => areasValidasParaSecretarios.add(dir));
                  }
                  if (secretarioData.areasPermitidas && Array.isArray(secretarioData.areasPermitidas)) {
                    secretarioData.areasPermitidas.forEach(area => areasValidasParaSecretarios.add(area));
                  }
                  if (secretarioData.allowedAreas && Array.isArray(secretarioData.allowedAreas)) {
                    secretarioData.allowedAreas.forEach(area => areasValidasParaSecretarios.add(area));
                  }
                }
              } catch (error) {
                console.error(`Error validando secretario ${secretario.email}:`, error);
              }
            }
            
            // Filtrar selectedAreas para dejar solo las válidas
            if (areasValidasParaSecretarios.size > 0) {
              validareas = selectedAreas.filter(area => areasValidasParaSecretarios.has(area));
              
              // Si después del filtro quedan áreas, usarlas; si no, usar todas (admin override)
              if (validareas.length === 0) {
                validareas = selectedAreas;
              }
            }
          }
        } catch (error) {
          console.error('Error validando áreas de secretarios:', error);
          validareas = selectedAreas;
        }
      }
      
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedEmails: assignedEmails, // Array de emails para múltiples asignados
        areas: validareas, // Array de áreas validadas
        area: validareas[0], // Backward compatibility: primera área como principal
        priority,
        status,
        dueAt: dueAt.getTime(),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        lastRecurrenceCreated: isRecurring ? dueAt.getTime() : null,
        tags,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        // Agregar timestamp de actualización para sincronización en tiempo real
        ...(editingTask && { updatedAt: new Date().getTime() })
      };

      let taskId;
      
      if (editingTask) {
        // Actualizar tarea existente
        taskId = editingTask.id;
        
        // Cancelar notificación previa solo si existe
        if (editingTask.notificationId) {
          await cancelNotification(editingTask.notificationId);
        }
        
        setSaveProgress(60);
        // Usar updateTaskMultiple para tareas con múltiples asignados
        await updateTaskMultiple(taskId, taskData);
        setSaveProgress(100);
        
        // Mostrar toast de éxito
        setToastMessage('Tarea actualizada exitosamente');
        setToastType('success');
        setToastVisible(true);
        
        // Navegar después de un breve delay
        setTimeout(() => {
          setSaveProgress(null);
          navigation.goBack();
        }, 1000);
      } else {
        // Crear nueva tarea con múltiples asignados
        setSaveProgress(60);
        taskId = await createTaskMultiple(taskData);
        
        // Si la tarea tiene múltiples áreas, crear subtareas de coordinación
        if (selectedAreas.length > 1) {
          setSaveProgress(80);
          const subtaskResult = await createAreaSubtasks(taskData, taskId);
          console.log('[TaskDetail] Subtareas de coordinación creadas:', subtaskResult);
        }
        
        setSaveProgress(100);
        
        // Mostrar toast de éxito
        const mensaje = selectedAreas.length > 1 
          ? `Tarea creada con ${selectedAreas.length} subtareas de coordinación`
          : 'Tarea creada exitosamente';
        setToastMessage(mensaje);
        setToastType('success');
        setToastVisible(true);
        
        // Navegar después de un breve delay
        setTimeout(() => {
          setSaveProgress(null);
          navigation.goBack();
        }, 1000);
      }

      // Crear objeto task completo con ID para notificaciones
      const task = { ...taskData, id: taskId };

      // Programar notificaciones solo si la tarea no está cerrada (async, no bloquea)
      if (task.status !== 'cerrada') {
        scheduleNotificationForTask(task, { minutesBefore: 10 }).then(notifId => {
          if (notifId) {
            updateTaskMultiple(taskId, { notificationId: notifId });
          }
        });
      }

      // Notificar asignación si es tarea nueva o cambió el responsable (async)
      const isNewTask = !editingTask;
      const assignedToChanged = editingTask && JSON.stringify(assignedEmails) !== JSON.stringify(editingTask.assignedTo);
      if ((isNewTask || assignedToChanged) && assignedEmails.length > 0) {
        notifyAssignment(task);
      }
      
      setIsSaving(false);
      setSaveProgress(null);
    } catch (e) {
      clearInterval(progressInterval);
      setIsSaving(false);
      setSaveProgress(null);
      
      // Mostrar toast de error
      setToastMessage(`Error al guardar: ${e.message || 'Error desconocido'}`);
      setToastType('error');
      setToastVisible(true);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Tarea',
      '¿Estás seguro que deseas eliminar esta tarea? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await deleteTask(editingTask.id);
              setToastMessage('Tarea eliminada correctamente');
              setToastType('success');
              setToastVisible(true);
              setTimeout(() => navigation.goBack(), 1000);
            } catch (error) {
              setToastMessage('Error al eliminar la tarea');
              setToastType('error');
              setToastVisible(true);
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Memoizar handlers para evitar recrearlos en cada render
  const toggleAreaSelection = useCallback((a) => {
    const areaDep = areaToDepMap[a] || a.toLowerCase();
    
    // Determinar si puede seleccionar el área según el rol
    let canSelectArea = false;
    if (currentUser?.role === 'admin') {
      // Admin puede seleccionar áreas de los usuarios seleccionados
      canSelectArea = canEdit && areasFromSelectedUsers.includes(a);
    } else if (currentUser?.role === 'secretario') {
      // Secretario puede seleccionar áreas de su lista
      canSelectArea = canEdit && availableAreas.includes(a);
    } else if (currentUser?.role === 'jefe') {
      canSelectArea = canEdit && areaDep === currentUser?.department;
    }
    
    if (!canSelectArea) return;
    
    // Toggle: agregar o remover el área
    setSelectedAreas(prev => {
      if (prev.includes(a)) {
        // Remover, pero mantener al menos una área
        return prev.length > 1 ? prev.filter(area => area !== a) : prev;
      } else {
        // Agregar
        return [...prev, a];
      }
    });
  }, [canEdit, currentUser, areaToDepMap, availableAreas, areasFromSelectedUsers]);

  const handlePriorityChange = useCallback((p) => {
    if (canEdit) setPriority(p);
  }, [canEdit]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setStatus(newStatus);
    await updateTask(taskId, { status: newStatus });
    
    // Si es una subtarea de coordinación, actualizar el progreso del padre
    if (editingTask?.isAreaSubtask && editingTask?.parentTaskId) {
      try {
        const { updateParentTaskProgress } = await import('../services/areaSubtasks');
        await updateParentTaskProgress(editingTask.parentTaskId);
        console.log('[TaskDetail] Progreso del padre actualizado');
      } catch (error) {
        console.error('[TaskDetail] Error actualizando progreso del padre:', error);
      }
    }
    
    // Mostrar mensaje de confirmación
    setToastMessage('Tarea iniciada correctamente');
    setToastType('success');
    setToastVisible(true);
    
    // Cerrar el modal después de un breve delay
    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  }, [navigation, editingTask]);

  // Función para delegar tarea a un director
  const handleDelegate = async (director) => {
    if (!editingTask || !director) return;
    
    // Verificar si es una subtarea de área
    if (editingTask.isAreaSubtask && currentUser) {
      const permission = canAssignAreaSubtask(currentUser, editingTask);
      if (!permission.canAssign) {
        Alert.alert('Sin permisos', permission.reason);
        return;
      }
      
      // Si el usuario es secretario, no permitir multi-asignación
      if (currentUser.role === 'secretario' && !permission.multiAssignAllowed) {
        // Verificar si ya hay asignados
        const currentAssignees = editingTask.assignedTo || [];
        if (currentAssignees.length > 0) {
          Alert.alert(
            'Una sola asignación permitida',
            'Las subtareas solo pueden asignarse a UN director. Para cambiar el asignado actual, elimina primero la asignación anterior.'
          );
          return;
        }
      }
    }
    
    try {
      setIsSaving(true);
      
      // Actualizar los asignados de la tarea
      const newAssignees = [director.email];
      const newAssigneesNames = [director.displayName];
      
      await updateTaskMultiple(editingTask.id, {
        assignedEmails: newAssignees,
        assignedTo: newAssignees,
        assignedToNames: newAssigneesNames
      });
      
      // Notificar al nuevo asignado
      try {
        const { notifyTaskAssigned } = await import('../services/emailNotifications');
        await notifyTaskAssigned({
          ...editingTask,
          assignedTo: newAssignees
        });
      } catch (notifError) {
        console.log('Error enviando notificación:', notifError);
      }
      
      setToastMessage(`Tarea delegada a ${director.displayName}`);
      setToastType('success');
      setToastVisible(true);
      setShowDelegateModal(false);
      
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (error) {
      console.error('Error al delegar:', error);
      setToastMessage('Error al delegar la tarea');
      setToastType('error');
      setToastVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal de detalles para operativos */}
      {isReadOnly && editingTask && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => navigation.goBack()}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.readOnlyModalContainer, { backgroundColor: theme.card }]}>
              {/* Header */}
              <View style={[styles.readOnlyHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.readOnlyTitle, { color: theme.text }]}>Detalles de la Tarea</Text>
                <TouchableOpacity 
                  onPress={() => navigation.goBack()}
                  style={styles.readOnlyCloseButton}
                >
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.readOnlyContent} showsVerticalScrollIndicator={true}>
                {/* Nombre */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Nombre de la Tarea</Text>
                  <View style={[styles.readOnlyField, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.readOnlyFieldText, { color: theme.text }]}>
                      {editingTask.title}
                    </Text>
                  </View>
                </View>

                {/* Descripción */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Lo que debes hacer</Text>
                  <View style={[styles.readOnlyFieldLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.readOnlyFieldText, { color: theme.text }]}>
                      {editingTask.description || 'Sin descripción'}
                    </Text>
                  </View>
                </View>

                {/* Botones de cambio de estado */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Cambiar Estado</Text>
                  <TaskStatusButtons 
                    currentStatus={editingTask.status || 'pendiente'}
                    taskId={editingTask.id}
                    onStatusChange={handleStatusChange}
                    task={editingTask}
                  />
                </View>

                {/* Subtareas */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Subtareas</Text>
                  <SubtasksList 
                    taskId={editingTask.id}
                    canEdit={false}
                    canDelegate={false}
                    delegateUsers={[]}
                    currentUser={currentUser}
                  />
                </View>

                {/* Coordinación entre Áreas (si es tarea multi-área) */}
                {editingTask?.isCoordinationTask && (
                  <View style={styles.readOnlySection}>
                    <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Progreso por Área</Text>
                    <AreaCoordinationProgress 
                      parentTaskId={editingTask.id}
                      currentUserArea={currentUser?.area}
                      onSubtaskPress={(subtask) => {
                        navigation.navigate('TaskDetail', { task: subtask });
                      }}
                    />
                  </View>
                )}

                {/* Botón para acceder a Reportes y Chat */}
                <View style={styles.readOnlySection}>
                  <Text style={[styles.readOnlyLabel, { color: theme.textSecondary }]}>Más Opciones</Text>
                  <View style={{ gap: 12, marginTop: 10 }}>
                    {/* Botón Reportes */}
                    <TouchableOpacity 
                      style={[styles.readOnlyActionButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        navigation.goBack();
                        setTimeout(() => {
                          navigation.navigate('TaskReportsAndActivity', { taskId: editingTask.id, taskTitle: editingTask.title });
                        }, 300);
                      }}
                    >
                      <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.readOnlyActionButtonText}>📊 Ver/Enviar Reportes</Text>
                    </TouchableOpacity>

                    {/* Botón Chat */}
                    <TouchableOpacity 
                      style={[styles.readOnlyActionButton, { backgroundColor: '#007AFF' }]}
                      onPress={() => {
                        navigation.goBack();
                        setTimeout(() => {
                          navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title });
                        }, 300);
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.readOnlyActionButtonText}>💬 Ir al Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                style={[styles.readOnlyCloseButtonBottom, { backgroundColor: theme.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.readOnlyCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Vista normal si no es read-only */}
      {!isReadOnly && (
        <View style={styles.container}>
      <View style={[styles.headerBar, { backgroundColor: '#9F2241' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons 
            name={editingTask ? 'pencil' : 'sparkles'} 
            size={20} 
            color="#FFFFFF" 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.headerTitle}>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
        </View>
        {editingTask && currentUser?.role === 'admin' && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!editingTask && <View style={{ width: 40 }} />}
      </View>
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN BÁSICA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="document-text" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Información Básica</Text>
            </View>
            
            <Text style={styles.label}>TÍTULO *</Text>
            <ShakeInput
              ref={titleInputRef}
              value={title} 
              onChangeText={setTitle} 
              placeholder="¿Qué hay que hacer?" 
              placeholderTextColor={isDark ? '#666' : '#A0A0A0'} 
              style={styles.input}
              editable={canEdit}
              error={!title.trim() && title.length > 0}
            />

            <Text style={styles.label}>DESCRIPCIÓN *</Text>
            <ShakeInput
              ref={descriptionInputRef}
              value={description} 
              onChangeText={setDescription} 
              placeholder="Describe los detalles de la tarea..." 
              placeholderTextColor={isDark ? '#666' : '#A0A0A0'} 
              style={[styles.input, {height: 100, textAlignVertical: 'top', paddingTop: 14}]} 
              multiline
              editable={canEdit}
              error={!description.trim() && description.length > 0}
            />
          </View>

          {/* SECCIÓN ASIGNACIÓN */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="people" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Asignación y Área</Text>
            </View>
            
            {/* Selector de Asignados Múltiples */}
            <Text style={[styles.label, { marginTop: 8, marginBottom: 12 }]}>ASIGNADOS A *</Text>
            <View style={{ opacity: canEdit ? 1 : 0.5 }}>
              <MultiUserSelector
                selectedUsers={selectedAssignees}
                onSelectionChange={setSelectedAssignees}
                role={currentUser?.role || 'admin'}
                area={currentUser?.department || selectedAreas[0]}
                allowedAreas={currentUser?.direcciones || currentUser?.areasPermitidas || []}
              />
            </View>
            
            {/* Progreso de confirmaciones por asignado - Solo para tareas existentes con múltiples asignados */}
            {editingTask && assigneeConfirmations.length > 1 && (
              <AssigneeProgress
                assignees={assigneeConfirmations}
                currentUserEmail={currentUser?.email}
                onConfirm={handleConfirmMyPart}
                onRemoveConfirmation={currentUser?.role === 'admin' ? handleRemoveConfirmation : null}
                isAdmin={currentUser?.role === 'admin'}
              />
            )}

            {/* Selector de Múltiples Áreas */}
            <Text style={[styles.label, { marginTop: 28, marginBottom: 14 }]}>ÁREAS *</Text>
            
            {/* Mensaje informativo cuando hay usuarios seleccionados (solo admin) */}
            {currentUser?.role === 'admin' && selectedAssignees.length > 0 && (
              <View style={[styles.areaHintContainer, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                <Ionicons name="information-circle" size={18} color={theme.primary} />
                <Text style={[styles.areaHintText, { color: theme.primary }]}>
                  {areasFromSelectedUsers.length === 1 
                    ? `Área auto-filtrada: ${areasFromSelectedUsers[0].replace('Dirección de ', '').replace('Secretaría de ', '')}` 
                    : `Mostrando ${areasFromSelectedUsers.length} áreas de ${selectedAssignees.length === 1 ? 'la persona' : 'las personas'} seleccionada${selectedAssignees.length > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
            )}
            
            {/* Mostrar áreas seleccionadas como pills */}
            {selectedAreas.length > 0 && (
              <View style={styles.selectedAreasContainer}>
                {selectedAreas.map((a) => (
                  <View key={a} style={[styles.areaPill, { backgroundColor: theme.primary }]}>
                    <Ionicons name="folder" size={16} color="#FFFFFF" />
                    <Text style={styles.areaPillText} numberOfLines={1}>
                      {a.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                    </Text>
                    {canEdit && (
                      <TouchableOpacity 
                        onPress={() => toggleAreaSelection(a)}
                        style={styles.areaPillRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Botón para agregar más áreas */}
            <TouchableOpacity
              style={[
                styles.areaButton,
                {
                  borderColor: selectedAreas.length === 0 ? theme.primary : theme.primary,
                  backgroundColor: selectedAreas.length === 0 
                    ? (isDark ? theme.primary + '10' : theme.primary + '08')
                    : (isDark ? theme.primary + '15' : theme.primary + '08'),
                  opacity: canEdit ? 1 : 0.5,
                },
              ]}
              onPress={() => setShowAreaModal(true)}
              activeOpacity={0.8}
              disabled={!canEdit}
            >
              <View style={[
                styles.areaButtonIcon, 
                { backgroundColor: selectedAreas.length === 0 ? theme.primary : theme.primary }
              ]}>
                <Ionicons 
                  name={selectedAreas.length > 0 ? "add" : "folder-open"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.areaButtonInfo}>
                <Text style={[
                  styles.areaButtonLabel, 
                  { color: selectedAreas.length === 0 ? theme.primary : theme.textSecondary }
                ]}>
                  {selectedAreas.length > 0 ? 'AGREGAR MÁS ÁREAS' : 'SELECCIONAR ÁREA'}
                </Text>
                <Text style={[
                  styles.areaButtonValue, 
                  { 
                    color: selectedAreas.length === 0 ? theme.text : theme.text,
                    fontWeight: selectedAreas.length === 0 ? '600' : '700'
                  }
                ]}>
                  {selectedAreas.length === 0 
                    ? 'Toca para asignar área' 
                    : `${selectedAreas.length} ${selectedAreas.length === 1 ? 'área' : 'áreas'} seleccionada${selectedAreas.length > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
              <View style={[
                styles.areaButtonChevron, 
                { backgroundColor: theme.primary + '15' }
              ]}>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={theme.primary} 
                />
              </View>
            </TouchableOpacity>
          </View>
          {/* Modal de Selección de Área - Componente Mejorado */}
          <AreaSelectorModal
            visible={showAreaModal}
            onClose={() => setShowAreaModal(false)}
            selectedAreas={selectedAreas}
            onAreasChange={setSelectedAreas}
            allAreas={currentUser?.role === 'admin' ? areasFromSelectedUsers : availableAreas}
            theme={theme}
            isDark={isDark}
          />

          {/* SECCIÓN PRIORIDAD Y FECHA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 12 }}>
                <Ionicons name="flag" size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Prioridad y Fecha</Text>
            </View>
            
            <Text style={styles.label}>PRIORIDAD *</Text>
            <View style={styles.pickerRow}>
              {priorities.map((p, index) => {
                const priorityColors = {
                  'alta': '#E53935',
                  'media': '#FB8C00', 
                  'baja': '#43A047'
                };
                const isActive = priority === p;
                const pColor = priorityColors[p] || theme.primary;
                
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handlePriorityChange(p)}
                    style={[
                      styles.optionBtn, 
                      isActive && [styles.optionBtnActive, { backgroundColor: pColor, borderColor: pColor }],
                      !canEdit && styles.optionBtnDisabled
                    ]}
                    disabled={!canEdit}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons 
                        name={isActive ? "flag" : "flag-outline"} 
                        size={18} 
                        color={isActive ? "#FFFFFF" : pColor} 
                      />
                      <Text style={[
                        styles.optionText, 
                        isActive && styles.optionTextActive,
                        !isActive && { color: pColor }
                      ]} numberOfLines={1}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>FECHA COMPROMISO *</Text>
            {/* Solo admin y jefe pueden cambiar fecha al editar */}
            {editingTask && currentUser && !['admin', 'jefe'].includes(currentUser.role) ? (
              <View 
                style={[styles.datePickerButton, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(150,150,150,0.1)' : 'rgba(150,150,150,0.05)', opacity: 0.7 }]}
              >
                <View style={styles.datePickerContent}>
                  <View style={[styles.datePickerIcon, { backgroundColor: theme.textSecondary }]}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.datePickerInfo}>
                    <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>
                      Fecha y hora (no editable)
                    </Text>
                    <Text style={[styles.datePickerValue, { color: theme.textSecondary }]}>
                      {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.datePickerTime}>
                      <Ionicons name="time" size={14} color={theme.textSecondary} />
                      <Text style={[styles.datePickerTimeText, { color: theme.textSecondary }]}>
                        {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="lock-closed" size={18} color={theme.textSecondary} />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.datePickerButton, { borderColor: theme.primary, backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}10` }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.datePickerContent}>
                  <View style={[styles.datePickerIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.datePickerInfo}>
                    <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>
                      Fecha y hora
                    </Text>
                    <Text style={[styles.datePickerValue, { color: theme.text }]}>
                      {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.datePickerTime}>
                      <Ionicons name="time" size={14} color={theme.primary} />
                      <Text style={[styles.datePickerTimeText, { color: theme.textSecondary }]}>
                        {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={theme.primary} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* SECCIÓN ESTADO (solo al editar) */}
          {editingTask && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Estado</Text>
              </View>
              
              <Text style={styles.label}>ESTADO</Text>
              <View style={styles.pickerRow}>
                {statuses.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    style={[styles.optionBtn, status === s && styles.optionBtnActive]}
                  >
                    <Text style={[styles.optionText, status === s && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">
                      {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* BOTÓN OPCIONES AVANZADAS */}
          <TouchableOpacity 
            style={[styles.advancedToggle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <View style={styles.advancedToggleContent}>
              <Ionicons 
                name={showAdvancedOptions ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={theme.primary} 
              />
              <Text style={[styles.advancedToggleText, { color: theme.text }]}>
                {showAdvancedOptions ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
              </Text>
              {!showAdvancedOptions && (tags.length > 0 || estimatedHours || isRecurring) && (
                <View style={[styles.advancedBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.advancedBadgeText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.advancedToggleHint, { color: theme.textSecondary }]}>
              Etiquetas, tiempo estimado y recurrencia
            </Text>
          </TouchableOpacity>

          {/* OPCIONES AVANZADAS */}
          {showAdvancedOptions && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="settings" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Opciones Avanzadas</Text>
              </View>
              
              <Text style={styles.label}>TIEMPO ESTIMADO (HORAS)</Text>
              <TextInput
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                placeholder="Ej: 2.5"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text }]}
                editable={canEdit}
              />

              <Text style={styles.label}>ETIQUETAS</Text>
              <TagInput
                tags={tags}
                onTagsChange={setTags}
                placeholder="Agregar etiquetas..."
                maxTags={10}
              />

              {/* Sección de Recurrencia */}
              <View style={[styles.formSection, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginTop: 16 }]}>
                <TouchableOpacity 
                  onPress={() => setIsRecurring(!isRecurring)}
                  disabled={!canEdit}
                  style={[styles.recurrenceHeader, { backgroundColor: isRecurring ? theme.primary + '10' : 'transparent' }]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons name="repeat" size={22} color={isRecurring ? theme.primary : theme.textSecondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarea Recurrente</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                        {isRecurring 
                          ? recurrencePattern === 'daily' ? 'Se repite cada día' 
                            : recurrencePattern === 'weekly' ? 'Se repite cada semana'
                            : 'Se repite cada mes'
                          : 'Activar para repetir automáticamente'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.toggleSwitch, 
                    { backgroundColor: isRecurring ? theme.primary : theme.border }
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      isRecurring && styles.toggleThumbActive,
                      { backgroundColor: '#FFFFFF' }
                    ]} />
                  </View>
                </TouchableOpacity>
                
                {isRecurring && (
                  <View style={styles.recurrenceOptions}>
                    <Text style={[styles.recurrenceLabel, { color: theme.textSecondary }]}>Frecuencia:</Text>
                    {['daily', 'weekly', 'monthly'].map((pattern) => (
                      <TouchableOpacity
                        key={pattern}
                        onPress={() => setRecurrencePattern(pattern)}
                        style={[
                          styles.recurrenceOption,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          recurrencePattern === pattern && { 
                            borderColor: theme.primary, 
                            backgroundColor: theme.primary + '15',
                            borderWidth: 2
                          }
                        ]}
                        disabled={!canEdit}
                      >
                        <Ionicons 
                          name={pattern === 'daily' ? 'today' : pattern === 'weekly' ? 'calendar' : 'calendar-number'} 
                          size={24} 
                          color={recurrencePattern === pattern ? theme.primary : theme.textSecondary} 
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.recurrenceOptionText,
                            { color: recurrencePattern === pattern ? theme.primary : theme.text }
                          ]}>
                            {pattern === 'daily' ? 'Diaria' : pattern === 'weekly' ? 'Semanal' : 'Mensual'}
                          </Text>
                          <Text style={[
                            styles.recurrenceOptionDesc,
                            { color: theme.textSecondary }
                          ]}>
                            {pattern === 'daily' ? 'Se repite cada día' 
                              : pattern === 'weekly' ? 'Se repite cada 7 días'
                              : 'Se repite cada mes'}
                          </Text>
                        </View>
                        {recurrencePattern === pattern && (
                          <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          
          {Platform.OS !== 'web' && (
            <>
              {showDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()}
                />
              )}
              
              {showTimePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="default"
                  onChange={onChangeTime}
                  is24Hour={true}
                />
              )}
            </>
          )}

          {/* Modal de fecha y hora personalizado para web */}
          {Platform.OS === 'web' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.dateModalOverlay}>
                <View style={[styles.dateModalContent, { backgroundColor: theme.card }]}>
                  {/* Header */}
                  <View style={[styles.dateModalHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.dateModalTitle, { color: theme.text }]}>
                      Seleccionar fecha y hora
                    </Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Body */}
                  <View style={styles.dateModalBody}>
                    {/* Selector de Fecha */}
                    <View style={styles.datePickerSection}>
                      <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>
                        📅 Fecha
                      </Text>
                      <input
                        type="date"
                        value={tempDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const [year, month, day] = e.target.value.split('-');
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                          setTempDate(newDate);
                        }}
                        style={{
                          width: '100%',
                          padding: '14px 12px',
                          fontSize: '15px',
                          borderRadius: '10px',
                          border: `2px solid ${theme.primary}`,
                          backgroundColor: theme.background,
                          color: theme.text,
                          fontFamily: 'system-ui',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      />
                      <Text style={[styles.datePreviewText, { color: theme.textSecondary, marginTop: 8 }]}>
                        {tempDate.toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>

                    {/* Selector de Hora */}
                    <View style={styles.datePickerSection}>
                      <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>
                        ⏰ Hora
                      </Text>
                      <View style={styles.timeInputContainer}>
                        <input
                          type="time"
                          value={`${String(tempDate.getHours()).padStart(2, '0')}:${String(tempDate.getMinutes()).padStart(2, '0')}`}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(tempDate);
                            newDate.setHours(parseInt(hours), parseInt(minutes), 0);
                            setTempDate(newDate);
                          }}
                          style={{
                            flex: 1,
                            padding: '14px 12px',
                            fontSize: '15px',
                            borderRadius: '10px',
                            border: `2px solid ${theme.primary}`,
                            backgroundColor: theme.background,
                            color: theme.text,
                            fontFamily: 'system-ui',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        />
                      </View>
                      <Text style={[styles.datePreviewText, { color: theme.textSecondary, marginTop: 8 }]}>
                        {tempDate.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>

                    {/* Vista previa */}
                    <View style={[styles.datePreviewCard, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
                      <Ionicons name="calendar" size={20} color={theme.primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.datePreviewCardDate, { color: theme.textSecondary }]}>
                          Fecha y hora seleccionada
                        </Text>
                        <Text style={[styles.datePreviewCardValue, { color: theme.text }]}>
                          {tempDate.toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })} a las {tempDate.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={[styles.dateModalFooter, { borderTopColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: `${theme.textSecondary}20` }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[styles.dateModalButtonText, { color: theme.textSecondary }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setDueAt(tempDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Ionicons name="checkmark" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.dateModalButtonText, { color: '#FFFFFF' }]}>
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* SECCIÓN DE SUBTAREAS - Solo si estamos editando */}
          {editingTask && (
            <SubtasksList 
              taskId={editingTask.id}
              canEdit={canEdit || canAddSubtask}
              canDelegate={canDelegate}
              delegateUsers={delegateUsers}
              currentUser={currentUser}
            />
          )}

          {/* COORDINACIÓN ENTRE ÁREAS - Para tareas multi-secretaría */}
          {editingTask?.isCoordinationTask && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <View style={{ backgroundColor: '#9C27B0' + '20', padding: 10, borderRadius: 12 }}>
                  <Ionicons name="git-branch" size={22} color="#9C27B0" />
                </View>
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Progreso por Área</Text>
              </View>
              <AreaCoordinationProgress 
                parentTaskId={editingTask.id}
                currentUserArea={currentUser?.area}
                onSubtaskPress={(subtask) => {
                  navigation.navigate('TaskDetail', { task: subtask });
                }}
              />
            </View>
          )}

          {/* BOTÓN DE DELEGACIÓN - Para secretarios (incluyendo área subtasks) y admin */}
          {editingTask && canDelegate && (currentUser?.role === 'secretario' || currentUser?.role === 'admin') && (
            <TouchableOpacity
              style={[styles.delegateButton, { backgroundColor: '#FF9800' }]}
              onPress={() => setShowDelegateModal(true)}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
              <Text style={styles.delegateButtonText}>Delegar Tarea</Text>
            </TouchableOpacity>
          )}

          {/* BANNER INFORMATIVO PARA ROLES CON PERMISOS LIMITADOS */}
          {editingTask && !canEdit && (currentUser?.role === 'secretario' || currentUser?.role === 'director') && (
            <View style={[styles.permissionBanner, { backgroundColor: isDark ? '#2D2D2D' : '#FFF3E0', borderColor: '#FF9800' }]}>
              <Ionicons name="information-circle" size={24} color="#FF9800" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.permissionBannerTitle, { color: theme.text }]}>
                  {currentUser?.role === 'secretario' ? 'Modo Secretario' : 'Modo Director'}
                </Text>
                <Text style={[styles.permissionBannerText, { color: theme.textSecondary }]}>
                  {currentUser?.role === 'secretario' 
                    ? 'Puedes delegar tareas, crear subtareas y cambiar el estado.'
                    : 'Puedes cambiar el estado de la tarea.'}
                </Text>
              </View>
            </View>
          )}

          <PressableButton 
            onPress={save}
            disabled={isSaving}
            scaleValue={0.95}
            haptic={true}
          >
            <View style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              <Animated.View style={{ transform: [{ scale: buttonScale }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isSaving && <ActivityIndicator color="#FFFFFF" size="small" />}
                {!isSaving && <Ionicons name={editingTask ? "checkmark-circle" : "add-circle"} size={20} color="#FFFFFF" />}
                <Text style={styles.saveButtonText}>
                  {isSaving 
                    ? 'Guardando...' 
                    : editingTask 
                      ? (canEdit ? 'Guardar Cambios' : 'Actualizar Estado')
                      : 'Crear Tarea'
                  }
                </Text>
              </Animated.View>
            </View>
          </PressableButton>

          {editingTask && (
            <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title })}>
              <Text style={styles.chatButtonText}>Abrir Chat</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
      
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
      
      {/* Pomodoro Modal */}
      {editingTask && (
        <Modal
          visible={showPomodoroModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPomodoroModal(false)}
        >
          <View style={[styles.pomodoroModal, { backgroundColor: theme.background }]}>
            <View style={styles.pomodoroHeader}>
              <Text style={[styles.pomodoroTitle, { color: theme.text }]}>Sesión de Trabajo</Text>
              <TouchableOpacity onPress={() => setShowPomodoroModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pomodoroContent}>
              <PomodoroTimer
                taskId={editingTask.id}
                taskTitle={title}
                onSessionComplete={async (session) => {
                  try {
                    const user = await getCurrentSession();
                    if (user.success) {
                      await savePomodoroSession({ 
                        ...session, 
                        userEmail: user.session.email 
                      });
                      setToastMessage('Sesión Pomodoro completada!');
                      setToastType('success');
                      setToastVisible(true);
                    }
                  } catch (error) {
                    setToastMessage('Error al guardar sesión');
                    setToastType('error');
                    setToastVisible(true);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      
      {saveProgress !== null && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12
          }}>
            <LoadingIndicator type="spinner" color="#9F2241" size={12} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {saveProgress === 100 ? '¡Completado!' : 'Guardando tarea...'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Modal de Delegación para Secretarios */}
      <Modal
        visible={showDelegateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDelegateModal(false)}
      >
        <View style={styles.delegateModalOverlay}>
          <View style={[styles.delegateModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.delegateModalHeader}>
              <Text style={[styles.delegateModalTitle, { color: theme.text }]}>
                Delegar Tarea
              </Text>
              <TouchableOpacity onPress={() => setShowDelegateModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.delegateModalSubtitle, { color: theme.textSecondary }]}>
              Selecciona un director para asignarle esta tarea:
            </Text>
            
            {editingTask?.isAreaSubtask && currentUser?.role === 'secretario' && (
              <View style={[styles.delegateWarningBox, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={styles.delegateWarningText}>
                  Las subtareas solo pueden asignarse a UN director. Cada subtarea debe ser responsabilidad de una sola persona.
                </Text>
              </View>
            )}
            <ScrollView style={styles.delegateUsersList}>
              {delegateUsers.length === 0 ? (
                <View style={styles.noDelegateUsers}>
                  <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.noDelegateUsersText, { color: theme.textSecondary }]}>
                    No hay directores disponibles en tus áreas
                  </Text>
                </View>
              ) : (
                delegateUsers.map((director, index) => (
                  <TouchableOpacity
                    key={director.email}
                    style={[styles.delegateUserItem, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => handleDelegate(director)}
                  >
                    <View style={[styles.delegateUserAvatar, { backgroundColor: theme.primary }]}>
                      <Ionicons name="person" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.delegateUserInfo}>
                      <Text style={[styles.delegateUserName, { color: theme.text }]}>
                        {director.displayName}
                      </Text>
                      <Text style={[styles.delegateUserArea, { color: theme.textSecondary }]}>
                        {director.area}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={theme.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.delegateCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowDelegateModal(false)}
            >
              <Text style={[styles.delegateCancelButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  scrollContent: {
    padding: 16
  },
  label: { 
    marginTop: 18, 
    marginBottom: 10,
    color: isDark ? '#B8B8B8' : '#5A5A5A', 
    fontWeight: '700', 
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingLeft: 4,
  },
  input: { 
    padding: 16, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FAFAFA', 
    borderRadius: 14,
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
    shadowColor: isDark ? '#000' : '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(159, 34, 65, 0.12)',
    minHeight: 52,
    lineHeight: 22,
  },
  dateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  dateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14
  },
  dateIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  dateTextContainer: {
    flex: 1
  },
  dateLabelSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  dateText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2
  },
  timeText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },
  pickerRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 12, 
    marginBottom: 10,
    gap: 12
  },
  optionBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', 
    borderRadius: 14,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
    minWidth: 100,
  },
  optionBtnActive: { 
    backgroundColor: '#9F2241',
    borderColor: '#9F2241',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    transform: [{ scale: 1.02 }]
  },
  optionBtnDisabled: {
    opacity: 0.4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0'
  },
  optionText: { 
    fontSize: 15, 
    color: theme.text, 
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  optionTextActive: { 
    color: '#FFFFFF', 
    fontWeight: '800'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  recurrenceOptions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recurrenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recurrenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  recurrenceOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurrenceOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#9F2241',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  chatButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: isDark ? '#000' : '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3'
  },
  chatButtonText: {
    color: '#9F2241',
    fontSize: 17,
    fontWeight: '600'
  },
  webDateInputContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  webDateInput: {
    fontSize: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9F2241',
    color: '#1A1A1A',
    fontWeight: '600',
  },
  // Nuevos estilos para secciones
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159, 34, 65, 0.08)',
  },
  sectionTitleSimple: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  advancedToggle: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  advancedToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  advancedToggleHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 34,
    fontStyle: 'italic',
  },
  advancedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pomodoroModal: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16
  },
  pomodoroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  pomodoroTitle: {
    fontSize: 24,
    fontWeight: '800'
  },
  pomodoroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Nuevos estilos para Asignación y Área
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  areaCard: {
    flex: 1,
    minWidth: '45%',
    flexBasis: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159, 34, 65, 0.05)',
    borderWidth: 2.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(159, 34, 65, 0.15)',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    transition: 'all 0.2s ease',
  },
  areaCardActive: {
    borderWidth: 2.5,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  areaIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  userListItemActive: {
    borderWidth: 1.5,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F2241',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  assigneeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  assigneeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assigneeSelectorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  assigneeSelectorInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9F2241',
  },
  assigneeSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assigneeSelectorValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  // Estilos para el botón de fecha
  datePickerButton: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    justifyContent: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerInfo: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  datePickerTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Estilos del modal de fecha
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  dateModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  datePickerSection: {
    gap: 10,
  },
  datePickerSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  datePreviewText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  datePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  datePreviewCardDate: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePreviewCardValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  dateModalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Estilos para el botón de área modal
  areaButton: {
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 88,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    transition: 'all 0.2s ease',
  },
  areaButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  areaButtonInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  areaButtonLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  areaButtonValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  areaButtonChevron: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  // Estilos para el listado de áreas mejorado
  areaListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  areaListItemActive: {
    borderRadius: 12,
  },
  areaListIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  areaListName: {
    fontSize: 15,
    fontWeight: '600',
  },
  areaTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  areaTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Estilos para pills de áreas seleccionadas
  selectedAreasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    paddingVertical: 4,
  },
  // Hint de áreas filtradas por usuario
  areaHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
  },
  areaHintText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  areaPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  areaPillRemove: {
    padding: 4,
    marginLeft: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  // Estilos para modal de solo lectura
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  readOnlyModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 50,
  },
  readOnlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  readOnlyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  readOnlyCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flex: 1,
  },
  readOnlySection: {
    marginBottom: 24,
  },
  readOnlyLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    justifyContent: 'center',
  },
  readOnlyFieldLarge: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  readOnlyFieldText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  readOnlyActionButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readOnlyActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  readOnlyCloseButtonBottom: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  readOnlyCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Estilos para botón de delegación
  delegateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  delegateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Estilos para modal de delegación
  delegateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  delegateModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  delegateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  delegateModalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  delegateModalSubtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  delegateWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  delegateWarningText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  delegateUsersList: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  noDelegateUsers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDelegateUsersText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  delegateUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  delegateUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delegateUserInfo: {
    flex: 1,
    marginLeft: 14,
  },
  delegateUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  delegateUserArea: {
    fontSize: 13,
  },
  delegateCancelButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  delegateCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para banner de permisos
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  permissionBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  permissionBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
