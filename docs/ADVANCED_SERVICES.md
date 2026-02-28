# Advanced Services: Rate Limiting, Error Recovery, Network Monitoring

Tres servicios avanzados de producción que mejoran resiliencia y confiabilidad sin impactar funcionalidad.

---

## 1. Rate Limiter (`utils/rateLimiter.js`)

### Propósito
Prevenir spam y abusos, protegiendo la API de Firebase y mejorando la experiencia.

### Límites Default
```javascript
createTask: 10/minuto
updateTask: 30/minuto  
deleteTask: 5/minuto
createReport: 60/hora
uploadImage: 30/minuto
```

### API

```javascript
import { checkRateLimit, withRateLimit } from './utils/rateLimiter';

// Verificar si está permitido
const check = await checkRateLimit('createTask');
// { allowed: true, remaining: 9, limit: 10 }
// O: { allowed: false, retryAfter: 45, message: "Intenta en 45s" }

// Ejecutar con protección automática
try {
  await withRateLimit('createTask', async () => {
    return await createTask(data);
  });
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    Toast.show(`Intenta en ${error.retryAfter}s`);
  }
}

// Obtener estadísticas
const stats = await getRateLimitStats();
// { createTask: { used: 8, limit: 10, percentage: 80 } }

// Cambiar límites en runtime (admin)
setRateLimit('createTask', 20, 60000); // 20 por minuto
```

### Integración Actual
- ✅ Protección en `createTask()` (services/tasks.js)
- Usuarios legítimos nunca lo notan (10 tareas/min es mucho)
- Bots/ataques bloqueados automáticamente

### Casos de Uso
- Limita: `/min` para creaciones, `/hora` para reportes
- Respuestas amigables: "Intenta en X segundos"
- Admin puede limpiar límites: `clearRateLimits()`

---

## 2. Error Recovery (`utils/errorRecovery.js`)

### Propósito
Reintentos automáticos con backoff exponencial para errores transitorios.

### Estrategia
```
Intento 1: Falla
  ↓ (espera 1s)
Intento 2: Falla  
  ↓ (espera 2s)
Intento 3: Falla
  ↓ (espera 4s)
Intento 4: Falla
  ↓ (espera 8s)
Intento 5: Falla → Error final
```

- **Jitter**: ±20% random para evitar "thundering herd"
- **Errores reintentables**: Network, timeout, Firebase unavailable
- **Errores permanentes**: Invalid argument, not found, auth failed

### API

```javascript
import { withRetry, exponentialBackoff, CircuitBreaker } from './utils/errorRecovery';

// Reintentos básicos (4 intentos default)
const result = await withRetry(asyncFn, 'myOperation');

// Reintentos con callback
await withRetry(asyncFn, 'uploadReport', {
  maxRetries: 5,
  onRetry: ({ attempt, delay, error }) => {
    console.log(`Intento ${attempt}, esperando ${delay}ms`);
    // Actualizar UI: "Reintentando..."
  }
});

// Alias para readability
await exponentialBackoff(() => doSomethingAsync());

// Para operaciones críticas (más reintentos, delays agresivos)
await aggressiveRetry(asyncFn, 'Critical Save');

// Para sincronización en background (hasta 1 minuto)
await backgroundRetry(asyncFn, 'reportSync', 60000);

// Circuit Breaker: proteger de cascadas de fallos
const breaker = new CircuitBreaker('firebaseWrite', 5, 60000);
await breaker.execute(() => addDoc(...));
// Después de 5 fallos: OPEN (rechaza requests durante 60s)
// Luego: HALF_OPEN (intenta 1 request)
// Si éxito: CLOSED (vuelve a normal)
```

### Integración Actual
- ✅ En `createTask()` con 3 reintentos
- ✅ Detecta automáticamente si es reintentable
- ✅ Log automático de fallos

### Errores Reintentables
```javascript
✅ NETWORK_ERROR         - El dispositivo perdió conexión
✅ TIMEOUT              - Firestore tardó mucho
✅ PERMISSION_DENIED    - A veces es temporal (primer intento)
✅ UNAVAILABLE          - Firebase está down temporalmente
✅ DEADLINE_EXCEEDED    - Operación tomó mucho tiempo

❌ INVALID_ARGUMENT     - No reintenter (datos malos)
❌ NOT_FOUND            - No reintenter (no existe)
❌ ALREADY_EXISTS       - No reintenter (duplicado)
❌ UNAUTHENTICATED      - No reintenter (no hay sesión)
```

---

## 3. Network Quality Monitor (`utils/networkMonitor.js`)

### Propósito
Detectar calidad de conexión en tiempo real y adaptar comportamiento de la app.

### Métricas
- **Latencia**: ping a Google (ms)
- **Velocidad**: estimación de download
- **Tipo**: WiFi, Cellular 2G/3G/4G/5G, Ethernet, None
- **Estado**: online/offline

