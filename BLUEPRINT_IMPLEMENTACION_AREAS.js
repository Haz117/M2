#!/usr/bin/env node

/**
 * PLAN DE IMPLEMENTACIÓN: Control Perfecto de Áreas
 * Este documento describe EXACTAMENTE qué crear y cómo
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  IMPLEMENTAR CONTROL PERFECTO DE ÁREAS                     ║
║                                                                            ║
║  Estado Actual: 70% funcionalidad operativa, 30% falta gestión            ║
║  Tiempo Estimado: 6-8 horas                                               ║
║  Complejidad: MEDIA (no es rocket science)                                ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`
📋 CHECKLIST DE IMPLEMENTACIÓN
═════════════════════════════════════════════════════════════════════════════

┌─ FASE 1: Servicios Backend (2 horas)
│
├─ [ ] 1. Crear services/area/areaManagement.js (350 líneas)
│   └─ Funciones: create, update, delete, get, list, assign chief
│
├─ [ ] 2. Crear services/area/areaTeam.js (200 líneas)
│   └─ Funciones: add member, remove, get team, workload
│
├─ [ ] 3. Crear services/area/areaAudit.js (150 líneas)
│   └─ Funciones: log change, get history
│
├─ [ ] 4. Crear services/area/areaHierarchy.js (200 líneas)
│   └─ Funciones: get tree, get parent, get children
│
└─ [ ] 5. Actualizar config/areas.js
    └─ Deprecate hardcoded, agregar fallback

┌─ FASE 2: Pantallas Admin (2.5 horas)
│
├─ [ ] 6. Crear screens/area/AreaManagementScreen.js (400 líneas)
│   └─ Tabla de áreas + acciones + modales
│
├─ [ ] 7. Crear screens/area/AreaFormModal.js (250 líneas)
│   └─ Formulario para crear/editar
│
├─ [ ] 8. Actualizar screens/AdminScreen.js
│   └─ Agregar tab/botón para gestión de áreas
│
└─ [ ] 9. Agregar navegación a App.js
    └─ Stack de área management

┌─ FASE 3: Pantalla Jefe de Área (2 horas)
│
├─ [ ] 10. Crear screens/area/JefeAreaScreen.js (500 líneas)
│    └─ KPI, equipo, tareas, analítica
│
├─ [ ] 11. Actualizar App.js tabs
│    └─ Mostrar tab condicional según rol
│
└─ [ ] 12. Crear components/area/AreaKPICard.js (150 líneas)
     └─ Cards de KPI reutilizables

┌─ FASE 4: Pruebas & Pulido (1.5 horas)
│
├─ [ ] 13. Escribir pruebas de servicios
│
├─ [ ] 14. Validar permisos (Firestore rules)
│
├─ [ ] 15. Testing de flujos del admin
│
└─ [ ] 16. Testing de flujos del jefe
    └─ Ver solo su área

═════════════════════════════════════════════════════════════════════════════
TOTAL: 16 tareas, 6-8 horas
═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
🏗️  ESTRUCTURA DE ARCHIVOS A CREAR
═════════════════════════════════════════════════════════════════════════════

services/
├── area/
│   ├── areaManagement.js       [NUEVO] 350 líneas
│   ├── areaTeam.js              [NUEVO] 200 líneas
│   ├── areaAudit.js             [NUEVO] 150 líneas
│   └── areaHierarchy.js         [NUEVO] 200 líneas
└── ... (existentes)

screens/
├── area/
│   ├── AreaManagementScreen.js  [NUEVO] 400 líneas
│   ├── AreaFormModal.js         [NUEVO] 250 líneas
│   ├── JefeAreaScreen.js        [NUEVO] 500 líneas
│   └── AreaStats Component      [NUEVO] 150 líneas
└── ... (existentes)

components/
├── area/
│   ├── AreaKPICard.js           [NUEVO] 150 líneas
│   ├── AreaTeamList.js          [NUEVO] 200 líneas
│   ├── AreaSelector.js          [EXISTENTE - mejorar]
│   └── AreaForm.js              [NUEVO] 180 líneas
└── ... (existentes)

config/
└── areas.js                     [MEJORAR] + deprecate notice

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
📊 BASE DE DATOS (Firestore) - NUEVA ESTRUCTURA
═════════════════════════════════════════════════════════════════════════════

COLECCIÓN: /areas
├── Documento: {areaId}
│   ├── nombre: string              "Secretaría General Municipal"
│   ├── tipo: enum                  "secretaria" | "direccion"
│   ├── descripcion: string         "..."
│   ├── jefeId: string | null       "uid_user_123" (quién dirige)
│   ├── parentId: string | null     "sec_general" (para jerarquía)
│   ├── activa: boolean             true
│   ├── color: string               "#9F2241"
│   ├── icono: string               "briefcase"
│   ├── orden: number               1 (para sorting)
│   ├── presupuesto: number         50000
│   ├── createdAt: timestamp        server timestamp
│   ├── updatedAt: timestamp        server timestamp
│   ├── createdBy: string           "uid_admin_001"
│   └── updatedBy: string           "uid_admin_001"

COLECCIÓN: /area_members
├── Documento: {id}
│   ├── areaId: string              "sec_general"
│   ├── userId: string              "uid_user_456"
│   ├── rol: enum                   "jefe" | "miembro" | "consultor"
│   ├── asignadoEn: timestamp       cuando se asignó
│   └── activo: boolean             true

COLECCIÓN: /area_audit
├── Documento: {id} (auto-generated)
│   ├── areaId: string              "sec_general"
│   ├── accion: enum                "created"|"updated"|"deleted"|"chief_assigned"
│   ├── datosAnteriores: object     {...}
│   ├── datosNuevos: object         {...}
│   ├── realizadoPor: string        "uid_admin_001"
│   ├── timestamp: timestamp        server timestamp
│   └── detalles: string            "Cambio en presupuesto"

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
🔐 FIRESTORE RULES - SEGURIDAD PARA ÁREAS
═════════════════════════════════════════════════════════════════════════════

match /areas/{areaId} {
  // Leer: admin + jefe de área
  allow read: if 
    request.auth.uid != null &&
    (
      getUserRole(request.auth.uid) == 'admin' ||
      (userData(request.auth.uid).areaAsignada == areaId)
    );

  // Crear/editar: solo admin
  allow create, update: if
    request.auth.uid != null &&
    getUserRole(request.auth.uid) == 'admin';

  // Eliminar: solo admin
  allow delete: if
    request.auth.uid != null &&
    getUserRole(request.auth.uid) == 'admin';
}

match /area_members/{doc=**} {
  // Leer: admin + jefe + miembro
  allow read: if 
    request.auth.uid != null &&
    (
      getUserRole(request.auth.uid) == 'admin' ||
      request.auth.uid == resource.data.userId ||
      isAreaChief(resource.data.areaId, request.auth.uid)
    );

  // Escribir: solo admin
  allow write: if
    request.auth.uid != null &&
    getUserRole(request.auth.uid) == 'admin';
}

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
💾 SCRIPT DE MIGRACIÓN - Pasar hardcoded a BD
═════════════════════════════════════════════════════════════════════════════

// scripts/migrateAreasToFirestore.mjs

import * as admin from 'firebase-admin';

async function migrateAreas() {
  const db = admin.firestore();
  
  // Importar de config/areas.js
  const { SECRETARIAS, DIRECCIONES } = require('../config/areas');
  
  const allAreas = [
    ...SECRETARIAS.map(name => ({ nombre: name, tipo: 'secretaria' })),
    ...DIRECCIONES.map(name => ({ nombre: name, tipo: 'direccion' }))
  ];
  
  let index = 0;
  for (const area of allAreas) {
    await db.collection('areas').add({
      nombre: area.nombre,
      tipo: area.tipo,
      descripcion: '',
      jefeId: null,
      parentId: null,
      activa: true,
      color: getColorForArea(area.nombre),
      icono: 'folder',
      orden: index++,
      presupuesto: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'migration-script'
    });
  }
  
  console.log(\`✅ Migradas \${allAreas.length} áreas a Firestore\`);
}

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
🔑 CLAVES DE IMPLEMENTACIÓN
═════════════════════════════════════════════════════════════════════════════

1. ✅ USAR REALTIME CON ONsnapshot
   No hacer getDocs una vez. Usar onSnapshot para cambios en vivo.
   
   ✓ Si admin modifica área → jefe ve cambio instantáneamente
   ✓ Si agregan jefe nuevo → aparece en lista al instante

2. ✅ VALIDAR PERMISOS EN 2 CAPAS
   - Frontend: Ocultar botones si no tienes permiso
   - Backend: Firestore rules que rechacen sin permiso
   
3. ✅ USAR TRANSACCIONES PARA CAMBIOS CRÍTICOS
   - Cambiar jefe de área = transaction (user + audit + notification)
   
4. ✅ AUDITAR TODOS LOS CAMBIOS
   - Crear documento en /area_audit/ en cada update
   - Customer feedback: "¿Quién cambió mi presupuesto?"
   
5. ✅ CACHÉ LOCAL CON TTL
   - Usar PerformanceOptimization.getCachedQuery()
   - 5 minutos TTL para listados de áreas
   
6. ✅ NOTIFICACIONES EN TIEMPO REAL
   - Si te asignan como jefe → notification
   - Si el jefe de tu área cambia → notification

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
📝 EJEMPLO: CrearServicio areaManagement.js
═════════════════════════════════════════════════════════════════════════════

// services/area/areaManagement.js (350 líneas)

import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, writeBatch, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getCurrentSession } from '../authFirestore';

/**
 * Crear nueva área
 */
