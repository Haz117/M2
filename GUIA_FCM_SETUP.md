# GUÍA COMPLETA: CONFIGURAR FIREBASE CLOUD MESSAGING (FCM)

**Fecha:** 15 de Febrero, 2026  
**Versión:** 1.0 - FCM Setup Guide  
**Tiempo Estimado:** 30-45 minutos

---

## 📋 TABLA DE CONTENIDOS
1. [Requisitos Previos](#requisitos)
2. [Configurar Firebase Console](#firebase-console)
3. [Android - Google Play Services](#android)
4. [iOS - APNs Setup](#ios)
5. [Deployment de Cloud Functions](#cloud-functions)
6. [Testing & Validation](#testing)

---

## 1. REQUISITOS PREVIOS {#requisitos}

✅ Tener Firebase proyecto creado  
✅ Tener Expo project configurado  
✅ Node.js instalado (v14+)  
✅ Firebase CLI instalado

```bash
npm install -g firebase-tools
firebase login
```

---

## 2. CONFIGURAR FIREBASE CONSOLE {#firebase-console}

### Paso 1: Habilitar Cloud Messaging

1. Ir a **Firebase Console**
2. Seleccionar tu proyecto
3. Ir a **Messaging** → **Cloud Messaging**
4. Copiar:
   - **Server Key** (Clave del servidor)
   - **Sender ID** (ID del remitente)
   - **Web API Key**

### Paso 2: Crear Accounts de Servicio

1. Ir a **Project Settings** → **Service Accounts**
2. Descargar JSON en:
   ```
   firebase-functions/serviceAccountKey.json
   ```

### Paso 3: Crear Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colecciones públicas
    match /push_notifications_queue/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /scheduled_notifications/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /user_push_tokens/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Notificaciones históricas (lectura)
    match /notification_history/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 3. ANDROID - GOOGLE PLAY SERVICES {#android}

### Paso 1: Obtener google-services.json

1. En Firebase Console → Settings → Google Play
2. Descargar `google-services.json`
3. Guardar en: `android/app/google-services.json`

### Paso 2: Configurar gradle (Android)

```gradle
// android/build.gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
  }
}

// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
  implementation 'com.google.firebase:firebase-messaging:23.1.1'
}
```

### Paso 3: Permisos en AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
```

---

## 4. iOS - APNs SETUP {#ios}

### Paso 1: Crear APNs Certificate

1. Ir a **Apple Developer Account**
2. **Certificates, Identifiers & Profiles**
3. **Certificates** → **Create New**
4. Seleccionar:
   - **Apple Push Services Certificate** (APNs)
   - Development o Production
5. CSR (Certificate Signing Request):
   ```bash
   # Generar en Keychain Access
   # Opción: Request a Certificate from a Certificate Authority
   ```
6. Descargar certificado `.cer`

### Paso 2: Convertir a .p8 (Recomendado - Token)

```bash
# Abrir Apple Developer
# Keys → Create New Key
# Seleccionar "Apple Push Notifications service (APNs)"
# Descargar .p8
```

Mejor opción: Usar Token en lugar de certificado

### Paso 3: Agregar a Firebase

1. Firebase Console → Project Settings → Cloud Messaging
2. iOS Configuración → Subir certificado o token
3. Team ID: Tu Team ID de Apple

### Paso 4: app.json (Expo)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

---

## 5. DEPLOYMENT DE CLOUD FUNCTIONS {#cloud-functions}

### Paso 1: Crear Proyecto de Functions

```bash
cd firebase-functions
npm install
```

### Paso 2: package.json

```json
{
  "name": "todo-app-functions",
  "version": "1.0.0",
  "dependencies": {
    "firebase-admin": "^11.5.0",
    "firebase-functions": "^4.3.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Paso 3: Deploy Functions

```bash
# Desde raíz del proyecto
firebase deploy --only functions

# Output esperado:
# ✔  functions[cleanupExpiredTokens] ...
# ✔  functions[processPushNotificationQueue] ...
# ✔  functions[processScheduledNotifications] ...
# ✔  functions[notifyDueTasksReminder] ...
# ✔  functions[onTaskCreated] ...
# ✔  functions[onReportRated] ...
# ✔  functions[testPushNotification] ...
```

### Paso 4: Enable Cloud Scheduler (Para Scheduled)

```bash
firebase setup:web
gcloud services enable cloudscheduler.googleapis.com
```

---

## 6. TESTING & VALIDATION {#testing}

### Test 1: HTTP Endpoint

```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/testPushNotification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "title": "Test Notification",
    "body": "This is a test push notification"
  }'
```

### Test 2: Enviar desde App

```javascript
// En App.js después de login
import { registerPushToken, sendPushNotification } from './services/pushNotifications';

useEffect(() => {
  const setup = async () => {
    const currentUser = await getCurrentSession();
    if (currentUser) {
      // Registrar token de este dispositivo
      await registerPushToken(currentUser.uid);
      
      // Test: Enviar notificación a sí mismo
      await sendPushNotification(currentUser.uid, {
        title: '🎉 Test Push Notification',
        body: 'Si ves esto, FCM está funcionando!',
        data: { type: 'test' }
      });
    }
  };
  
  setup();
}, []);
```

### Test 3: Verificar Firestore

```bash
# Verificar que tokens se guardaron
firebase firestore:delete user_push_tokens --recursive

# Verificar notificaciones procesadas
firebase firestore:get push_notifications_queue
```

---

## 📱 FLUJO COMPLETO ESPERADO

```
1. Usuario inicia sesión
   ↓
2. App registra push token en /user_push_tokens
   ↓
3. Tarea creada → Trigger onTaskCreated
   ↓
4. Notificación entra a /push_notifications_queue
   ↓
5. Cloud Scheduler ejecuta processPushNotificationQueue
   ↓
6. Firebase Messaging envía a todos los tokens del usuario
   ↓
7. Dispositivo recibe push notification
   ↓
8. Usuario toca → Abre tarea automáticamente
```

---

## 🐛 TROUBLESHOOTING

### "No tokens available"
```
✓ Asegurar que registerPushToken() se ejecutó
✓ Verificar que /user_push_tokens tiene documentos
✓ Resetear app y re-registrar
```

### "Invalid registration token"
```
✓ Token expirado → Cloud Function elimina automáticamente
✓ Re-registrar token nuevo
```

### "Cloud Messaging not available"
```
✓ Verificar Firebase.json
✓ Verificar que FCM está habilitado en Firebase Console
✓ Check Firebase quota
```

### "iOS notifications not received"
```
✓ Verificar APNs certificate está vigente
✓ Revisar App.json plugins config
✓ Probar en dispositivo físico (no simulator)
```

---

## 📊 MONITOREO

### Cloud Functions Logs

```bash
firebase functions:log

# O en Firebase Console:
# Functions → Logs
```

### Firestore Metrics

```
- push_notifications_queue (pending vs sent)
- user_push_tokens (total registrados)
- notification_history (historial)
```

---

## 🔄 MANTENIMIENTO

### Limpiar datos viejos (automático)
- Tokens expirados: Eliminados después de 30 días ✓
- Notificaciones: Expiradas después de 24 horas ✓

### Monitorizar cuota
- FCM por defecto: 1,000 notificaciones/día gratuito
- Upgrade: Pricing paga después

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

- [ ] Firebase Console: FCM habilitado
- [ ] Android: google-services.json en lugar correcto
- [ ] iOS: APNs certificate/token subido
- [ ] Cloud Functions: Deployadas sin errores
- [ ] Firestore Rules: Actualizadas
- [ ] Testing: Push notificaciones llegan
- [ ] Deep linking: Funciona al tocar notificación
- [ ] Tokens: Se registran en /user_push_tokens
- [ ] Monitoreo: Logs visibles en Firebase

---

## 🚀 DEPLOY A PRODUCCIÓN

### 1. Build Android
```bash
eas build --platform android
eas submit --platform android
```

### 2. Build iOS
```bash
eas build --platform ios
eas submit --platform ios
```

### 3. Monitoring Post-Deploy
```
1. Revisar Firebase logs
2. Monitorear cuota de FCM
3. Verificar tasas de entrega
4. Feedback de usuarios
```

---

## 📞 SOPORTE

**Firebase Docs:** https://firebase.google.com/docs/messaging  
**Expo Docs:** https://docs.expo.dev/push-notifications  
**Cloud Functions:** https://firebase.google.com/docs/functions  
**Troubleshooting:** https://firebase.google.com/docs/messaging/troubleshoot

---

**✅ Guía completa lista para implementar FCM en producción**