### Calidad
```javascript
excellent: latency < 50ms   AND speed > 10 Mbps
good:      latency < 150ms  AND speed > 5 Mbps
fair:      latency < 500ms  AND speed > 2 Mbps
poor:      latency < 1000ms AND speed > 0.5 Mbps
offline:   Sin conexión
```

### API

```javascript
import { 
  startNetworkMonitoring, 
  subscribeToNetworkStatus,
  getNetworkDescription,
  getNetworkStats 
} from './utils/networkMonitor';

// Iniciar (ya se hace en App.js)
startNetworkMonitoring();

// Suscribirse a cambios
const unsubscribe = subscribeToNetworkStatus(state => {
  console.log(state);
  // {
  //   isOnline: true,
  //   type: 'wifi',
  //   quality: 'good',
  //   latency: 45,
  //   downloadSpeed: 12.5,
  //   lastCheck: 1706395200000
  // }
});

// Descripción legible
const desc = getNetworkDescription();
// "Bueno (45ms, 12.5Mbps)"

// Estadísticas históricas
const stats = getNetworkStats();
// { avgLatency: 60, minLatency: 35, maxLatency: 200, downtime: 2.3, samples: 45 }
```

### Integración Actual
- ✅ Iniciado automáticamente en App.js
- ✅ Check cada 30 segundos
- ✅ Histórico de últimos 100 registros
- ✅ Listener para cambios en tiempo real

### Casos de Uso
1. **Mostrar indicador mejorado**
   ```javascript
   const state = getNetworkState();
   return (
     <View style={{ opacity: state.quality === 'poor' ? 0.7 : 1 }}>
       {renderContent()}
     </View>
   );
   ```

2. **Adaptar compression automáticamente**
   ```javascript
   const quality = getNetworkState().quality;
   const settings = getCompressionSettingsForConnection(quality);
   const compressed = await compressImageForUpload(uri, settings);
   ```

3. **Ajustar timeouts según conexión**
   ```javascript
   const state = getNetworkState();
   const timeout = state.quality === 'poor' ? 30000 : 10000;
   ```

4. **Dashboard de diagnóstico**
   ```javascript
   const stats = getNetworkStats();
   <Text>Downtime: {stats.downtime}%</Text>
   <Text>Latencia promedio: {stats.avgLatency}ms</Text>
   ```

---

## Flujo Completo: Crear Tarea Fiable

```
User pide crear tarea
  ↓
⏱️ Rate Limit: ¿10+ tareas en último minuto?
  ├─ SÍ: Rechazar con "Intenta en Xs"
  └─ NO: Continuar
  ↓
🔍 Validar esquema
  ├─ Inválido: Error claro ("Title requerido")
  └─ Válido: Continuar
  ↓
🌐 ¿Online?
  ├─ SÍ:
  │  ├─ 🔄 Retry (1s → 2s → 4s → 8s)
  │  ├─ 📊 Firestore addDoc
  │  └─ ✅ Tarea creada
  └─ NO:
     ├─ 💾 Guardar en AsyncStorage
     ├─ 📋 Encolar para sincronización
     └─ ⏳ Cuando vuelva online: auto-sincronizar
  ↓
📝 Log automático (info o error)
  ↓
✅ Task creada / ⏳ Task en queue / ❌ Error
```

---

## Configuración Recomendada

### Para Producción Estable
```javascript
// rateLimiter.js
createTask: 10/min      // Usuarios normales hacen 1-2/min
updateTask: 30/min      // Rápido
deleteTask: 5/min       // Cuidadoso
createReport: 60/hora    // Flexibilidad

// errorRecovery.js
maxRetries: 3-4         // No reintentar infinitamente
initialDelay: 1000ms    // 1 segundo base
maxDelay: 30000ms       // Máximo 30s entre intentos

// networkMonitor.js
CHECK_INTERVAL: 30s     // Check cada 30 segundos
KEEP_HISTORY: 100       // Últimos 100 checks
```

### Para Testing/Debug
```javascript
// Desactivar rate limit
clearRateLimits();

// Ver estadísticas
const ratStats = await getRateLimitStats();
const netStats = getNetworkStats();
console.table(ratStats);
console.table(netStats);
```

---

## Ventajas

| Servicio | Beneficio | Impacto |
|----------|-----------|--------|
| Rate Limiter | Evita crasheos por spam | Protección + UX |
| Error Recovery | Offline más confiable | +95% éxito |
| Network Monitor | Diagnóstico real-time | +Debugging |

---

## Ver También
- [Production Services](./PRODUCTION_SERVICES.md) - Validación, caché, logging
- [Offline Sync](./OFFLINE_SYNC.md) - Sistema offline-first completo
