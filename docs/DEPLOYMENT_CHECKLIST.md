# 🚀 DEPLOYMENT CHECKLIST - Lista de Verificación

**Fecha:** 15-16 Feb 2026  
**Versión App:** 1.0.0  
**Status:** Listo para envíar a App Store & Play Store

---

## ✅ CÓDIGO & TESTING

### Frontend
- [x] App.js - Push notifications integradas
- [x] TaskProgressScreen.js - Botón de reportes
- [x] TaskReportsAndActivityScreen.js - Export PDF
- [x] AdminScreen.js - Analytics accesible
- [x] Todos los estilos: tema oscuro/claro
- [x] Sin errores de compilación
- [x] Localhost:8081 corriendo exitosamente

### Services
- [x] reportsService.js - CRUD reportes con fotos
- [x] exportService.js - PDF generation
- [x] pushNotifications.js - FCM service
- [x] notificationsAdvanced.js - Local notifications
- [x] areaManagement.js - CRUD dinámico áreas

### Cloud Functions
- [x] index.js creado (500+ líneas)
- [x] 7 funciones implementadas
- [x] Schedulers configurados
- [x] Triggers Firestore listos
- [x] HTTP endpoint de testing

### Firestore
- [x] 8 collections creadas
- [x] Schema documentado
- [x] Índices optimizados
- [x] Security rules en lugar

---

## 🔧 CONFIGURACIÓN REQUERIDA (ANTES DE DEPLOY)

### 1. Firebase Cloud Functions ⏱️ 15 minutos
```bash
# En terminal, desde c:\...\todo\M2\

# 1. Copiar el archivo a firebase-functions/
cp firebase-functions/index.js firebase-functions/

# 2. Deploy a Firebase
firebase deploy --only functions

# 3. Verificar en Firebase Console
#    - Cloud Functions: 7 functions activas
#    - Cloud Scheduler: 4 jobs activos
```

**Checklist**
- [ ] npm install en firebase-functions
- [ ] firebase deploy completado
- [ ] Ver "Deploy complete!" en terminal
- [ ] Firebase Console muestra 7 funciones

### 2. Android Configuration ⏱️ 20 minutos
```bash
# 1. Descargar google-services.json
#    Firebase Console → Settings → Download google-services.json
#    Colocar en: app/google-services.json

# 2. Actualizar app.json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "extraMavenRepositories": [
            "https://maven.google.com"
          ]
        }
      }
    ]
  ]
}

# 3. Build para testing
eas build --platform android --profile preview

# 4. En Android device/emulator:
#    - Instalar APK
#    - Logear con test user
#    - Si push notification llega = ✅
```

**Checklist**
- [ ] google-services.json en app/
- [ ] app.json actualizado
- [ ] APK builds sin errores
- [ ] Push notification llega en device

### 3. iOS Configuration ⏱️ 30 minutos
```bash
# 1. Generar APNs Certificate
#    Apple Developer → Certificates → Generate APNs certificate
#    Descargar .cer file

# 2. Subir a Firebase
#    Firebase Console → Project Settings → Cloud Messaging
#    Upload APNs Certificate

# 3. Actualizar app.json
{
  "plugins": [
    "expo-notifications"
  ]
}

# 4. Build para testing
eas build --platform ios --profile preview

# 5. En iPhone via TestFlight:
#    - Install beta build
#    - Logear
#    - Si push notification llega = ✅
```

**Checklist**
- [ ] APNs certificate en Apple Developer
- [ ] Certificate uploadado a Firebase
- [ ] app.json tiene expo-notifications plugin
- [ ] iOS build sin errores
- [ ] Push notification llega en iPhone

---

## 🧪 TESTING MANUAL (1 hora)

Ejecutar en orden en device real (iPhone + Android)

### Test 1: Login & Push Token
```
1. Abrir app
2. Logear con admin
3. Revisar en Firebase Console → Firestore
   Ir a /user_push_tokens
   ¿Existe documento con userId = tu user?
   ¿Token no está vacío?
   ✅ Si → Pass | ❌ No → Debug
```

