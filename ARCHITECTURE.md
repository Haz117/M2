# 🏗️ Arquitectura del Proyecto

Documentación de la estructura y buenas prácticas del proyecto M3.

## 📂 Estructura de Carpetas Optimizada

```
m3/
├── 📄 Raíz (archivos de configuración)
│   ├── App.js                 # Punto de entrada - Navegación y Context Providers
│   ├── index.js               # Entry point de Expo
│   ├── app.config.js          # Configuración de Expo
│   ├── firebase.js            # Inicialización de Firebase
│   ├── package.json           # Dependencias y scripts
│   ├── metro.config.js        # Configuración del bundler
│   ├── babel.config.js        # Configuración de Babel
│   ├── .env.example           # Template de variables de entorno
│   └── README.md              # Guía principal del proyecto
│
├── 📁 api/                     # Funciones serverless
│   └── send-email.js          # API para envío de emails (SendGrid)
│
├── 🎨 assets/                  # Recursos estáticos
│   └── [imágenes, iconos, etc]
│
├── 🧩 components/              # Componentes reutilizables
│   ├── UI Base
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Input.js
│   │   └── ...
│   ├── Indicadores
│   │   ├── ProgressBar.js
│   │   ├── CircularProgress.js
│   │   ├── AnimatedBadge.js
│   │   └── PulsingDot.js
│   ├── Listas
│   │   ├── TaskItem.js
│   │   ├── SubtasksList.js
│   │   └── ...
│   ├── Modales
│   │   ├── ConfirmDialog.js
│   │   ├── BottomSheet.js
│   │   └── ReportDetailsModal.js
│   └── Especializados
│       ├── Heatmap.js
│       ├── AreaComparisonChart.js
│       └── ...
│
├── ⚙️ config/                   # Configuración de la aplicación
│   ├── areas.js               # Definición de áreas y secretarías
│   └── permissions.js         # Matriz de permisos por rol
│
├── 🌐 contexts/                # Context API para estado global
│   ├── ThemeContext.js        # Temas (claro/oscuro)
│   ├── TasksContext.js        # Tareas globales
│   └── NotificationsContext.js
│
├── 📊 data/                    # Datos estáticos
│   └── fixtures y datos iniciales
│
├── 📚 docs/                    # Documentación técnica
│   └── INDEX.md               # Índice y guía rápida de referencias
│
├── 🔥 firebase-functions/      # Cloud Functions para Firebase
│   ├── index.js               # Funciones principales
│   ├── notifications.js       # Lógica de notificaciones
│   └── ...
│
├── 🪝 hooks/                   # Custom React Hooks
│   ├── useNotifications.js    # Hook para notificaciones
│   ├── useTaskProgress.js     # Seguimiento de progreso
│   └── ...
│
├── 📱 public/                  # Archivos públicos (web)
│   └── index.html
│
├── 🖥️ screens/                 # Pantallas de la aplicación
│   ├── Tareas
│   │   ├── HomeScreen.js      # Lista principal
│   │   ├── TaskDetailScreen.js
│   │   └── TaskChatScreen.js
│   ├── Vistas
│   │   ├── KanbanScreen.js
│   │   ├── CalendarScreen.js
│   │   └── DashboardScreen.js
│   ├── Reportes
│   │   ├── ReportsScreen.js
│   │   └── AnalyticsScreen.js
│   ├── Administración
│   │   ├── AdminScreen.js
│   │   ├── AdminExecutiveDashboard.js
│   │   └── AreaChiefDashboard.js
│   ├── Otros
│   │   ├── LoginScreen.js
│   │   ├── NotificationsScreen.js
│   │   └── MyInboxScreen.js
│   └── area/
│       └── AreaManagementScreen.js
│
├── 🔧 services/                # Lógica de negocio
│   ├── Tareas
│   │   ├── tasks.js           # CRUD principal
│   │   ├── tasksMultiple.js   # Operaciones en lote
│   │   └── taskProgress.js    # Seguimiento
│   ├── Análisis
│   │   ├── analytics.js       # Métricas globales
│   │   ├── AreaAnalytics.js   # Por áreas
│   │   └── areaMetrics.js     # Detalladas por área
│   ├── Notificaciones
│   │   ├── notificationsAdvanced.js
│   │   ├── emailNotifications.js
│   │   └── AreaAlerts.js
│   ├── Exportación
│   │   └── ReportsExport.js
│   ├── Firebase
│   │   ├── authFirestore.js
│   │   └── offlineQueue.js
│   └── Otros
│       ├── export.js
│       ├── permissions.js
│       └── area/ (gestión de áreas)
│
├── 🎨 theme/                   # Temas y tokens de diseño
│   ├── tokens.js              # Constantes de diseño
│   └── colors.js              # Paleta de colores
│
├── 🛠️ utils/                    # Funciones utilitarias
│   ├── dateUtils.js           # 🆕 Helpers para timestamps
│   ├── haptics.js             # Feedback háptico
│   ├── responsive.js          # Utilidades responsive
│   ├── networkMonitor.js      # Monitoreo de conectividad
│   ├── logger.js              # Logging
│   ├── cacheManager.js        # Caché
│   └── ... (20+ utilities)
│
├── 🌐 web/                     # Configuración específica para web
│   └── [webpack, bundler config]
│
└── 🔐 Configuración de deployment
    ├── eas.json               # EAS Build config
    ├── firebase.json          # Firebase hosting
    ├── vercel.json            # Vercel deployment
    └── firestore.rules        # Reglas de seguridad
```

