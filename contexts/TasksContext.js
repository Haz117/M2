// contexts/TasksContext.js
// Context global para sincronizar tareas entre todas las pantallas en tiempo real
// ⚡ Optimizado con useMemo para evitar re-renders innecesarios

import React, { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { subscribeToTasks } from '../services/tasks';
import { getCurrentSession } from '../services/authFirestore';

// Usar globalThis para que React.lazy() bundles compartan la misma instancia de contexto
if (!globalThis.__TASKS_CONTEXT__) {
  globalThis.__TASKS_CONTEXT__ = createContext();
}
export const TasksContext = globalThis.__TASKS_CONTEXT__;

// 💾 Set persistente de tareas eliminadas (se guarda en localStorage)
const DELETED_TASKS_KEY = 'permanentlyDeletedTaskIds';

function saveDeletedTasks(deletedSet) {
  try {
    const arr = Array.from(deletedSet);
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(arr));
  } catch (e) {
    // Silent fail - localStorage is optional
  }
}

function loadDeletedTasks() {
  try {
    const arr = JSON.parse(localStorage.getItem(DELETED_TASKS_KEY) || '[]');
    return new Set(arr);
  } catch (e) {
    return new Set();
  }
}

/**
 * Filtra tareas según el rol del usuario:
 * - admin: ve todas
 * - secretario: solo las que el admin le asignó directamente a su email
 * - director: solo las que le asignó el admin o delegó un secretario a su email
 *
 * En ambos casos la regla es idéntica: el email del usuario debe estar en assignedTo.
 */
function filterTasksByRole(allTasks, user) {
  if (!user || user.role === 'admin') return allTasks;

  const myEmail = user.email?.toLowerCase().trim();
  if (!myEmail) return [];

  return allTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const assignees = Array.isArray(assignedTo)
      ? assignedTo.map(e => (typeof e === 'string' ? e : e?.email || '')?.toLowerCase().trim())
      : [(assignedTo || '').toLowerCase().trim()];
    return assignees.includes(myEmail);
  });
}

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false); // Track sesión disponibility
  const [currentUser, setCurrentUser] = useState(null);
  const unsubscribeTasksRef = useRef(null);
  
  // 🛡️ Set global para rastrear tareas siendo eliminadas
  const deletingTasksRef = useRef(new Set());
  
  // 💾 Set PERSISTENTE de tareas eliminadas permanentemente
  const permanentlyDeletedRef = useRef(loadDeletedTasks());

  // Función para marcar tarea como "eliminándose"
  const markAsDeleting = useCallback((taskId) => {
    deletingTasksRef.current.add(taskId);
  }, []);

  // Función para desmarcar tarea (cuando se confirma eliminación)
  const unmarkAsDeleting = useCallback((taskId) => {
    deletingTasksRef.current.delete(taskId);
    // Al desmarcar, agregar a permanente para que NO reaparezca
    permanentlyDeletedRef.current.add(taskId);
    saveDeletedTasks(permanentlyDeletedRef.current);
  }, []);

  // Función para limpiar la lista de eliminados (en caso de sincronización)
  const clearDeletedTask = useCallback((taskId) => {
    permanentlyDeletedRef.current.delete(taskId);
    saveDeletedTasks(permanentlyDeletedRef.current);
  }, []);

  // 🔍 EFECTO 1: Verificar disponibilidad de sesión (con reintentos)
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    const MAX_CHECKS = 30; // 3 segundos a 100ms por check

    const checkSession = async () => {
      while (mounted && checkCount < MAX_CHECKS) {
        const sessionResult = await getCurrentSession();
        if (!mounted) return;
        if (sessionResult.success) {
          setCurrentUser(sessionResult.session);
          setHasSession(true);
          return; // Sesión encontrada, terminar loop
        }
        checkCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Si se alcanza MAX_CHECKS sin sesión, marcar como listo
      if (mounted && !hasSession) {
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Ref para acceder al usuario actual dentro del listener sin recrear suscripción
  const currentUserRef = useRef(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // 🔍 EFECTO 2: Suscribirse al listener SOLO cuando hay sesión
  useEffect(() => {
    if (!hasSession) {
      return; // Esperar a que haya sesión antes de conectarse
    }

    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 5; // Más reintentos para mayor robustez
    const hasLoadedOnce = { current: false };

    const setupSubscription = async () => {
      try {
        unsubscribeTasksRef.current = await subscribeToTasks((updatedTasks) => {
          if (!mounted) return;

          // 🛡️ FILTRAR: No restaurar tareas que están siendo eliminadas O fueron eliminadas permanentemente
          const withoutDeleted = updatedTasks.filter(task => {
            const isBeingDeleted = deletingTasksRef.current.has(task.id);
            const isPermanentlyDeleted = permanentlyDeletedRef.current.has(task.id);
            return !isBeingDeleted && !isPermanentlyDeleted;
          });

          // 🔒 FILTRAR POR ROL: secretario/director solo ven lo que les corresponde
          const filteredTasks = filterTasksByRole(withoutDeleted, currentUserRef.current);

          setTasks(filteredTasks);
          if (!hasLoadedOnce.current) {
            hasLoadedOnce.current = true;
            setIsLoading(false);
          }
          retryCount = 0; // Reset retry counter on success
        });
      } catch (error) {
        console.error('❌ Error en setupSubscription:', error.message);
        // Si falla y aún tenemos reintentos, esperar y volver a intentar
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          const delayMs = 500 * retryCount; // 500ms, 1s, 1.5s, 2s, 2.5s
          console.warn(`Reintentando suscripción (${retryCount}/${MAX_RETRIES}) en ${delayMs}ms...`);
          
          setTimeout(() => {
            if (mounted) {
              setupSubscription();
            }
          }, delayMs);
        } else {
          // No hay más reintentos
          setIsLoading(false);
          console.error('❌ Agotados reintentos de suscripción a tareas');
        }
      }
    };

    setupSubscription();

    // Limpiar al desmontar
    return () => {
      mounted = false;
      if (unsubscribeTasksRef.current && typeof unsubscribeTasksRef.current === 'function') {
        try {
          unsubscribeTasksRef.current();
        } catch (e) {
          // Silent cleanup error
        }
      }
    };
  }, [hasSession]);

  // ⚡ Memoizar el valor del contexto para evitar re-renders innecesarios en los consumers
  const value = useMemo(() => ({
    tasks,
    setTasks,
    isLoading,
    currentUser,
    markAsDeleting,
    unmarkAsDeleting,
    clearDeletedTask,
    deletingTasksRef,
    permanentlyDeletedRef,
  }), [tasks, isLoading, currentUser]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// Hook personalizado para usar el contexto de tareas
export function useTasks() {
  const context = React.useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe estar dentro de TasksProvider');
  }
  return context;
}
