# 🔄 PLAN DE ROLLBACK - Post-Fix de Timestamps

**Fecha de Contingencia**: 5 de Marzo, 2026  
**Aplicable cuando**: Bugs inesperados post-refactor, datos corruptos, bugs en producción  

---

## 📋 ESCENARIOS Y PROCEDIMIENTOS

### ESCENARIO 1: "Reportes muestran datos incorrectos"

**Síntomas**:
- `DashboardScreen` muestra tareas vencidas incorrectamente
- `ReportsScreen` muestra NaN días
- Estadísticas inconsistentes

**Diagnóstico** (5 min):
```bash
# 1. Conectarse a Firestore console
firebase emulators:start

# 2. Ejecutar análisis
node firebase-functions/migrateTimestamps.js analyze

# 3. Revisar TIMESTAMP_AUDIT.md para archivos sospechosos
```

**Root Causes Posibles**:
- `analytics.js` aún usa conversión manual en lugar de `dateUtils`
- `ReportsScreen.js` compara `createdAt >= weekAgo` sin convertir
- dateUtils.toMs() falla en edge case (null, 0, undefined)

**Recovery** (15 min):
```bash
# Opción 1: Revert a versión anterior
git revert HEAD~2:services/analytics.js
git revert HEAD~2:screens/ReportsScreen.js

# Opción 2: Hotfix (si es bug menor)
# - Editar el archivo específico
# - Importar dateUtils
# - Reemplazar conversiones manuales
# - Desplegar

# Opción 3: Recalcular data (si es integridad de datos)
node firebase-functions/calculateMissingTimestamps.js --recalculate
```

**Prevention**:
```javascript
// En analytics.js, agregar tipo de dato:
const toMs = (ts) => {
  if (!ts) return null;
  return typeof ts === 'number' ? ts : ts?.toMillis?.() ?? null;
};
```

---

### ESCENARIO 2: "Búsqueda está rota"

**Síntomas**:
- Filtro de "tareas vencidas" no funciona
- Búsqueda tiene resultados incorrectos
- Tasks pendientes no aparecen

**Diagnóstico** (5 min):
```javascript
// En browser console
const task = {...}; // Sample task
console.log('dueAt type:', typeof task.dueAt, task.dueAt);
console.log('Is overdue?', task.dueAt < Date.now()); // ← Aquí está el problema
```

**Root Causes**:
- `HomeScreen.js` está comparando Timestamp objeto directamente
- `MyInboxScreen.js` aún usa `task.dueAt < Date.now()`
- dateUtils no fue importado correctamente

**Recovery** (10 min):
```bash
# Revert específico
git checkout HEAD -- screens/HomeScreen.js screens/MyInboxScreen.js

# O hotfix rápido:
# Buscar: filter(t => t.dueAt < Date.now())
# Reemplazar: filter(t => isOverdue(t))
# + agregar: import { isOverdue } from '../utils/dateUtils'
```

**Prevention**:
```javascript
// Agregar type check en runtime:
const safeFilter = (tasks) => {
  return tasks.filter(t => {
    if (!t.dueAt) return false;
    const ms = typeof t.dueAt === 'number' ? t.dueAt : t.dueAt?.toMillis?.();
    return ms && ms < Date.now();
  });
};
```

---

### ESCENARIO 3: "notificaciones no se envían"

**Síntomas**:
- FCM notifications no trigger para tareas vencidas
- emailNotifications falla silenciosamente
- Cloud logs lleno de errores de timestamp

**Diagnóstico** (10 min):
```bash
# Ver Cloud Logs
gcloud functions logs read calculateOverdueNotifications --limit=50

# Buscar errores de timestamp:
# - "Cannot read property 'toMillis' of undefined"
# - "Invalid Date"
# - "NaN"
```

**Root Cause**:
- `notificationsAdvanced.js` O `emailNotifications.js` tiene conversión manual fallida
- `task.dueAt` es Timestamp pero código asume número

**Recovery** (20 min):
```bash
# Stop notifications primero (no bloquear usuarios)
firebase functions:log --function=calculateOverdueNotifications

# Editar el archivo
# - Cambiar: const dueMs = task.dueAt.seconds * 1000
# - A:       const dueMs = toMs(task.dueAt)
# - + import { toMs } from '../utils/dateUtils'

# Deploy hotfix
firebase deploy --only functions:calculateOverdueNotifications

# Monitorear
firebase functions:logs read calculateOverdueNotifications -f
```

**Prevention**:
```javascript
// Crear wrapper para Cloud Functions
const safe = require('../utils/dateUtils');

exports.calculateOverdueNotifications = functions
  .pubsub.schedule('*/5 * * * *') // cada 5 min
  .onRun(async (context) => {
    try {
      const tasks = await getTasks();
      const overdue = tasks.filter(t => safe.isOverdue(t));
      // ...
    } catch (error) {
      console.error('CRITICAL', error);
      // Alertar ops team
      await alertOpsTeam(error);
    }
  });
```