export const createArea = async (areaData) => {
  try {
    const { session } = await getCurrentSession();
    if (!session || session.role !== 'admin') {
      throw new Error('Solo administradores pueden crear áreas');
    }
    
    const areasRef = collection(db, 'areas');
    const docRef = await addDoc(areasRef, {
      nombre: areaData.nombre,
      tipo: areaData.tipo, // 'secretaria' | 'direccion'
      descripcion: areaData.descripcion || '',
      jefeId: areaData.jefeId || null,
      parentId: areaData.parentId || null,
      activa: true,
      color: areaData.color || '#9F2241',
      icono: areaData.icono || 'folder',
      orden: areaData.orden || 999,
      presupuesto: areaData.presupuesto || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: session.uid
    });
    
    // Registrar en auditoría
    await logAreaAudit(docRef.id, 'created', null, areaData, session.uid);
    
    return { success: true, areaId: docRef.id };
  } catch (error) {
    console.error('Error creando área:', error);
    throw error;
  }
};

/**
 * Actualizar área
 */
export const updateArea = async (areaId, updates) => {
  try {
    const { session } = await getCurrentSession();
    if (!session || session.role !== 'admin') {
      throw new Error('Solo administradores pueden editar áreas');
    }
    
    const areaRef = doc(db, 'areas', areaId);
    const oldData = await getAreaById(areaId);
    
    await updateDoc(areaRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid
    });
    
    // Registrar auditoría
    await logAreaAudit(areaId, 'updated', oldData, updates, session.uid);
    
    return { success: true };
  } catch (error) {
    console.error('Error actualizando área:', error);
    throw error;
  }
};

