# 📱 CONFIGURAR LANDING PAGE CON DESCARGA

## ✅ **LANDING PAGE AGREGADA**

Ahora cuando entres a la app verás primero una pantalla de bienvenida con:
- ✨ Logo y diseño en color MORENA
- 📋 Características principales
- 🌐 Botón "Usar App Web" → Va al Login
- 📲 Botón "Descargar APK" → Descarga la app (solo Android)

---

## 🔧 **CONFIGURAR LINK DE DESCARGA**

### PASO 1: Generar APK
```bash
eas build -p android --profile preview
```

### PASO 2: Actualizar el link

Edita: `screens/LandingScreen.js` línea 19:

```javascript
// ANTES:
const apkUrl = 'https://expo.dev/artifacts/eas/ACTUALIZAR-CON-TU-LINK.apk';

// DESPUÉS (con tu link real):
const apkUrl = 'https://expo.dev/artifacts/eas/tu-link-real-aqui.apk';
```

### Opciones de links:

**Opción A: Link directo de Expo**
```javascript
const apkUrl = 'https://expo.dev/accounts/tu-usuario/projects/todo-app/builds/xxxx';
```

**Opción B: Google Drive**
1. Sube el APK a Drive
2. Click derecho → Compartir → Cualquiera con el enlace
3. Usa el link compartido:
```javascript
const apkUrl = 'https://drive.google.com/uc?export=download&id=TU_FILE_ID';
```

**Opción C: GitHub Releases**
1. Sube APK a GitHub Releases
2. Copia el link del asset:
```javascript
const apkUrl = 'https://github.com/tu-usuario/todo-app/releases/download/v1.0.0/app.apk';
```

---

## 📋 **FLUJO DE USUARIO**

1. Usuario entra a la app
2. Ve la **Landing Page** con:
   - Logo de TodoApp
   - Características destacadas
   - 2 botones principales
3. Opciones:
   - **"Usar App Web"** → Va directamente al Login y empieza a usar
   - **"Descargar APK"** → Descarga el APK para instalar en Android

---

## 🎨 **PERSONALIZAR LANDING**

### Cambiar características mostradas:
Edita `screens/LandingScreen.js` líneas 48-63:

```javascript
<View style={styles.featureItem}>
  <Ionicons name="TU-ICONO" size={24} color="#FFF" />
  <Text style={styles.featureText}>Tu característica aquí</Text>
</View>
```

### Íconos disponibles:
- `people` - Usuarios/Roles
- `sync` - Sincronización
- `analytics` - Reportes
- `chatbubbles` - Chat
- `calendar` - Calendario
- `shield-checkmark` - Seguridad
- `notifications` - Notificaciones

Ver más en: https://ionic.io/ionicons

---

## 🚀 **DESPLEGAR**

Después de configurar el link del APK:

```bash
# Build para web
npm run build:web

# Deploy a Vercel
vercel --prod
```

La landing estará en: `https://tu-proyecto.vercel.app`

---

## 🔄 **VOLVER A LOGIN DIRECTO (OPCIONAL)**

Si prefieres NO mostrar la landing y ir directo al login:

En `App.js` línea 224, cambia:
```javascript
// CON LANDING:
<Stack.Screen 
  name="Landing"
  component={LandingScreen}
  options={{ animation: 'fade' }}
/>

// SIN LANDING (directo a login):
<Stack.Screen 
  name="Login"
  options={{ animation: 'fade' }}
>
  {(props) => <LoginScreen {...props} onLogin={() => setIsAuthenticated(true)} />}
</Stack.Screen>
```

---

## ✅ **CHECKLIST**

- [x] LandingScreen creado
- [x] Agregado a App.js como pantalla inicial
- [ ] Link de APK actualizado en línea 19
- [ ] Probado en navegador
- [ ] Botón "Usar App Web" funciona
- [ ] Botón "Descargar APK" funciona (solo Android)
- [ ] Desplegado en Vercel

---

**¡Listo!** Ahora tu app web tiene una landing page profesional con opción de descarga. 🎉
