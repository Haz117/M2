# ⚠️ EDGE CASES CRÍTICOS - Timestamps & assignedTo

**Fecha**: 5 de Marzo, 2026  
**Impacto**: Bugs sutiles en producción que pasan tests  

---

## 🔴 CRÍTICOS - BUGS GARANTIZADOS

### 1. ZERO TIMESTAMP BUG (dateUtils.js)

```javascript
// ❌ PROBLEMA ACTUAL
export const toMs = (timestamp) => {
  if (!timestamp) return null;  // ← 0 es falsy pero válido!
  // ...
}

// Impacto:
const task = { dueAt: 0, status: 'abierta' };
isOverdue(task); // → false (INCORRECTAMENTE)

// En mundo real:
// - Tasks con dueAt = 0 (epoch) serán ignoradas
// - Nunca gatillan notificaciones
// - No aparecen en búsqueda de vencidas
```

**Fix (urgente)**:
```javascript
export const toMs = (timestamp) => {
  // Cambiar de: if (!timestamp) return null;
  // A:
  if (timestamp === null || timestamp === undefined) return null;
  // ...
}
```

**Test**:
```javascript
expect(toMs(0)).toBe(0);   // epoch
expect(toMs(null)).toBeNull();
expect(toMs(undefined)).toBeNull();
```

---

### 2. STRING ISO TIMESTAMP BUG

```javascript
// ❌ PROBLEMA
const task = {
  dueAt: '2024-03-05T15:30:00Z',  // ISO string
  status: 'abierta'
};

isOverdue(task); // → Depende de toMs()

// En analytics.js línea 101:
const ms = typeof t.createdAt === 'number' ? 
           t.createdAt : 
           new Date(t.createdAt).getTime();
// Si t.createdAt es Date object (no number), explota
```

**Escenario de riesgo**:
- Offline sync guarda timestamps como strings
- Firebase cloud function retorna como Date
- JSON parse retorna como string
- Comparison `createdAt >= weekAgo` → NaN

**Fix**:
```javascript
import { toMs } from '../utils/dateUtils';

// Siempre:
const ms = toMs(task.dueAt);

// En lugar de:
const ms = typeof task.dueAt === 'number' ? ... 
```

---

### 3. FIRESTORE TIMESTAMP COMPARISON BUG

```javascript
// ❌ PROBLEMA
const task = {
  dueAt: Timestamp.fromDate(new Date('2024-03-01')),
  status: 'abierta'
};

// En HomeScreen.js L574:
if (task.dueAt >= Date.now()) return false; // ← NaN comparison!

// Resultado: filter es inconsistente
tasks.filter(t => t.dueAt < Date.now()); // algunos sí, algunos no
```

**Impacto real**:
- 50% de tareas vencidas `< Timestamp object` = true
- 50% de tareas nuevas `< Timestamp object` = false
- Los resultados parecen aleatorios

---

### 4. OFFLINE SYNC CORRUPTION

```javascript
// ❌ PROBLEMA en services/offlineSync.js L298
if (updateData.dueAt && typeof updateData.dueAt === 'number') {
    updateData.dueAt = Timestamp.fromMillis(updateData.dueAt);
}
// ¿Qué pasa si es string? Se guarda como string
// ¿Qué pasa luego? toMs() lo parsea... a veces

// Flujo:
1. Usuario offline, edita task
2. dueAt guardado localmente como string
3. Sync acontece: updateData.dueAt = "2024-03-05T15:30:00Z"
4. Firestore escribe STRING
5. Código lee Timestamp... ¡pero es string!
```

**Fix**:
```javascript
// En offlineSync.js L298
if (updateData.dueAt) {
  const ms = toMs(updateData.dueAt);
  if (ms !== null) {
    updateData.dueAt = Timestamp.fromMillis(ms);
  }
}
```

---

### 5. ASSIGNEDTO ARRAY/STRING INCONSISTENCY

```javascript
// ❌ PROBLEMA
// En base de datos:
Task A: { assignedTo: "juan.perez@municipio.com" }        // string
Task B: { assignedTo: ["maria.garcia@municipio.com"] }     // array
Task C: { assignedTo: null }                               // null

// En HomeScreen.js (search/filter):
const filtered = tasks.filter(t => 
  t.assignedTo?.toLowerCase() === email.toLowerCase()
);
// ✅ Task A: funciona
// ❌ Task B: ["maria..."].toLowerCase() → TypeError! 
// ✅ Task C: null.toLowerCase() → TypeError!

// En analytics.js:
const byAssignee = tasks.reduce((acc, t) => {
  const assignee = Array.isArray(t.assignedTo) 
    ? t.assignedTo[0]
    : t.assignedTo;
  // Qué si assignedTo = []? assignee = undefined
  acc[assignee] = (acc[assignee] || 0) + 1;
  return acc;
}, {});
// Resultado: { undefined: 42 } ← datos corruptos
```

**Escenarios**:
1. Migración: viejo código escribía string, nuevo espera array
2. Múltiples assignees: código esperaba string
3. Unassigned: null/undefined no manejado

**Fix everywhere**:
```javascript
// Pattern 1: Comparación segura
const matchAssigned = (task, email) => {
  const assigned = task.assignedTo;
  if (!assigned) return false;
  
  if (Array.isArray(assigned)) {
    return assigned.some(a => a.toLowerCase() === email.toLowerCase());
  } else {
    return assigned.toLowerCase() === email.toLowerCase();
  }
};

// Pattern 2: Normalización
const normalizeAssignedTo = (assigned) => {
  if (!assigned) return [];
  return Array.isArray(assigned) ? assigned : [assigned];
};

// Uso:
const emails = normalizeAssignedTo(task.assignedTo);
const isAssigned = emails.some(e => e === user.email);
```

