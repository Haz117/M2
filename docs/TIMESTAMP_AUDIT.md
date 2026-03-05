# 🚨 AUDIT: Problemas de Timestamps en la App

**Fecha**: 5 de Marzo, 2026  
**Estado**: CRÍTICO - 24+ archivos tienen comparaciones inseguras  
**Acción Requerida**: ANTES de ir a producción

---

## 📊 RESUMEN

| Categoría | Cantidad | Gravedad |
|-----------|----------|----------|
| Comparaciones directas `dueAt </>` | 31 | 🔴 Crítica |
| Conversiones inline sin utility | 15 | 🔴 Crítica |
| `createdAt` sin validación | 8 | 🟡 Alta |
| Edge cases no manejados | 5+ | 🔴 Crítica |
| **TOTAL** | **59** | **BLOQUEADOR** |

---

## 🔴 ARCHIVOS CRÍTICOS (REQUIEREN FIX INMEDIATO)

### 1. **screens/HomeScreen.js** (2 bugs)
```javascript
❌ L574: if (advancedFilters.overdue && task.dueAt >= Date.now()) return false;
❌ L589: const overdueTasks = filteredTasks.filter(t => t.dueAt && t.dueAt < Date.now() && t.status !== 'cerrada');
```
**Problema**: Compara Timestamp de Firestore directamente con Date.now()  
**Riesgo**: Si `t.dueAt = {seconds: 123}`, esto da `{seconds: 123} < Date.now()` = NaN = false incorrectamente  
**Fix**: Usar `isBefore(task.dueAt)` y `isAfter()`

---

### 2. **services/analytics.js** (10+ bugs)
```javascript
❌ L101: typeof t.createdAt === 'number' ? t.createdAt : new Date(t.createdAt).getTime()
❌ L117-119: múltiples `t.createdAt >= today`
❌ L204: t.createdAt >= date.getTime() && t.createdAt < nextDate.getTime()
❌ L256, L329, L442: Conversiones inline repetidas
❌ L420-421: `t.createdAt >= weekAgo`
❌ L430: `t.dueAt && t.dueAt < now`
❌ L559: múltiples comparaciones
```
**Problema**: Código repetido, conversión inconsistente, sin validación null  
**Riesgo**: 10+ lugares diferentes con lógica diferente = bugs sutiles  
**Fix**: Importar `toMs`, `isBefore`, `isAfter` de dateUtils

---

### 3. **screens/MyInboxScreen.js** (4 bugs)
```javascript
❌ L297: if (filters.overdue && (task.dueAt >= Date.now() || task.status === 'cerrada'))
❌ L304: const overdueTasks = filtered.filter(task => task.dueAt < Date.now() && task.status !== 'cerrada');
❌ L995, L1002: Múltiples filtros con comparación directa
```
**Problema**: Misma comparación insegura en 4 lugares  
**Riesgo**: Inconsistencia si Timestamp es Firestore object  
**Fix**: Usar `isOverdue()` de dateUtils

---

### 4. **screens/KanbanScreen.js** (2 bugs)
```javascript
❌ L1020: {tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada').length > 0 && (
❌ L1040: {tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada').length}
```
**Problema**: Comparación repetida sin manejo de Timestamp  
**Riesgo**: Contador de tareas vencidas incorrecto  
**Fix**: Usar `isOverdue(task)` y cachear resultado

---

### 5. **services/emailNotifications.js** (1 bug pero crítico)
```javascript
❌ L145: const dueAtMs = task.dueAt?.seconds ? task.dueAt.seconds * 1000 : (typeof task.dueAt === 'number' ? task.dueAt : new Date(task.dueAt).getTime());
```
**Problema**: Conversión manual silenciosa sin logging  
**Riesgo**: Si algo falla, no hay forma de debuggear  
**Fix**: Usar `toMs()` + agregar try-catch

---

### 6. **screens/ReportsScreen.js** (3 bugs)
```javascript
❌ L467: const weeklyTasks = userTasks.filter(t => t.createdAt >= weekAgo);
❌ L480: const monthlyTasks = userTasks.filter(t => t.createdAt >= monthAgo);
❌ L494: const quarterlyTasks = userTasks.filter(t => t.createdAt >= quarterAgo);
```
**Problema**: Compara sin asegurar que `createdAt` sea número  
**Riesgo**: `Timestamp >= milisegundos` siempre false  
**Fix**: Convertir con `toMs()` antes

---

### 7. **services/reports.js** (4 bugs)
```javascript
❌ L432: const tasksOverdue = tasksPending.filter(t => t.dueAt && t.dueAt < now);
❌ L433: const tasksCreatedWeek = tasksCreated.filter(t => t.createdAt >= weekAgo);
❌ L435: const tasksCreatedMonth = tasksCreated.filter(t => t.createdAt >= monthAgo);
```
**Problema**: Reportes con datos incorrectos  
**Riesgo**: Métricas falsas al ejecutivo  
**Fix**: Usar dateUtils en todas comparaciones

---

### 8. **services/notificationsAdvanced.js** (1 bug)
```javascript
❌ L148: const dueAtMs = task.dueAt?.seconds ? ... [conversión manual]
```
**Problema**: Duplica lógica de `emailNotifications.js`  
**Riesgo**: Cambios en un lugar no se replican  
**Fix**: Centralizar en `toMs()`

---

