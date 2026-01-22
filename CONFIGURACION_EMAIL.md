# 📧 Configuración de Notificaciones por Email

## ¿Por qué Email en lugar de Push?
Safari en iOS no soporta notificaciones push web (Web Push API), por lo que usar email es la solución más confiable para notificar a usuarios en dispositivos iOS.

## 📋 Funcionalidades Implementadas

El sistema envía emails automáticamente en estos casos:

### 1. **Nueva Tarea Asignada** 🆕
- Cuando un admin/jefe asigna una tarea a un usuario
- Email con detalles de la tarea: título, descripción, prioridad, fecha límite
- Botón para ver la tarea directamente

### 2. **Tarea por Vencer** ⏰
- Se envía 24 horas antes de que venza una tarea
- Calcula el tiempo restante exacto
- Destaca la urgencia con iconos y colores

### 3. **Nuevo Mensaje en Chat** 💬
- Cuando alguien escribe en el chat de una tarea asignada a ti
- Muestra quién escribió y el contenido del mensaje
- Link directo al chat de la tarea

### 4. **Resumen Diario** 📊
- Se envía cada día a las 8 AM
- Resume tareas vencidas, del día, y próximas
- Muestra estadísticas de tareas completadas

---

## 🔧 Pasos de Configuración

### 1. Crear Cuenta en SendGrid

1. Ve a [https://sendgrid.com/](https://sendgrid.com/)
2. Haz clic en **"Start for Free"**
3. Completa el registro:
   - Email
   - Password
   - Nombre completo

**Plan gratuito**: 100 emails por día (suficiente para uso personal)

### 2. Verificar tu Email

1. Una vez dentro, ve a **Settings** → **Sender Authentication**
2. Haz clic en **"Verify a Single Sender"**
3. Completa el formulario:
   - **From Email**: El email desde el que se enviarán las notificaciones (ej: `notificaciones@tudominio.com` o tu email personal)
   - **From Name**: "Sistema de Tareas" o el nombre que quieras
   - **Reply To**: Tu email personal
   - **Company Address**: Puedes poner tu dirección

4. **Importante**: Revisa tu email y haz clic en el link de verificación
5. Una vez verificado, verás un ✅ verde en el dashboard

### 3. Crear API Key

1. Ve a **Settings** → **API Keys**
2. Haz clic en **"Create API Key"**
3. Configuración:
   - **API Key Name**: "Sistema Tareas TODO App"
   - **API Key Permissions**: Selecciona **"Full Access"** (o al menos "Mail Send" si quieres restringir)
4. Haz clic en **"Create & View"**
5. **¡MUY IMPORTANTE!** Copia la API Key que aparece (solo se muestra una vez)
   - Ejemplo: `SG.xxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### 4. Configurar en la App

Abre el archivo `services/emailNotifications.js` y reemplaza estas líneas:

```javascript
// ⚠️ CONFIGURACIÓN REQUERIDA
const SENDGRID_API_KEY = 'TU_API_KEY_DE_SENDGRID_AQUI'; // 👈 Pega tu API Key
const FROM_EMAIL = 'notificaciones@tudominio.com'; // 👈 Debe ser el email verificado en SendGrid
const FROM_NAME = 'Sistema de Tareas';
```

**Ejemplo configurado:**
```javascript
const SENDGRID_API_KEY = 'SG.abc123xyz789.def456uvw012'; 
const FROM_EMAIL = 'mi.email@gmail.com'; // Email que verificaste en SendGrid
const FROM_NAME = 'Mi App de Tareas';
```

---

## ✅ Verificar que Funciona

### Test Manual

#### Probar notificación de nueva tarea:
```javascript
// Desde la consola del navegador o un archivo de test:
import { notifyTaskAssigned } from './services/emailNotifications';

const testTask = {
  title: 'Tarea de prueba',
  description: 'Esta es una prueba del sistema de emails',
  priority: 'alta',
  dueAt: Date.now() + 86400000, // Mañana
  assignedTo: 'tu.email@gmail.com' // TU EMAIL REAL
};

notifyTaskAssigned(testTask);
```

Si todo está bien configurado, deberías recibir un email en 1-2 minutos.

#### Probar desde la app:
1. **Crear una tarea nueva** y asignarla a ti mismo
   - ✅ Deberías recibir email "Nueva tarea asignada"

2. **Enviar un mensaje en el chat** de una tarea
   - ✅ El asignado recibe email "Nuevo mensaje"

3. **Crear una tarea con fecha límite en 12 horas**
   - ✅ En 12 horas recibirás email "Tarea por vencer"

---

## 🤖 Automatizar Resumen Diario

Para que el resumen diario funcione automáticamente cada día, tienes 3 opciones:

### Opción 1: Ejecutar Manualmente (más simple)
Abre la app cada mañana y ejecuta:
```javascript
import { runDailyTasks } from './services/dailyNotifications';
runDailyTasks('tu.email@gmail.com');
```

### Opción 2: Firebase Cloud Functions (recomendado para producción)
1. Instala Firebase Functions:
```bash
npm install -g firebase-tools
firebase init functions
```

2. Crea un archivo `functions/index.js`:
```javascript
const functions = require('firebase-functions');
const { runDailyTasks } = require('./dailyNotifications');

// Se ejecuta todos los días a las 8 AM (hora del servidor)
exports.dailyNotifications = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    // Obtener lista de usuarios de Firestore
    const users = await getUserEmails(); // Implementar esta función
    
    for (const userEmail of users) {
      await runDailyTasks(userEmail);
    }
    
    return null;
  });
