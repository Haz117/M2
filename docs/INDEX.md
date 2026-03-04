# 📚 Documentación - Index

Guía rápida de servicios, componentes y pantallas principales.

## 🔗 Servicios Principales

### Gestión de Tareas
- **[services/tasks.js](../services/tasks.js)** - CRUD de tareas, suscripciones real-time
- **[services/tasksMultiple.js](../services/tasksMultiple.js)** - Operaciones en lote
- **[services/taskProgress.js](../services/taskProgress.js)** - Seguimiento de progreso

### Análisis y Reportes
- **[services/analytics.js](../services/analytics.js)** - Cálculo de métricas globales
- **[services/AreaAnalytics.js](../services/AreaAnalytics.js)** - Análisis por áreas
- **[services/areaMetrics.js](../services/areaMetrics.js)** - Métricas detalladas por área
- **[services/ReportsExport.js](../services/ReportsExport.js)** - Exportación de reportes

### Notificaciones y Alertas
- **[services/notificationsAdvanced.js](../services/notificationsAdvanced.js)** - Sistema avanzado
- **[services/emailNotifications.js](../services/emailNotifications.js)** - Notificaciones por email
- **[services/AreaAlerts.js](../services/AreaAlerts.js)** - Alertas automáticas por área

### Utilidades
- **[utils/dateUtils.js](../utils/dateUtils.js)** 🆕 - Helpers para timestamps Firebase
- **[utils/haptics.js](../utils/haptics.js)** - Feedback háptico
- **[utils/responsive.js](../utils/responsive.js)** - Estilos responsive
- **[utils/networkMonitor.js](../utils/networkMonitor.js)** - Monitoreo de conectividad

## 🎨 Componentes Principales

### Tarjetas y Información
- **Card.js** - Componente base de tarjeta
- **StatCard.js** - Tarjeta de estadísticas
- **MetricCard.js** - Tarjeta de métricas
- **SpringCard.js** - Tarjeta con animación

### Entrada de Datos
- **Input.js** - Campo de entrada estándar
- **SearchBar.js** - Barra de búsqueda
- **DateTimeSelector.js** - Selector de fecha/hora
- **TagInput.js** - Input para etiquetas
- **MultiUserSelector.js** - Selector múltiple de usuarios

### Indicadores y Progreso
- **ProgressBar.js** - Barra de progreso
- **CircularProgress.js** - Progreso circular
- **AnimatedBadge.js** - Badge animado
- **PulsingDot.js** - Punto pulsante

### Diálogos y Modales
- **ConfirmDialog.js** - Diálogo de confirmación
- **DeleteConfirmDialog.js** - Confirmación de eliminar
- **BottomSheet.js** - Panel desde abajo
- **ReportDetailsModal.js** - Modal de detalles

### Listas y Tablas
- **TaskItem.js** - Item individual de tarea
- **SubtasksList.js** - Lista de subtareas
- **AreaSelectorModal.js** - Selector de áreas

### Gráficos
- **Heatmap.js** - Mapa de calor
- **AreaComparisonChart.js** - Gráfico comparativo
- **AreaRankingCard.js** - Ranking de áreas

## 📱 Pantallas Principales

### Tareas
- **screens/HomeScreen.js** - Lista principal de tareas
- **screens/TaskDetailScreen.js** - Detalle y edición
- **screens/TaskProgressScreen.js** - Seguimiento de progreso
- **screens/TaskChatScreen.js** - Chat por tarea

### Vistas principales
- **screens/KanbanScreen.js** - Tablero Kanban (pendiente → revisión → cerrada)
- **screens/CalendarScreen.js** - Vista mensual de tareas
- **screens/DashboardScreen.js** - KPIs y trending
- **screens/MyInboxScreen.js** - Bandeja personal

### Reportes
- **screens/ReportsScreen.js** - Reportes con gráficos
- **screens/AnalyticsScreen.js** - Análisis avanzado
- **screens/AdminReportsScreen.js** - Reportes administrativos
- **screens/MyAreaReportsScreen.js** - Reportes del área

### Administración
- **screens/AdminScreen.js** - Panel administrativo general
- **screens/AdminExecutiveDashboard.js** - Dashboard ejecutivo
- **screens/AreaChiefDashboard.js** - Dashboard de jefe de área
- **screens/SecretarioDashboardScreen.js** - Dashboard de secretario

### Otros
- **screens/LoginScreen.js** - Autenticación
- **screens/NotificationsScreen.js** - Centro de notificaciones
- **screens/area/AreaManagementScreen.js** - Gestión de áreas

## 🔐 Configuración

- **[config/areas.js](../config/areas.js)** - Definición de áreas y secretarías
- **[config/permissions.js](../config/permissions.js)** - Matriz de permisos por rol
- **[theme/tokens.js](../theme/tokens.js)** - Tokens de diseño (espaciado, colores, tipografía)

## 🌐 Contextos (Context API)

- **contexts/ThemeContext.js** - Temas (claro/oscuro)
- **contexts/TasksContext.js** - Estado global de tareas
- **contexts/NotificationsContext.js** - Notificaciones globales

## 📦 Dependencias Principales

```json
{
  "react-native": "0.76",
  "expo": "^51.0",
  "firebase": "^11.1",
  "@react-navigation": "latest",
  "react-native-chart-kit": "^6.12.0",
  "expo-linear-gradient": "^14.0",
  "react-native-paper": "^5.12",
  "@react-native-async-storage": "^1.24"
}
```

## 🚀 Tips y Mejores Prácticas

### Timestamps
Siempre usar `dateUtils.toMs()` para comparaciones:
```javascript
import { toMs, isOverdue } from '../utils/dateUtils';

if (isOverdue(task)) {
  // Task is past due date
}
```

### Estado Global
Usar `TasksContext` para acceder a tareas sin prop-drilling:
```javascript
const { tasks, updateTask } = useTasks();
```

### Notificaciones
Usar el sistema centralizado para consistencia:
```javascript
import { sendNotification } from '../services/notificationsAdvanced';

await sendNotification({
  type: 'task_assigned',
  title: '📋 Nueva tarea asignada',
  body: 'Se te asignó una nueva tarea',
});
```

### Exportación
Los reportes soportan exportación a CSV/PDF:
```javascript
import { exportAreaReport } from '../services/ReportsExport';

const { success, filename } = await exportAreaReport(data);
```

---

**Última actualización**: Marzo 2026
