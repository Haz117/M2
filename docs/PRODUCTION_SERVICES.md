# Production Services Documentation

## Overview

Esta guía describe los nuevos servicios de producción integrados en la aplicación para mejorar confiabilidad, rendimiento y debugging.

---

## 1. Data Validation Service (`utils/dataValidation.js`)

### Propósito
Validar esquemas de datos antes de guardar en Firestore, previniendo datos corruptos.

### Esquemas Soportados
- **task**: title, status, createdBy, priority, dueAt, assignedTo, area
- **report**: taskId, content, userId, images, timestamp
- **subtask**: taskId, title, status
- **user**: email, role, area

### Uso

```javascript
import { validateData, sanitizeData, validateAndSanitize } from './utils/dataValidation';

// Validar datos
const validation = validateData(taskData, 'task');
if (!validation.valid) {
  console.error('Errores:', validation.errors);
}

// Sanitizar (remover espacios, campos no válidos)
const clean = sanitizeData(taskData, 'task');

// Validar y sanitizar en una operación
const result = validateAndSanitize(taskData, 'task');
if (result.valid) {
  saveToFirestore(result.data);
}
```

### Integración Actual
- ✅ Validación automática en `createTask()` (services/tasks.js)
- Puede extenderse a: updateTask, createReport, createSubtask

---

## 2. Cache Manager (`utils/cacheManager.js`)

### Propósito
Gestionar AsyncStorage con auto-limpieza automática, previniendo que crezca indefinidamente.

### Características
- **TTL automático**: 7 días por defecto (personalizable)
- **Límite de tamaño**: 5MB estimado
- **Limpieza periódica**: Cada 1 hora
- **Versionado**: Track de metadata (createdAt, expiresAt)

### Configuración
```javascript
// Cambiar TTL y límite de tamaño
const TTL = 14 * 24 * 60 * 60 * 1000; // 14 días
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Cambiar intervalo de limpieza
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutos
```

### API

```javascript
import { 
  setCacheItem, 
  getCacheItem,
  cleanupIfNeeded,
  getCacheStats 
} from './utils/cacheManager';

// Guardar con TTL personalizado
await setCacheItem('user_prefs', data, 30 * 24 * 60 * 60 * 1000);

// Obtener (automáticamente verifica expiration)
const data = await getCacheItem('user_prefs');

// Forzar limpieza
await cleanupIfNeeded();

// Ver estadísticas
const stats = await getCacheStats();
console.log(stats); // { totalSize: "2.5 KB", itemCount: 45, expiredCount: 3 }
```

### Integración Actual
- ✅ Auto-inicialización en App.js `startAutoCacheCleanup()`
- ✅ Auto-parada al desmontar App.js `stopAutoCacheCleanup()`
- Puede usarse para: offline cache, image cache, preferences

---

## 3. Production Logger (`utils/productionLogger.js`)

### Propósito
Logging centralizado para debugging en producción y análisis de errores.

### Funciones Disponibles

```javascript
import * as logger from './utils/productionLogger';

// Logs básicos
logger.logInfo('Task created', { taskId: '123' });
logger.logWarn('Performance issue', { duration: 5000 });
logger.logError('Firebase error', error, { operation: 'createTask' });
logger.logCritical('Auth failed', error, { userId: 'xyz' });

// Logs asíncrónos
await logger.logAsync('fetchUsers', async () => {
  return await getUsersFromDB();
});

// Obtener
const logs = await logger.getLogs();
const errors = await logger.getErrors();
```

### Niveles de Log
- **INFO**: Eventos normales de la app
- **WARN**: Comportamientos inesperados pero recuperables
- **ERROR**: Errores que afectan funcionalidad (guardado localmente)
- **CRITICAL**: Errores fatales (preparado para Sentry/Crashlytics)
- **DEBUG**: Solo en desarrollo (`__DEV__`)

### Límites de Almacenamiento
- Máximo 100 logs general
- Máximo 50 errores almacenados

### Exportar para Debugging
```javascript
const exportedLogs = await logger.exportLogs();
// JSON con: systemInfo, logs, errors
// Usar para: Email a soporte, análisis offline
```

### Integración Actual
- ✅ Inicializado en App.js
- ✅ Logs de autenticación
- ✅ Logs de errores críticos
- ✅ Logs en createTask()
- Puede extenderse a: todas las operaciones críticas

### Preparado para Servicios Externos
Código comentado listo para:
- Sentry: `Sentry.captureException(error)`
- Firebase Crashlytics: `Firebase.crashlytics().recordError(error)`
- Backend API: `POST /api/logs`

---

## 4. Enhanced Image Compression (`utils/imageCompression.js`)

### Nuevas Características

#### 4.1 Compression Caching
```javascript
import { compressImageForUpload, clearCompressionCache } from './utils/imageCompression';

// Detecta si ya está comprimida y reutiliza
const compressed = await compressImageForUpload(imageUri);

// Forzar re-compresión
const fresh = await compressImageForUpload(imageUri, { forceCompression: true });

// Ver stats del cache
const stats = await getCompressionCacheStats();
// { cachedImages: 5, sizeInMB: '2.3' }

// Limpiar cache
await clearCompressionCache();
```