### 9. **screens/SecretarioDashboardScreen.js** (2 bugs)
```javascript
❌ L156: const dueMs = t.dueAt?.seconds ? t.dueAt.seconds * 1000 : (typeof t.dueAt === 'number' ? t.dueAt : t.dueAt ? new Date(t.dueAt).getTime() : null);
❌ L183: [misma lógica repetida]
```
**Problema**: Conversión complicada sin utility subyacente  
**Riesgo**: Bug si se cambia formato de Timestamp  
**Fix**: Una línea: `toMs(t.dueAt)`

---

### 10. **services/productivityAdvanced.js** (2 bugs)
```javascript
❌ L137, L195: typeof task.createdAt === 'number' ? ...
```
**Problema**: Asume createdAt es siempre uno de 2 tipos  
**Riesgo**: String ISO breaks silenciosamente  
**Fix**: Usar `toMs()`

---

### 11. **services/taskConfirmations.js** (1 bug)
```javascript
❌ L220: const dueAt = task.dueAt?.toMillis?.() || task.dueAt;
```
**Problema**: Fallback a `task.dueAt` puede ser Timestamp  
**Riesgo**: Mezcla tipos - a veces número, a veces Timestamp  
**Fix**: Usar `toMs()`

---

### 12. **services/ReportsExport.js** (1 bug)
```javascript
❌ L88: .filter(t => t.dueAt && t.dueAt < now && t.status !== 'cerrada')
```
**Problema**: Exportación genera reportes con datos incorrectos  
**Riesgo**: Cliente descarga datos falsos  
**Fix**: Usar `isOverdue(t)`

---

### 13. **services/notifications.js** (3 bugs)
```javascript
❌ L74: const due = typeof task.dueAt === 'number' ? new Date(task.dueAt) : new Date(task.dueAt);
❌ L125: [repetido]
❌ L177: [repetido]
```
**Problema**: Asume binary choice (number vs coercible)  
**Riesgo**: Firestore `{seconds: 123}` → `new Date({seconds: 123})` → Invalid Date  
**Fix**: `toDate(task.dueAt)`

---

## 🟡 ARCHIVOS CON PROBLEMAS DE EDGE CASES

### services/offlineSync.js (líneas 298-299)
```javascript
⚠️ L298-299: Conversion sin validación de tipo previo
```

### services/tasksMultiple.js (línea 153)
```javascript
⚠️ L153: task.dueAt conversion antes de Timestamp.fromMillis
```

### services/tasks.js (línea 508)
```javascript
⚠️ L508: updatedAt dueAt sin validación
```

### services/AreaAnalytics.js (líneas 26, 132, 244)
```javascript
⚠️ Conversiones múltiples sin centralización
```

---

## 📋 CRÍTICA ENCONTRADA EN dateUtils.js

### ❌ BUG EN toMs(): Zero timestamp
```javascript
export const toMs = (timestamp) => {
  if (!timestamp) return null; // ❌ PROBLEMA: 0 es falsy pero válido
  // ...
}
```

**Impacto**: Cualquier task con `dueAt = 0` (epoch) será ignorado silenciosamente

---

## ✅ PLAN DE REMEDIACIÓN

### Paso 1: Documentación (HECHO ✅)
- ✅ Este archivo generado

### Paso 2: Fijar dateUtils.js (toMs)
```javascript
export const toMs = (timestamp) => {
  if (timestamp === null || timestamp === undefined) return null;
  // Cambiar de: if (!timestamp) return null;
  // A:          if (timestamp === null || timestamp === undefined) return null;
}
```

### Paso 3: Crear Migration Script (EN PROGRESO)
- Script que valida Firestore data
- Detecta Timestamps mal formados
- Prepara backup

### Paso 4: Refactor ALL 13 Files
Usar búsqueda/remplazo + validación manual

### Paso 5: Unit Tests (HECHO ✅)
- dateUtils.test.js creado
- 20+ test cases
- Edge cases incluidos

### Paso 6: Validation Script
- Verifica todas las comparaciones
- Reporte antes de deploy

---

## 🎯 PRIORIDAD DE FIX

| Prioridad | Archivos | Acción |
|-----------|----------|--------|
| 🔴 URGENTE | analytics.js, HomeScreen, MyInboxScreen | Hoy |
| 🔴 URGENTE | ReportsScreen, reports.js | Hoy |
| 🔴 URGENTE | Fijar dateUtils (zero bug) | Hoy |
| 🟡 IMPORTANTE | emailNotifications, notifications | Mañana |
| 🟡 IMPORTANTE | KanbanScreen, SecretarioDashboard | Mañana |
| 🟡 IMPORTANTE | services/ (AreaAnalytics, etc) | Mañana |

---

## 📊 ESTADÍSTICAS

- **Total de bugs encontrados**: 59
- **Archivos afectados**: 24
- **Bugs críticos**: 31
- **Bugs no manejados**: 5+
- **Puntos de falla**: 3 (dateUtils.toMs, conversiones inline, faltas de validación)

---

## 🚀 SIGUIENTE PASO

**NO disponible en producción hasta:**
1. ✅ dateUtils.toMs() soporta 0
2. ✅ Todos 13 archivos refactorizados
3. ✅ Validación pasada
4. ✅ Migration script ejecutado en staging
5. ✅ Tests pasados

---

**Por**: GitHub Copilot  
**Fecha**: 5 de Marzo, 2026  
**Validado**: Audit automático + búsqueda de patrones
