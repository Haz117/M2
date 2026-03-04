# 📋 TodoApp MORENA

Sistema completo de gestión de tareas con roles, permisos y sincronización en tiempo real.

![Version](https://img.shields.io/badge/version-1.0.0-9F2241) ![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB) ![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28) ![Expo](https://img.shields.io/badge/Expo-SDK%2053-000020)

## Descripción

Aplicación multiplataforma de gestión de tareas desarrollada con React Native y Expo, con backend Firebase. Incluye sistema de autenticación, notificaciones push, chat en tiempo real y múltiples vistas para organizar el trabajo.

## 🚀 Características Principales

### ✅ Gestión de Tareas
- Crear, editar y eliminar tareas
- Asignación de tareas a usuarios
- Prioridades y estados personalizables
- Fechas de compromiso con recordatorios automáticos

### 🔐 Sistema de Autenticación
- Login seguro con Firebase Auth
- Roles de usuario (Admin, Jefe, Operativo)
- Gestión de permisos por departamento
- Control de acceso basado en roles

### 🔔 Notificaciones
- Notificaciones push en tiempo real (FCM)
- Recordatorios automáticos programables
- Alertas de asignación de tareas
- Notificaciones de nuevos comentarios

### 💬 Colaboración
- Chat por tarea en tiempo real
- Sistema de firmas digitales
- Comentarios y actualizaciones
- Sincronización instantánea con Firestore

### 📊 Vistas y Reportes
- Vista principal tipo Bento Grid
- Vista Kanban interactiva con Drag & Drop
- Bandeja de entrada personalizada
- Reportes y estadísticas por área
- Exportación de datos (CSV)

### 📱 Multiplataforma
- Compatible con iOS, Android y Web
- Diseño responsive y adaptativo
- Modo offline con sincronización automática

## 🔒 Seguridad

**IMPORTANTE:** Este proyecto utiliza variables de entorno para proteger credenciales sensibles.

### Configuración de Credenciales

1. Copia el archivo `.env.example` y renómbralo a `.env`
2. Completa con tus credenciales de Firebase
3. **NUNCA** subas el archivo `.env` al repositorio

El archivo `.env` está incluido en `.gitignore` para tu seguridad.

## 📋 Requisitos Previos

- Node.js v16 o superior
- npm o yarn
- Expo CLI (se instala automáticamente)
- Cuenta en [Firebase Console](https://console.firebase.google.com/)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Haz117/To-do.git
cd To-do
```

### 2. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### 3. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita **Authentication** con Email/Password
3. Crea una base de datos **Firestore**
4. Habilita **Cloud Messaging** para notificaciones push
5. Copia tus credenciales

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
FIREBASE_API_KEY=tu_api_key_aqui
FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

### 5. Reglas de Firestore

Configura estas reglas de seguridad en Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm start
```

O con Expo CLI:

```bash
npx expo start
```

### Opciones de Ejecución

- **Android:** Presiona `a` en la terminal o ejecuta `npm run android`
- **iOS:** Presiona `i` en la terminal o ejecuta `npm run ios`
- **Web:** Presiona `w` en la terminal o ejecuta `npm run web`
- **Dispositivo físico:** Escanea el código QR con la app [Expo Go](https://expo.dev/client)

## 📁 Estructura del Proyecto

```
to-do/
├── components/              # Componentes reutilizables UI
│   ├── TaskItem.js
│   ├── FilterBar.js
│   └── ...
├── screens/                 # Pantallas principales
│   ├── HomeScreen.js        # Vista principal de tareas
│   ├── LoginScreen.js       # Autenticación
│   ├── KanbanScreen.js      # Vista Kanban
│   ├── AdminScreen.js       # Panel de administración
│   ├── MyInboxScreen.js     # Bandeja de entrada personal
│   ├── ReportScreen.js      # Reportes y estadísticas
│   ├── TaskDetailScreen.js  # Detalle y edición de tareas
│   └── TaskChatScreen.js    # Chat por tarea
├── services/                # Lógica de negocio
│   ├── auth.js              # Autenticación Firebase
│   ├── tasks.js             # CRUD de tareas
│   ├── roles.js             # Gestión de roles y usuarios
│   ├── notifications.js     # Notificaciones locales
│   └── fcm.js               # Push notifications (FCM)
├── theme/                   # Estilos y temas
├── utils/                   # Funciones utilitarias
│   ├── dateUtils.js         # 🆕 Helpers para timestamps Firebase
│   ├── haptics.js           # Feedback háptico
│   ├── responsive.js        # Utilidades responsive
│   └── ...
├── App.js                   # Punto de entrada
├── firebase.js              # Configuración Firebase
└── app.config.js            # Configuración Expo
```

## ⚠️ Solución de Problemas

### Problemas con dependencias

```bash
npx expo install --fix
```

### Limpiar caché de Metro

```bash
npx expo start --clear
```

### Reinstalar dependencias

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Error de Firebase Auth

Asegúrate de que Firebase está correctamente inicializado y que las credenciales en `.env` son correctas.

## 🛠️ Tecnologías Utilizadas

- **React Native** - Framework principal
- **Expo** - Herramientas de desarrollo
- **Firebase Auth** - Autenticación
- **Firestore** - Base de datos en tiempo real
- **Firebase Cloud Messaging** - Notificaciones push
- **React Navigation** - Navegación
- **AsyncStorage** - Almacenamiento local

## 🔄 Utilidades de Timestamp

### dateUtils.js

Nuevo módulo de utilidades para manejo seguro de timestamps de Firebase:

```javascript
import { toMs, isBefore, isAfter, isOverdue, diffDays } from './utils/dateUtils';

// Convertir timestamp a milisegundos
const ms = toMs(task.dueAt); // Soporta Firestore Timestamp, números y Dates

// Comparar timestamps
if (isBefore(task.dueAt)) {
  // Tarea vencida
}

// Calcular diferencia en días
const daysLeft = diffDays(task.dueAt, new Date());

// Verificar si tarea está vencida
if (isOverdue(task)) {
  // Mostrar alerta
}
```

**Características:**
- ✅ Soporte para Firebase Timestamp con `.seconds` y `.toMillis()`
- ✅ Compatibilidad backwards con tipos numéricos y Date
- ✅ Funciones de comparación seguras
- ✅ Cálculo de diferencias de tiempo

## 🐛 Bugs Resueltos (2026)

- ✅ **Timestamps**: Conversión correcta entre Firestore Timestamps y milisegundos
- ✅ **Estados inconsistentes**: Normalización de `en_proceso`, `en-progreso`, `en_progreso`
- ✅ **AssignedTo**: Soporte para strings y arrays
- ✅ **Divisiones por cero**: Validaciones en cálculos
- ✅ **NaN días**: Conversión correcta de timestamps
- ✅ **Web responsiveness**: Media queries y layout improvements

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Add: nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

## 📄 Licencia

ISC License

## 👥 Autor

**Hazel Jared Almaraz**

## 🔗 Enlaces Útiles

- [Documentación de Expo](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)

---

*Desarrollado con React Native, Expo y Firebase*