## 🔄 Flujos de Datos Principales

### Tareas
```
HomeScreen
    ↓
TasksContext (useTasks)
    ↓
services/tasks.js (subscribeToTasks)
    ↓
Firebase Firestore (real-time)
```

### Notificaciones
```
services/notificationsAdvanced.js
    ↓
recordNotification() / sendLocalNotification()
    ↓
NotificationsContext
    ↓
Toast / Bell Icon
```

### Reportes
```
ReportsScreen
    ↓
services/analytics.js
    ↓
services/AreaAnalytics.js
    ↓
Firebase Firestore (queries)
    ↓
Gráficos con react-native-chart-kit
```

## 📝 Reglas de Nombrado

### Componentes
- PascalCase: `TaskItem.js`, `StatCard.js`
- No agregar sufijo "Component"
- Archivo `.js` único (no carpeta si es simple)

### Funciones y Variables
- camelCase: `getUserTasks()`, `isOverdue`
- Helpers con prefijo: `formatDate()`, `normalizeStatus()`
- Booleans con prefijo: `isActive`, `hasError`, `canDelete`

### Archivos de Servicios
- camelCase: `analytics.js`, `notificationsAdvanced.js`
- Específicos con sufijo: `ReportsExport.js`, `AreaAnalytics.js`

### Tipos especiales
- Rutas/URLs: UPPER_SNAKE_CASE
- Constantes: UPPER_SNAKE_CASE
- Formatos de fecha: `dateUtils.toMs()`, `dateUtils.toDate()`

## 🐛 Conversión de Timestamps

SIEMPRE usar `dateUtils` para conversiones:

```javascript
import { toMs, isOverdue, diffDays, isBefore } from '../utils/dateUtils';

// ❌ MALO - Comparar directo
if (task.dueAt < Date.now()) { }

// ✅ BUENO - Usar utilidades
if (isBefore(task.dueAt)) { }
if (isOverdue(task)) { }
const days = diffDays(task.dueAt, new Date());
```

## 🔗 Importaciones Recomendadas

```javascript
// Context API
import { useTasks } from '../contexts/TasksContext';
import { useTheme } from '../contexts/ThemeContext';

// Utilidades comunes
import { toMs, isOverdue } from '../utils/dateUtils';
import { hapticMedium } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

// Componentes base
import Toast from '../components/Toast';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';

// Servicios
import { getCurrentSession } from '../services/authFirestore';
import { subscribeToTasks } from '../services/tasks';

// Temas
import { SPACING, TYPOGRAPHY, SHADOWS, RADIUS } from '../theme/tokens';
```

## ✅ Checklist para Nuevas Características

- [ ] Crear componente en `/components`
- [ ] Si es servicio, crear en `/services`
- [ ] Usar `dateUtils.toMs()` para timestamps
- [ ] Proveer loading state en componentes
- [ ] Proveer error handling con Toast
- [ ] Documentar propTypes o JSDoc
- [ ] Hacer responsive (mobile + web)
- [ ] Agregar tests si es crítico
- [ ] Actualizar INDEX.md si es necesario

## 🚀 Performance Tips

1. **Memoización**: Usar `useMemo` para cálculos pesados
2. **Suscripciones**: Limpiar con `unsubscribe()` en useEffect
3. **Queries**: Filtrar lado-servidor cuando sea posible
4. **Images**: Optimizar tamaño antes de subir
5. **Rendering**: Usar FlatList en listas largas

## 🔐 Seguridad

- Variables sensibles en `.env.local`
- Reglas de Firestore refrescan permisos
- Autenticación Firebase Auth
- Validar permisos en frontend + backend

---

**Última actualización**: Marzo 2026
