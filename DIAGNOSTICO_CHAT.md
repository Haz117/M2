# Diagnóstico del Chat - Problemas de Envío de Mensajes

## Cambios Recientes Implementados

Se han agregado logs detallados para diagnosticar problemas de chat en `TaskChatScreen.js`. Los logs te helparán a identificar exactamente dónde está el problema.

## Cómo Diagnosticar el Problema

### 1. **Abre la Consola de Desarrollo**

#### En Expo:
- **Android**: 
  - Abre la terminal donde está corriendo `expo start`
  - Presiona `a` para abrir en Android emulator
  - Los logs aparecerán en la terminal

- **iOS**:
  - Abre Xcode (Settings > Simulator > Toggle Device)
  - En Xcode: Debug > Logs > Console

#### En Desarrollo Local:
- Presiona `Ctrl+Shift+J` (Windows) o `Cmd+Option+J` (Mac) para abrir DevTools

### 2. **Pasos para Probar el Chat**

Sigue estos pasos y observa los logs en la consola:

```
1. Abre la app y navega a una tarea asignada
2. En la pantalla de detalle de tarea (operativo), presiona "💬 Ir al Chat"
3. Observa la consola para el log: [TaskChat] Session result: ...
4. Si ves "Access granted - operativo assigned to task" → ✅ El acceso está bien
5. Si ves "Access denied - no matching criteria" → ❌ Problema de acceso
6. Ahora intenta escribir un mensaje en el input
7. El botón de envío debe cambiar de rojo a marrón claro (deshabilitado)
8. Cuando escribes texto, debería cambiar a rojo (habilitado)
9. Presiona el botón de envío
10. Observa la consola para el log: [TaskChat] Attempting to send message: ...
```

### 3. **Logs Esperados y Qué Significan**

#### ✅ **Conectando correctamente:**
```
[TaskChat] Session result: { success: true, session: {...} }
[TaskChat] Current user: ejemplo@email.com userId: ...
[TaskChat] Task loaded, assignedTo: ['email1@...','email2@...']
[TaskChat] Checking access - role: operativo email: ... dept: ...
[TaskChat] Access granted - operativo assigned to task
[TaskChat] Setting up message listener for taskId: ...
[TaskChat] Messages updated: 5 messages
```

#### ⚠️ **Problema de acceso:**
```
[TaskChat] Session failed: { success: false, error: 'Usuario no autenticado' }
```
→ **Solución**: Vuelve a iniciar sesión

#### ⚠️ **Problema al cargar la tarea:**
```
[TaskChat] Error loading task: Error: Permission denied
```
→ **Solución**: Verifica Firestore Rules en `firestore.rules`

#### ⚠️ **Problema al escuchar mensajes:**
```
[TaskChat] Error listening to messages: Error: collection 'tasks' not found
```
→ **Solución**: Verifica que exista la subcollección `messages` en `tasks/{taskId}/`

#### ⚠️ **Problema al enviar:**
```
[TaskChat] Send blocked - text.trim(): false, hasAccess: false
```
→ **Significado**: O el texto está vacío o no tiene acceso
→ **Solución**: Asegúrate de escribir algo en el input

```
[TaskChat] Attempting to send message: "Hola"
[TaskChat] Error sending message: Error: Failed to add document to collection messages
```
→ **Significado**: Error de Firestore al guardar
→ **Solución**: Verifica permisos en Firestore Rules

### 4. **Cambios Visuales que Verás**

- **Botón de envío deshabilitado** (marrón claro): Sin texto escrito
- **Botón de envío habilitado** (rojo): Con texto escrito
- **Respuesta al presionar**: El botón se vuelve ligeramente transparente (feedback)

### 5. **Si el Problema Persiste**

Proporciona esta información al equipo técnico:

1. **Logs completos** de la consola desde el inicio
2. **Rol del usuario** (¿Es operativo, jefe, admin?)
3. **Correo del usuario**
4. **ID de la tarea** a la que intenta acceder
5. **¿Puedes ver el chat pero no enviar?** O **¿No puedes ver el chat en absoluto?**
6. **Imagen de pantalla** mostrando el error o comportamiento

### 6. **Información Técnica**

**Donde se guardan los mensajes:**
```
Firestore: /tasks/{taskId}/messages/{messageId}
```

**Campos que se envían:**
```javascript
{
  type: "text",           // "text" o "image"
  text: "mensaje aquí",   // solo para tipo text
  author: "Tu nombre",
  createdAt: timestamp
}
```

**Permisos requeridos:**
```firestore
match /tasks/{taskId}/messages/{messageId} {
  allow read, write: if true;  // En desarrollo (muy permisivo)
}
```

### 7. **Verificación Rápida**

Ejecuta esto en la consola del navegador:
```javascript
// Verificar si Firebase está cargado
console.log('db', typeof db !== 'undefined' ? 'OK' : 'ERROR');

// Verificar parámetros
const params = route.params;
console.log('taskId:', params.taskId, 'taskTitle:', params.taskTitle);
```

---

## Updates Realizados en TaskChatScreen.js

1. ✅ Agregados logs detallados en `loadCurrentUserAndCheckAccess()`
2. ✅ Agregados logs en el useEffect que carga mensajes
3. ✅ Agregados logs en la función `send()` con detalles de error
4. ✅ Agregados logs en la función `handleImageCapture()`
5. ✅ Botón de envío ahora se disabledcuando no hay texto (feedback visual)
6. ✅ Estilos agregados para botón deshabilitado
7. ✅ Manejo defensivo de valores undefined en renderItem

## Siguientes Pasos

Una vez que identifiques el log específico del error:

1. Ejecuta `expo start` en la terminal
2. Abre la app en emulador/dispositivo
3. Navega al chat
4. Mira los logs en la terminal de Expo
5. **Comparte todos los logs** (cópialo y pégalo completamente)
6. **Incluye qué rol tienes** (admin, jefe, operativo)

Con esa información, podremos identificar exactamente dónde está el cuello de botella. 🔍