---

### 6. NOTIFICATION CALCULATION BUG

```javascript
// ❌ PROBLEMA en emailNotifications.js L145
const dueAtMs = task.dueAt?.seconds 
  ? task.dueAt.seconds * 1000 
  : (typeof task.dueAt === 'number' 
    ? task.dueAt 
    : new Date(task.dueAt).getTime());

// Problemas:
// 1. Si task.dueAt = { seconds: 123, nanoseconds: 456 }
//    Ignora nanoseconds (probablemente OK pero impreciso)
// 2. Si task.dueAt = undefined, new Date(undefined).getTime() = NaN
// 3. Si task.dueAt = null, new Date(null).getTime() = 0 (epoch!)
//    Notificación se envía para epoch, ¡tarea "vencida" desde 1970!

// Real world:
const hoursUntilDue = (dueAtMs - Date.now()) / (1000 * 60 * 60);
if (hoursUntilDue === NaN - now) { // NaN
  // Nada se envía SIN ERROR
  // Usuario nunca se entera
}
```

**Fix**:
```javascript
import { toMs } from '../utils/dateUtils';

const dueAtMs = toMs(task.dueAt);
if (dueAtMs === null) {
  console.warn('Task missing dueAt:', task.id);
  return null; // No enviar notif
}

const hoursUntilDue = (dueAtMs - Date.now()) / (1000 * 60 * 60);
if (hoursUntilDue < 0) return null; // Ya vencido
```

---

## 🟡 IMPORTANTES - BUGS SUTILES

### 7. DIVISION POR CERO EN ANALYTICS

```javascript
// En analytics.js (múltiples lugares)
const completionRate = completed.length / total.length;
const avgTime = totalMs / count;

// Si:
// - total.length = 0 → Infinity
// - count = 0 → NaN

// En charts/reports:
// Infinity se renderiza como "Infinity"
// NaN se renderiza como "NaN"
```

**Fix**:
```javascript
const completionRate = total.length > 0 ? completed.length / total.length : 0;
const avgTime = count > 0 ? totalMs / count : 0;
```

---

### 8. TIMESTAMP ROUNDING ERRORS

```javascript
// ❌ PROBLEMA
const daysUntilDue = (dueAtMs - now) / (1000 * 60 * 60 * 24);
// Si daysUntilDue = 0.1, Math.ceil = 1
// Mensaje: "Vence en 1 día" pero en realidad es en 2.4 horas

// Edge case:
// daysUntilDue = -0.1 → Task "vencida hace 0 días"
// Better: "vencida hace 2h"

// Fix:
const hrsUntil = (dueAtMs - now) / (1000 * 60 * 60);
if (hrsUntil < 0) {
  return `Vencida hace ${Math.abs(Math.floor(hrsUntil))}h`;
} else if (hrsUntil < 24) {
  return `Vence en ${Math.ceil(hrsUntil)}h`;
} else {
  return `Vence en ${Math.ceil(hrsUntil / 24)}d`;
}
```

---

### 9. NULL PROPAGATION IN REPORTS

```javascript
// En ReportsScreen.js L480
const monthlyTasks = userTasks.filter(t => t.createdAt >= monthAgo);
// Si t.createdAt = null:
// null >= 1704067200000 → false ✓ (accidental correctness)

// Pero:
const stats = {
  created: monthlyTasks.length,
  createdMs: monthlyTasks.reduce((sum, t) => sum + t.createdAt, 0)
  // null + number = NaN
  // avg = NaN / count = NaN
};
```

**Fix**:
```javascript
const monthlyTasks = userTasks.filter(t => {
  const ms = toMs(t.createdAt);
  return ms !== null && ms >= monthAgo;
});

const createdMs = monthlyTasks.reduce((sum, t) => {
  const ms = toMs(t.createdAt);
  return ms !== null ? sum + ms : sum;
}, 0);
```

---

## ✅ TEST MATRIX - Casos a Verificar

```javascript
describe('Edge Cases Críticos', () => {
  const testCases = [
    // Timestamps
    { dueAt: 0,           status: 'abierta', expected: 'isOverdue=false' },
    { dueAt: null,        status: 'abierta', expected: 'isOverdue=false' },
    { dueAt: undefined,   status: 'abierta', expected: 'isOverdue=false' },
    { dueAt: "invalid",   status: 'abierta', expected: 'error or false' },
    { dueAt: {seconds:1}, status: 'abierta', expected: 'isOverdue=true' },
    
    // AssignedTo
    { assignedTo: "user@mail.com", type: 'string' },
    { assignedTo: ["user@mail.com"], type: 'array' },
    { assignedTo: [], type: 'empty array' },
    { assignedTo: null, type: 'null' },
    { assignedTo: undefined, type: 'undefined' },
    
    // Offline sync
    { local: 'string timestamp', firestore: 'converted to Timestamp' },
  ];
});
```

---

## 🎯 BEFORE DEPLOYING TO PRODUCTION

**Checklist**:
- [ ] dateUtils.toMs() maneja 0, null, undefined
- [ ] isOverdue() validado para todos tipos
- [ ] assignedTo normalizado en 3+ archivos
- [ ] Offline sync no crea timestamps inválidos
- [ ] Notifications no envía para null dueAt
- [ ] Analytics no divide por cero
- [ ] Reports no muestra NaN/Infinity
- [ ] Tests pasan con edge cases
- [ ] Firestore audit limpieza (migrateTimestamps.js)

---

**Responsable**: QA + Code Review  
**Validez**: Hasta refactor completo de timestamps  
**Actualización**: Post-fix de cada edge case