/**
 * Eliminar área (soft delete)
 */
export const deleteArea = async (areaId) => {
  try {
    const { session } = await getCurrentSession();
    if (!session || session.role !== 'admin') {
      throw new Error('Solo administradores pueden eliminar áreas');
    }
    
    // Validar que no tenga tareas activas
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('area', '==', areaId), where('status', '==', 'pendiente'));
    const snapshot = await getDocs(q);
    
    if (snapshot.size > 0) {
      throw new Error(\`No se puede eliminar: área tiene \${snapshot.size} tareas pendientes\`);
    }
    
    const areaRef = doc(db, 'areas', areaId);
    const oldData = await getAreaById(areaId);
    
    await updateDoc(areaRef, {
      activa: false,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid
    });
    
    // Registrar auditoría
    await logAreaAudit(areaId, 'deleted', oldData, { activa: false }, session.uid);
    
    return { success: true };
  } catch (error) {
    console.error('Error eliminando área:', error);
    throw error;
  }
};

/**
 * Asignar jefe a área
 */
export const assignAreaChief = async (areaId, userId) => {
  try {
    const { session } = await getCurrentSession();
    if (!session || session.role !== 'admin') {
      throw new Error('Solo administradores pueden asignar jefes');
    }
    
    const batch = writeBatch(db);
    
    // Actualizar área
    const areaRef = doc(db, 'areas', areaId);
    batch.update(areaRef, { jefeId: userId, updatedAt: serverTimestamp() });
    
    // Agregar a area_members
    const memberRef = doc(collection(db, 'area_members'));
    batch.set(memberRef, {
      areaId, userId,
      rol: 'jefe',
      asignadoEn: serverTimestamp(),
      activo: true
    });
    
    await batch.commit();
    
    // TODO: Enviar notificación al nuevo jefe
    
    return { success: true };
  } catch (error) {
    console.error('Error asignando jefe:', error);
    throw error;
  }
};

/**
 * Obtener área por ID
 */
export const getAreaById = async (areaId) => {
  try {
    const areaRef = doc(db, 'areas', areaId);
    const snapshot = await getDoc(areaRef);
    return snapshot.exists() ? { id: areaId, ...snapshot.data() } : null;
  } catch (error) {
    console.error('Error obteniendo área:', error);
    return null;
  }
};

/**
 * Listar todas las áreas (real-time)
 */
export const subscribeToAreas = (callback) => {
  try {
    const areasRef = collection(db, 'areas');
    const q = query(areasRef, where('activa', '==', true), orderBy('orden'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(areas);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error suscribiendo a áreas:', error);
    return () => {};
  }
};

/**
 * Registrar cambio en auditoría
 */
async function logAreaAudit(areaId, action, oldData, newData, userId) {
  try {
    await addDoc(collection(db, 'area_audit'), {
      areaId,
      accion: action,
      datosAnteriores: oldData || null,
      datosNuevos: newData || null,
      realizadoPor: userId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
🎯 FLUJOS DE USUARIO
═════════════════════════════════════════════════════════════════════════════

FLUJO 1: Admin Crea Nueva Área
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Navega a AdminScreen → "Gestión de Áreas"
2. Click en "+ NUEVA ÁREA"
3. Abre AreaFormModal con:
   - Nombre: "Dirección de Nuevas Iniciativas"
   - Tipo: "Dirección"
   - Jefe: [seleccionar del dropdown]
   - Descripción: "..."
4. Click "Guardar"
5. createArea() se ejecuta:
   - Valida permisos (admin)
   - Crea doc en /areas/
   - Crea entrada en /area_audit/
   - Notifica si hay jefe asignado
6. Modal cierra, lista se actualiza en tiempo real

FLUJO 2: Jefe de Área Ve Su Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Usuario con rol 'jefe' ve TAB "Mi Área" en nav
2. Click abre JefeAreaScreen
3. Carga datos en tiempo real:
   - Datos del área (areaManagement.subscribeToAreas)
   - Equipo (areaTeam.getAreaTeam)
   - Tareas (filtradas por área)
   - KPI (areaMetrics + areaAnalytics)
4. Ve:
   - "Mi equipo" (5 personas, con carga)
   - "Tareas vencidas" (3)
   - "Predicción" (↑ 15% próxima semana)
   - "Alertas" (1 persona sobrecargada)

FLUJO 3: Admin Cambia Jefe de Área
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Admin en AreaManagementScreen ve área "Dirección Jurídica"
2. Click en icono [👤] "Cambiar jefe"
3. Abre modal con dropdown de usuarios
4. Selecciona "Patricia Gómez"
5. Click "Asignar"
6. assignAreaChief() ejecuta:
   - Actualiza jefeId en /areas/
   - Crea register en /area_members/
   - Crea entrada en /area_audit/
   - Envía notificación a Patricia
7. Patricia ve notificación + tab "Mi Área" aparece

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
✅ VALIDACIÓN & TESTING
═════════════════════════════════════════════════════════════════════════════

Antes de considerar COMPLETO, verificar:

□ Crear área
  ✓ Normal: funciona, aparece en lista
  ✓ Duplicado: rechaza si ya existe nombre
  ✓ Sin jefe: permite, jefeId = null
  ✓ No admin: rechaza con error

□ Editar área
  ✓ Cambiar nombre: guardado + auditoría
  ✓ Cambiar jefe: actualiza + notificación
  ✓ Cambiar presupuesto: guardado
  ✓ No admin: rechaza

□ Eliminar área
  ✓ Sin tareas: soft delete funciona
  ✓ Con tareas: rechaza y muestra cuántas
  ✓ Auditoría registra eliminación

□ Jefe de Área
  ✓ Ve solo SU área en JefeAreaScreen
  ✓ Con con tareas de su equipo
  ✓ Datos actualizan en tiempo real
  ✓ No admin: rechaza acceso a admin panel

□ Real-time
  ✓ 2 admins: uno crea área, otro la ve al instante
  ✓ Jefe: actualización de tareas en vivo
  ✓ Cambio de jefe: aparecemontan en tiempo real

□ Seguridad (Firestore)
  ✓ Admin: puede crear/editar/eliminar
  ✓ Jefe: solo puede leer su área
  ✓ Operativo: no puede acceder a /areas/
  ✓ Auditoría: nadie puede borrar registros

═════════════════════════════════════════════════════════════════════════════
`);

console.log(`
🚀 PRÓXIMOS PASOS
═════════════════════════════════════════════════════════════════════════════

Después de implementar esto (6-8 horas), el proyecto tendrá:

✅ Control PERFECTO de áreas
   • Crear, editar, eliminar en tiempo real
   • Auditoría de todos los cambios
   • Asignación dinámica de jefes
   • Jerarquía de áreas

✅ Estructura Mejorada
   • services/area/ carpeta organizada
   • screens/area/ screens específicas
   • Componentes reutilizables

✅ Capa Ejecutiva
   • Dashboard JefeAreaScreen
   • Métricas por área
   • Gestión de equipo

💡 ESTO NO ES TODO. Hay más mejoras opcionales:
   • Presupuestos y gastos
   • Organigrama visual con D3.js
   • Reportes PDF por área
   • Integraciones (Slack, email)
   • ML predictions

═════════════════════════════════════════════════════════════════════════════

¿Quieres que AHORA MISMO implementemos el Nivel 1 (CRÍTICO)?
`);