### Test 2: Task Assignment Push
```
1. Logear como admin
2. Crear nueva tarea
3. Asignar a otro usuario
4. Ese usuario debe recibir push:
   "📋 Nueva Tarea Asignada"
   ✅ Si → Pass | ❌ No → Check Cloud Functions
```

### Test 3: Report Submission
```
1. Logear como operativo
2. Abrir cualquier tarea
3. Ir a TaskProgressScreen
4. Tape botón "📄"
5. Ir a ReportFormModal (nuevo reporte)
6. Llenar: Título, Descripción, Fotos (min 1), Rating
7. Submit
8. En Firestore: ¿nuevo doc en /task_reports?
   ✅ Si → Pass | ❌ No → Check reportsService
```

### Test 4: PDF Export
```
1. En TaskReportsAndActivityScreen
2. Existe reporte anterior
3. Toca botón download (📥) en header
4. ExportReportModal abre
5. Selecciona "Single report"
6. Toca "Export PDF"
7. Debe generar PDF en ~3 segundos
8. Ofrecer Share o Download
9. ✅ Si puede descargar → Pass
```

### Test 5: Analytics Dashboard
```
1. Logear como admin
2. AdminScreen → "Analytics & Reportes"
3. AnalyticsScreen abre
4. Ver métricas:
   - Overview cards (4)
   - Rating distribution (si hay reportes)
   - Task status (chart)
   - Top 5 rated tasks
5. ✅ Datos muestran correctamente → Pass
```

### Test 6: Area Management
```
1. AdminScreen → "Gestionar Áreas"
2. AreaManagementScreen abre
3. Crear nueva área: "Test Area"
4. Editar: cambiar nombre
5. Asignar jefe
6. En Firestore: ¿área aparece?
7. ✅ CRUD completo → Pass
```

### Test 7: Area Chief Dashboard
```
1. Logear como jefe de área
2. HomeScreen → "Mi Dashboard"
3. AreaChiefDashboard abre
4. Ver:
   - Métricas (completadas, en progreso, total)
   - Gráfico de progreso
   - Lista de tareas filtradas
5. ✅ Datos mostrados → Pass
```

### Test 8: Offline Mode
```
1. Desconectar WiFi/4G
2. Intentar navegar pantallas
3. Ver tareas cached
4. Reconectar
5. Se actualizan automáticamente
6. ✅ Funciona offline básico → Pass
```

---

## 📱 BUILD PARA PRODUCCIÓN

### App Store (iOS)
```bash
# 1. Update version in app.json
{
  "runtimeVersion": "1.0.0",
  "version": "1.0.0"
}

# 2. Build production
eas build --platform ios --profile production

# 3. Submit to App Store
eas submit --platform ios

# 4. En App Store Connect:
#    - Add description de app
#    - Agregar screenshots (5-7)
#    - Agregar privacy policy
#    - Revisar rating content
#    - Submit for review

# 5. Apple revisa (~2-3 días)
#    Si aprueba → ¡En vivo en App Store!
```

**Checklist**
- [ ] Version bumped
- [ ] Screenshots en Español + Inglés
- [ ] Privacy policy URL válida
- [ ] Screenshots mostran features principales
- [ ] Descripción clara y concisa

### Play Store (Android)
```bash
# 1. Generar keystore (si no existe)
eas credentials -p android

# 2. Update version in app.json
{
  "runtimeVersion": "1.0.0",
  "version": "1.0.0"
}

# 3. Build production
eas build --platform android --profile production

# 4. Submit to Play Store
eas submit --platform android

# 5. En Google Play Console:
#    - Completas store listing
#    - Agregar screenshots (5-8)
#    - Clasificación de contenido
#    - Configurar rollout (ej: 10% → 100%)
#    - Revisar y publicar

# 6. Google revisa (~1-3 horas)
#    Si aprueba → ¡En vivo en Play Store!
```

**Checklist**
- [ ] Keystore generado y guardado
- [ ] Version bumped
- [ ] Screenshots en Español + Inglés
- [ ] Descripción optimizada
- [ ] Privacy policy en lugar
- [ ] Rollout strategy decidida

---

