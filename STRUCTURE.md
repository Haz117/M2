# 🗺️ PROJECT STRUCTURE OVERVIEW

Mapa visual de la arquitectura y componentes del proyecto M3.

## 📊 Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────┐
│                    APP.JS (Entry)                    │
├─────────────────────────────────────────────────────┤
│         ThemeProvider + TasksProvider               │
│         (Context API - Estado Global)                │
└─────────────────────────────────────────────────────┘
     ↓                    ↓                    ↓
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  HomeScreen │    │ KanbanScreen │    │ ReportsScreen│
│  (Lista)    │    │ (Kanban)     │    │ (Gráficos)   │
└─────────────┘    └──────────────┘    └──────────────┘
     ↓                    ↓                    ↓
  TaskItem         TaskCard             AreaMetrics
  TaskDetail       DragDrop             StatCard
  ├─ Chat             └─ Status        ├─ Analytics
  ├─ Comments            Change        ├─ Export
  └─ Progress          DueDate         └─ Charts
     ↓
┌─────────────────────────────────────────────────────┐
│            SERVICES LAYER (Lógica)                   │
├─────────────────────────────────────────────────────┤
│ tasks.js ├─ tasksMultiple ├─ taskProgress           │
│ analytics.js ├─ AreaAnalytics ├─ areaMetrics        │
│ notifications ├─ emailNotifications ├─ AreaAlerts    │
│ export ├─ ReportsExport ├─ permissions              │
│ auth ├─ offlineQueue ├─ area/...                    │
└─────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────┐
│         FIREBASE (Backend + Data Sync)               │
├─────────────────────────────────────────────────────┤
│ Firestore │ Auth │ Cloud Messaging │ Cloud Functions│
└─────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Crear/Actualizar Tarea
```
HomeScreen.js
    ↓
updateTask(taskId, updates)
    ↓
services/tasks.js
    ↓
Firebase Firestore
    ↓
subscribeToTasks (real-time)
    ↓
TasksContext
    ↓
todos los screens usan useTasks()
```

### Generar Reportes
```
ReportsScreen.js
    ↓
getGeneralMetrics() / analytics.js
    ↓
Firestore Query + Cálculos
    ↓
LineChart / BarChart / PieChart
    ↓
UI con datos visuales
```

### Notificar Usuario
```
evento (task overdue, assigned, etc)
    ↓
notificationsAdvanced.js
    ↓
recordNotification() ↔ sendLocalNotification()
    ↓
NotificationsContext
    ↓
Toast / NotificationsBell / SnackBar
```

## 🎯 Componentes por Categoría

### 📋 Entrada de Datos
- `Input.js` - Campo texto
- `SearchBar.js` - Búsqueda
- `DateTimeSelector.js` - Fecha/hora
- `TagInput.js` - Tags/etiquetas
- `MultiUserSelector.js` - Usuarios múltiples

### 📊 Visualización
- `Heatmap.js` - Mapa de calor
- `AreaComparisonChart.js` - Comparativas
- `AreaRankingCard.js` - Rankings
- `CircularProgress.js` - Progreso circular
- `ProgressBar.js` - Barra lineal

### 💬 Información
- `Card.js` - Base
- `StatCard.js` - Estadísticas
- `MetricCard.js` - Métrica
- `SpringCard.js` - Animado
- `TaskItem.js` - Tarea individual

### 🎭 Diálogos
- `ConfirmDialog.js` - Confirmación
- `DeleteConfirmDialog.js` - Eliminar
- `BottomSheet.js` - Panel inferior
- `ReportDetailsModal.js` - Modal reports
- `AreaSelectorModal.js` - Selector áreas

### 🎨 Indicadores
- `AnimatedBadge.js` - Badge animado
- `PulsingDot.js` - Punto pulsante
- `ProgressBadge.js` - Progreso badge
- `SuccessIndicator.js` - Éxito
- `OfflineIndicator.js` - Conectividad

## 🔧 Utilidades Disponibles

### dateUtils.js 🆕
```javascript
toMs()        // → milisegundos
isBefore()    // → boolean
isAfter()     // → boolean
isOverdue()   // → boolean (para tareas)
diffMs()      // → diferencia ms
diffDays()    // → diferencia días
toDate()      // → Date object
```

### Otros
- `haptics.js` - Vibración/feedback
- `responsive.js` - Breakpoints mobile/tablet/desktop
- `networkMonitor.js` - Conectividad
- `logger.js` - Logging
- `cacheManager.js` - Cache local

## 📱 Pantallas Principales (Screens)

```
App
├── LoginScreen
├── HomeScreen (default)
│   ├── TaskItem (list)
│   ├── SearchBar
│   ├── FilterBar
│   └── TaskDetailScreen (modal)
├── KanbanScreen
│   ├── Columns (pending → review → closed)
│   └── TaskCard (c/ drag & drop)
├── CalendarScreen
│   ├── MonthView
│   └── DayView (modal)
├── DashboardScreen
│   ├── StatCard (KPIs)
│   ├── TrendChart
│   └── AreaMetrics
├── ReportsScreen
│   ├── PeriodSelector (week/month/quarter)
│   ├── Charts (Line, Bar, Pie)
│   └── Export (CSV/PDF)
├── MyInboxScreen
│   ├── PersonalTasks
│   └── Notifications
├── AdminScreen
│   ├── UserManagement
│   ├── RoleAssignment
│   └── AreaConfiguration
└── ProfileScreen
```

## 🔐 Autenticación & Permisos

```
Firebase Auth (Email/Password)
    ↓
authFirestore.js (getCurrentSession)
    ↓
User {
  uid,
  email,
  role (admin|secretario|director|user),
  area,
  permissions {
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canViewReports,
    ...
  }
}
    ↓
Renderizar screens según permisos
```

## 🌐 API & Cloud Functions

```
Firebase Cloud Functions (index.js)
├── scheduledNotifications()  // Reminders diarios
├── onTaskCreated()           // Triggers
├── onTaskAssigned()          // Notificaciones
├── generatePDFReport()       // Export
└── syncFromExternalDB()      // Integraciones
```

## 📈 Performance Optimizations

1. **Memoization**
   ```javascript
   const tasks = useMemo(() => filterTasks(), [dependency])
   ```

2. **Virtual Scrolling**
   ```javascript
   <FlatList data={tasks} ... />
   ```

3. **Image Optimization**
   - Comprimir antes de upload
   - Usar cache de Firestore
   - Lazy load en FlatList

4. **Query Optimization**
   - Filtrar en Firestore (no en app)
   - Limitar documentos retornados
   - Propagar índices

## 🚀 Deployments

### Web (Vercel)
```
git push → GitHub
    ↓
Vercel detects changes
    ↓
npm run build
    ↓
Deploy → vercel.json
```

### Mobile (EAS)
```
eas build --platform [ios|android]
    ↓
Build en EAS servers
    ↓
eas submit → App Store / Google Play
```

### Backend (Firebase)
```
firebase deploy
    ↓
Deploy functions, rules, hosting
```

## 🔍 Debugging Quick Reference

| Situación | Solución |
|-----------|----------|
| Timestamps NaN | Usar `dateUtils.toMs()` |
| Estado no actualizando | Check Context Providers |
| Console errors | Ver console.error (unfiltered) |
| Performance lenta | Check virtualization |
| CORS errors | Ignorados (Google) |
| Offline mode | offlineQueue.js sync |
| No autenticado | RedirectTo LoginScreen |

---

**Visual refresh**: Marzo 2026