---

### ESCENARIO 4: "Datos corruptos - timestamps inválidos en DB"

**Síntomas**:
- Ver `TIMESTAMP_AUDIT.md` con muchos `INVALID_OBJECT`
- Custom Firebase Timestamps con estructura extraña
- Crashes en múltiples pantallas

**Diagnóstico** (10 min):
```bash
# Ejecutar análisis completo
node firebase-functions/migrateTimestamps.js analyze

# Ver resultados en TIMESTAMP_AUDIT.md
# Si hay > 10 problemas: necesitas migración de datos
```

**Root Cause**:
- Un script escribió timestamps sin convertir
- `tasksMultiple.js` OR `tasks.js` tiene bug en conversión
- Offline sync escribió datos inválidos

**Recovery** (60+ min - requiere cuidado):
```bash
# PASO 1: Backup inmediato
firebase backups:create --retention-days 7

# PASO 2: Analizar qué está roto
node firebase-functions/migrateTimestamps.js analyze > analysis.json

# PASO 3: Opción A - Revert si hay pocos documentos afectados
# (revert el código que escribió datos inválidos)

# PASO 3: Opción B - Migración si hay muchos documentos
# - Crear script que:
#   - Lee cada task/user
#   - Convierte dueAt/createdAt a Firestore.Timestamp
#   - Escribe de vuelta
#   - Registra cada cambio

# PASO 4: Validar
node firebase-functions/migrateTimestamps.js validate
```

**Prevention**:
```javascript
// En cualquier lugar que escriba timestamp:
if (!timestamp instanceof Timestamp && typeof timestamp !== 'number') {
  throw new Error(`Invalid timestamp type: ${typeof timestamp}`);
}
```

---

## 🎯 QUICK REFERENCE - Qué REVERTIR

| Problema | Archivo | Línea | Revert Comando |
|----------|---------|-------|-----------------|
| Reportes NaN | analytics.js | 101-430 | `git checkout HEAD -- services/analytics.js` |
| Búsqueda rota | HomeScreen.js | 574-589 | `git checkout HEAD -- screens/HomeScreen.js` |
| Búsqueda rota | MyInboxScreen.js | 297-304 | `git checkout HEAD -- screens/MyInboxScreen.js` |
| Kanban vacío | KanbanScreen.js | 1020-1040 | `git checkout HEAD -- screens/KanbanScreen.js` |
| Reports vacíos | ReportsScreen.js | 467-494 | `git checkout HEAD -- screens/ReportsScreen.js` |
| Notif rotas | emailNotifications.js | 145 | `git checkout HEAD -- services/emailNotifications.js` |
| **TODO** | **TODO** | - | `git revert <commit-hash>` |

---

## ⏱️ ESCALATION TIMELINE

| Tiempo | Acción |
|--------|--------|
| T+0 min | Usuario reporta bug |
| T+5 min | Ejecutar `migrateTimestamps.js analyze` |
| T+10 min | Identificar archivo problemático |
| T+15 min | Revert OR hotfix |
| T+20 min | Deploy |
| T+25 min | Monitorear logs |
| T+60 min | Post-mortem si fue crítico |

---

## 🔐 SEGURIDAD DEL ROLLBACK

**Autorización requerida**:
- Any hotfix: Code review antes de merge
- Revert: Solo si bug afecta > 5% usuarios
- Migración de datos: Requiere backup + revisión DBA

**Monitoreo post-rollback**:
```javascript
// Agregar a App.js
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    const errors = await checkTimestampIntegrity();
    if (errors.length > 0) {
      console.error('⚠️ Timestamp issues:', errors);
      // Alertar Sentry/LogRocket
      Sentry.captureException(new Error('Timestamp integrity check failed'));
    }
  }, 5 * 60 * 1000); // cada 5 min
}
```

---

## 📞 CONTACTOS DE EMERGENCIA

- **Firebase Issues**: firebase-team@municipio.com
- **On-Call Engineer**: Ver escalation policy
- **DBA** (si datos corruptos): dba@municipio.com

---

## CHECKLIST DE ROLLBACK

- [ ] Identificar archivo problemático
- [ ] Crear backup (si migración)
- [ ] Revert OR hotfix en rama separada
- [ ] Tests locales pasados
- [ ] PR review (si posible)
- [ ] Deploy a staging primero
- [ ] Validar `migrateTimestamps.js validate`
- [ ] Deploy a producción
- [ ] Monitorear 30 minutos
- [ ] Post-mortem (si fue crítico)

---

**Última revisión**: 5 de Marzo, 2026  
**Validez**: Hasta que se complete refactor de timestamps  
**Próximo review**: Después deploy a producción