## 📊 POST-LAUNCH MONITORING

Una vez que la app esté en vivo:

### Daily Tasks
```
□ Revisar Firebase logs por errores
□ Monitorear crash reports
□ Responder user feedback
□ Verificar performance metrics
```

### Weekly Tasks
```
□ Revisar analytics (usuarios, features usadas)
□ Check Firestore usage
□ Revisar comentarios en stores
□ Planificar bugfixes/features
```

### Key Metrics
```
Tracking:
- DAU (Daily Active Users)
- Retention rate
- Crash rate
- Push notification delivery rate
- Feature usage (most used screens)
```

---

## 🐛 DEBUGGING TIPS

Si algo no funciona:

### Push Notifications No Llegan
```
1. Verificar en Firestore:
   /user_push_tokens → ¿Existe token?
   /push_notifications_queue → ¿Documentos?

2. Revisar Cloud Functions en Firebase Console
   - ¿processPushNotificationQueue está ejecutándose?
   - ¿Hay errores?

3. Verificar FCM credentials
   firebase console → Settings → Service Account
   ¿Puede acceder a Firebase?

4. Test manual:
   curl -X POST https://us-central1-[PROJECT].cloudfunctions.net/testPushNotification \
     -H "Content-Type: application/json" \
     -d '{"userId":"[UID]","title":"Test","body":"Test message"}'
```

### PDF No Se Genera
```
1. Verificar permisos: app.json tiene "expo-file-system"?
2. Verificar imágenes: ¿URLs son válidas?
3. Revisar console por errores
4. Probar en device físico (emulator puede tener issues)
```

### Analytics No Actualiza
```
1. Verificar queries: ¿getOverallTaskMetrics() trae datos?
2. Firestore rules: ¿Usuario puede leer /Tasks?
3. Real-time: ¿subscriptionListener activo?
4. Si no: hacer pull-to-refresh en pantalla
```

---

## 📋 DEPLOYMENT CHECKLIST FINAL

```
PRE-DEPLOY (Antes de build)
☐ Código: npm start sin errores
☐ Firestore: Cloud Functions deployadas
☐ Firebase: FCM configured
☐ Versión: Bumped en app.json
☐ Privacy Policy: URL actualizada
☐ Screenshots: Listos en español/inglés

APP STORE (iOS)
☐ Build creado con eas
☐ Testflight distribuido internamente
☐ Testing manual completado
☐ Store listing completo
☐ Submitido para review
☐ ⏳ Esperando aprobación (2-3 días)

PLAY STORE (Android)
☐ Build creado con eas
☐ Testing en device real completado
☐ Store listing completo
☐ Submitido para review
☐ ⏳ Esperando aprobación (1-3 horas)

LIVE
☐ Ambas stores show app
☐ "Descargar" button funciona
☐ Push notifications llegan
☐ Usuarios pueden registrarse
☐ Features principales funciones
```

---

## ⏰ LÍNEA DE TIEMPO ESTIMADA

| Fase | Tiempo | Status |
|------|--------|--------|
| Deploy Cloud Functions | 15 min | Antes de build |
| Configurar FCM (iOS+Android) | 45 min | Antes de build |
| Testing en devices | 1-2 horas | Antes de build |
| Build iOS/Android | 30 min | Paralelo |
| App Store submission | 2-3 días | Paralelo |
| Play Store submission | 1-3 horas | Paralelo |
| **TOTAL** | **~1 semana** | **Listo** |

---

## 🎯 SUCCESS METRICS

La app está lista cuando:

✅ Cero crashes en testing  
✅ Push notifications 100% delivery  
✅ PDF export funciona en device  
✅ Analytics muestra datos reales  
✅ Offline mode funciona  
✅ Performance: <2s load times  
✅ App Store & Play Store: aprobadas  

---

**¡TE LO HE DEJADO TODO LISTO PARA LANZAR! 🚀**

Sigue este checklist y en ~1 semana tu app estará en vivo.

&nbsp;

---

**Última actualización:** 16 Feb 2026  
**Versión:** 1.0.0 Production Ready  
**Autor:** Hazel Jared Almaraz