#### 4.2 Auto-Detection de Velocidad
```javascript
import { detectConnectionSpeed, getAutoCompressionSettings } from './utils/imageCompression';

// Detectar velocidad actual
const speed = await detectConnectionSpeed(); 
// 'slow' | 'medium' | 'good' | 'excellent' | 'offline'

// Obtener ajustes automáticos
const settings = await getAutoCompressionSettings();
// { quality: 0.85, maxWidth: 1400, maxHeight: 1400 }

// En caché 5 minutos para no sobrecargar
```

#### 4.3 Configuración por Velocidad
```javascript
const settings = {
  slow: { quality: 0.5, maxWidth: 640 },      // 2G/3G lento
  medium: { quality: 0.7, maxWidth: 1000 },   // 3G normal
  good: { quality: 0.85, maxWidth: 1400 },    // 4G/WiFi
  excellent: { quality: 0.95, maxWidth: 1920 } // 5G/WiFi rápido
};
```

### Integración Sugerida
```javascript
// En ReportsScreen.js: compresión automática según conexión
const settings = await getAutoCompressionSettings();
const compressed = await compressImageForUpload(uri, settings);
```

---

## Flujo de Datos Completo

### Crear Tarea
```
User Input
  ↓
validateData() ← Validación de esquema
  ↓
createTask()
  ↓
🔥 Firestore (si online) / AsyncStorage (si offline)
  ↓
logInfo() ← Logger
  ↓
Task creada ✅
```

### Sincronizar Reportes con Imágenes
```
Foto tomada
  ↓
getAutoCompressionSettings() ← Detecta velocidad
  ↓
compressImageForUpload() ← Comprime y cachea
  ↓
🔥 Firestore (si online) / AsyncStorage (si offline)
  ↓
reportsSync.js ← Auto-sincroniza cuando vuelve online
  ↓
Reporte subido ✅
```

### Lifecycle de Cache
```
App.js useEffect()
  ↓
startAutoCacheCleanup() ← Inicia limpieza cada 1h
  ↓
cleanupIfNeeded() → Ejecuta periódicamente
  ↓
  - Remueve items expirados (7 días)
  - Si tamaño > 5MB, remueve los 20% más viejos
  ↓
App desmonta
  ↓
stopAutoCacheCleanup() ← Para limpieza
```

---

## Configuración Recomendada

### Para Offline Pesado (reportes con muchas fotos)
```javascript
// cacheManager.js
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000; // 14 días
const MAX_CACHE_SIZE = 20 * 1024 * 1024; // 20MB
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 1 día

// imageCompression.js
const slowSettings = { quality: 0.6, maxWidth: 800 }; // Mas comprimido
```

### Para Producción Estable
```javascript
// dataValidation.js
// Extender validación a ALL create/update operations
validateData(data, 'task/report/user') en cada operación

// productionLogger.js
// Integrar con Sentry para alertas sobre errores críticos
```

---

## Testing Local

```javascript
// En Home Screen o Admin Screen, agregar botón para:

const handleTestServices = async () => {
  // Test validation
  const validation = validateData({ title: 'Test' }, 'task');
  console.log('Validation:', validation);

  // Test cache
  await setCacheItem('test', { data: 'test' });
  const cached = await getCacheItem('test');
  console.log('Cached:', cached);

  // Test logger
  logInfo('Test log info');
  const logs = await getLogs();
  console.log('Logs:', logs);

  // Test image compression
  const stats = await getCompressionCacheStats();
  console.log('Compression stats:', stats);
};
```

---

## Próximos Pasos

### Inmediatos
- ✅ Validación en crear tareas
- ✅ Cache auto-cleanup
- ✅ Logger de errores

### Corto Plazo (1-2 semanas)
- [ ] Extender validación a updateTask, createReport
- [ ] Integración de Sentry (error tracking en producción)
- [ ] Dashboard de logs en Admin Panel

### Largo Plazo (1 mes)
- [ ] Analytics avanzado: User behavior, bottlenecks
- [ ] Rate limiting con cacheManager
- [ ] Compresión automática de imágenes en background (workers)

---

## Troubleshooting

### "Cache está muy grande"
```javascript
// Reducir TTL o MAX_SIZE en cacheManager.js
// O: await clearAllCache() para limpiar completo
```

### "¿Por qué se perdió mi imagen offline?"
```javascript
// Verificar: getCachedTasks(), getErrors()
// El logger registra todas las fallos en async
const errors = await getErrors();
console.table(errors);
```

### "¿Cómo veo los logs?"
```javascript
// En browser console:
const logs = await getLogs();
console.table(logs);
```

---

## Referencias

- AsyncStorage API: https://react-native-async-storage.github.io/
- Sentry Integration: https://docs.sentry.io/platforms/javascript/
- Firebase Crashlytics: https://firebase.google.com/docs/crashlytics

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