```

3. Despliega:
```bash
firebase deploy --only functions
```

### Opción 3: Cron Job en un servidor
Si tienes un servidor propio, crea un cron job que llame a tu función cada día:
```bash
0 8 * * * node /ruta/a/tu/script/runDaily.js
```

---

## 📊 Monitoreo

### Ver emails enviados
1. En SendGrid, ve a **Activity**
2. Podrás ver:
   - ✅ Emails entregados
   - 📬 Emails abiertos
   - ⚠️ Emails rebotados (bounced)
   - ❌ Emails marcados como spam

### Límites del Plan Gratuito
- **100 emails por día**
- Si necesitas más, considera:
  - Plan "Essentials": $19.95/mes = 50,000 emails/mes
  - Usar otro servicio como Mailgun o AWS SES

---

## ⚠️ Solución de Problemas

### "El email no llega"
1. **Verifica la bandeja de SPAM** - los primeros emails pueden caer ahí
2. Revisa que el `FROM_EMAIL` esté verificado en SendGrid
3. Comprueba que la API Key sea correcta
4. Mira los logs de SendGrid en la sección **Activity**

### "Error 401 o 403"
- La API Key no es válida o no tiene permisos
- Crea una nueva API Key con permisos "Mail Send"

### "El email se marca como spam"
- Agrega un enlace de "unsubscribe" (opcional pero ayuda)
- Verifica tu dominio completo en SendGrid (no solo el sender)
- Evita palabras spam como "GRATIS", "URGENTE" en mayúsculas

### "Límite de 100 emails alcanzado"
- El plan gratuito resetea cada 24 horas
- Considera upgrade o usa otro servicio para ciertos emails

---

## 📈 Próximos Pasos Opcionales

- [ ] Agregar templates personalizados con logo de tu empresa
- [ ] Implementar preferencias de notificación (permitir al usuario desactivar ciertos emails)
- [ ] Agregar botones de "Marcar como completada" directamente desde el email
- [ ] Crear sistema de digest (agrupar múltiples notificaciones en un solo email)
- [ ] Agregar analytics para ver qué emails se abren más

---

## 🎨 Personalizar Templates

Los templates HTML están en `services/emailNotifications.js` en la función `getEmailTemplate()`. Puedes personalizar:

- **Colores**: Cambia `#667eea` y `#764ba2` por tus colores de marca
- **Logo**: Agrega tu logo reemplazando el emoji 📋
- **Footer**: Modifica el mensaje del footer
- **Estilos**: Ajusta fonts, tamaños, espaciados

**Ejemplo de personalización:**
```javascript
<div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);"> // Azul
<div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);"> // Verde
<div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);"> // Rojo
```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del navegador
2. Verifica la configuración en SendGrid
3. Consulta la documentación de SendGrid: https://docs.sendgrid.com/

---

**¡Listo!** 🎉 Tu sistema de notificaciones por email está configurado y funcionando.
