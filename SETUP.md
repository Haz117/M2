# 🎯 SETUP GUIDE - M3 Task Management

Guía rápida para empezar a desarrollar en M3.

## ⚡ Quick Start (5 minutos)

### 1. Clonar y Instalar
```bash
git clone https://github.com/tu-repo/m3.git
cd m3
npm install --legacy-peer-deps
```

### 2. Variables de Entorno
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales Firebase
```

### 3. Ejecutar
```bash
npm start -- --port 8082
# Presionar 'w' para web, 'a' para Android, 'i' para iOS
```

## 📖 Documentación

| Archivo | Propósito |
|---------|-----------|
| **README.md** | Guía general del proyecto |
| **ARCHITECTURE.md** | Estructura y patrones |
| **CHANGELOG.md** | Cambios y versiones |
| **docs/INDEX.md** | Índice de servicios/componentes |

## 🗂️ Estructura Clave

```
src (conceptualmente):
├── components/   → UI reutilizable
├── screens/      → Pantallas principales
├── services/     → Lógica de negocio
├── utils/        → Helpers (dateUtils.js ⭐)
├── theme/        → Diseño (tokens, colores)
├── contexts/     → Estado global
└── config/       → Configuración
```

## 🚀 Tareas Comunes

### Agregar una nueva pantalla
1. Crear `screens/NuevaScreen.js`
2. Importar en `App.js`
3. Agregar a navegación
4. Actualizar `docs/INDEX.md`

### Crear nuevo servicio
1. Crear en `services/miServicio.js`
2. Exportar funciones principales
3. Documentar en `docs/INDEX.md`
4. Usar en componentes vía import

### Usar timestamps correctamente
```javascript
import { toMs, isOverdue, diffDays } from '../utils/dateUtils';

// Always use these helpers!
if (isOverdue(task)) { ... }
const days = diffDays(task.dueAt, new Date());
```

### Manejar estado global
```javascript
import { useTasks } from '../contexts/TasksContext';

const MyComponent = () => {
  const { tasks, updateTask } = useTasks();
  // ...
};
```

## 🐛 Debug Tips

### Logs en Consola
```javascript
// Web: Abre DevTools (F12)
// Mobile: Usa Expo DevTools (shift+m en terminal)

import { logger } from '../utils/logger';
logger.info('Debug message');
```

### Errores Comunes

| Error | Solución |
|-------|----------|
| "Cannot find module" | `npm install` y restart |
| "Port 8082 in use" | Cambiar puerto o matar proceso |
| Timestamp NaN | Usar `dateUtils.toMs()` |
| Estado inconsistente | Revisar ARCHITECTURE.md |

## 🎨 Diseño y Temas

```javascript
import { SPACING, TYPOGRAPHY, SHADOWS } from '../theme/tokens';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,      // 16px
    ...SHADOWS.md,
    fontSize: TYPOGRAPHY.body.fontSize,
  },
});
```

## 📱 Testing Multi-plataforma

```bash
# Web
npm start
# Presionar 'w'

# iOS (macOS requerido)
npm run ios

# Android (emulador o dispositivo)
npm run android

# Dispositivo físico
# Escanear QR con Expo Go app
```

## 🔐 Seguridad

- **NUNCA** commitear `.env.local`
- Credenciales solo en variables de entorno
- Validar permisos en frontend + backend
- Usar reglas de Firestore

## 📊 Recursos Útiles

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Hooks](https://react.dev/reference/react)

## 🤝 Workflow Git

```bash
# Feature branch
git checkout -b feature/nombre-feature

# Commits
git commit -m "feat: descripción"
git commit -m "fix: descripción"
git commit -m "docs: descripción"

# Push y PR
git push origin feature/nombre-feature
# Crear Pull Request en GitHub
```

## ✅ Pre-commit Checklist

- [ ] Sin console.log en producción
- [ ] Timestamps usan `dateUtils`
- [ ] Estados validados correctamente
- [ ] Componentes responsivos (mobile + web)
- [ ] Manejo de errores con Toast
- [ ] Tests si es ruta crítica
- [ ] Documentación actualizada

## 🆘 Ayuda Rápida

```
Pregunta frecuente → Búsqueda
Cómo agregar tarea → ARCHITECTURE.md
Funciones de timestamp → docs/INDEX.md
Componentes disponibles → docs/INDEX.md
Todos los servicios → docs/INDEX.md
```

## 📞 Contacto

- **Issues GitHub**: Para bugs y features
- **Discussions**: Para preguntas generales
- **Email**: hazel@example.com (reemplazar)

---

**¡Listo para empezar?** Abre `ARCHITECTURE.md` para entender mejor la estructura.

**Última actualización**: Marzo 2026
