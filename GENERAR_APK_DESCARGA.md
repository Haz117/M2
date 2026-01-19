# 📲 GENERAR APK PARA DESCARGA

## PASO 1: Generar el APK

```bash
# Login en Expo
eas login

# Generar APK (tarda 10-15 minutos)
eas build -p android --profile preview
```

Espera a que termine y te dará un link como:
`https://expo.dev/accounts/tu-usuario/projects/todo-app/builds/xxxx-xxx-xxx`

## PASO 2: Actualizar el link de descarga

### Opción A: Link directo de Expo
1. Copia el link del APK que te da EAS
2. Edita `public/index.html`
3. Busca la línea 296:
```javascript
document.getElementById('downloadApk').addEventListener('click', function(e) {
```
4. Reemplaza todo el código por:
```javascript
document.getElementById('downloadApk').href = 'TU_LINK_DE_EXPO_AQUI';
```

### Opción B: Subir APK a Google Drive
1. Descarga el APK del link de Expo
2. Súbelo a Google Drive
3. Click derecho → Compartir → "Cualquiera con el enlace"
4. Copia el link
5. Actualiza `public/index.html` con el link de Drive

### Opción C: Subir APK a GitHub Releases
1. Descarga el APK
2. Ve a tu repositorio en GitHub
3. Releases → Create a new release
4. Arrastra el APK
5. Publica el release
6. Copia el link del APK
7. Actualiza `public/index.html`

## PASO 3: Desplegar la página de descarga

### Con Vercel:
```bash
# La página HTML ya está en public/index.html
vercel --prod
```

### Con GitHub Pages:
1. Sube todo a GitHub
2. Settings → Pages
3. Source: main branch / public folder
4. Tu página estará en: `https://tu-usuario.github.io/todo-app`

## PASO 4: Compartir

Comparte el link:
- **Página de descarga:** `https://tu-proyecto.vercel.app`
- **APK directo:** El link que configuraste en el PASO 2

---

## 🔄 ACTUALIZAR APK (Nuevas versiones)

1. Incrementa version en `app.config.js`:
```javascript
version: '1.0.1',  // Cambia de 1.0.0 a 1.0.1
```

2. Genera nuevo APK:
```bash
eas build -p android --profile preview
```

3. Actualiza el link en `public/index.html`

---

## ✅ CHECKLIST

- [ ] APK generado con `eas build`
- [ ] Link del APK obtenido
- [ ] `public/index.html` actualizado con el link correcto
- [ ] Página desplegada en Vercel/GitHub Pages
- [ ] Link probado en celular
- [ ] APK se instala correctamente
- [ ] App funciona sin errores

---

## 🚨 IMPORTANTE

**NO OLVIDES:**
1. Actualizar el link en `public/index.html` línea 296
2. Actualizar la URL de Vercel en la línea 207 del mismo archivo
3. Cambiar `https://tu-proyecto.vercel.app` por tu URL real

**LINKS ACTUALES EN EL CÓDIGO:**
- Línea 207: `<a href="https://tu-proyecto.vercel.app" ...>`  
- Línea 296: `alert('Para generar el APK...')`

Reemplaza ambos con tus links reales.
