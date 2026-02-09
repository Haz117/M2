# 📱 GUÍA DE DISEÑO RESPONSIVO - M2 TODO APP

## ✅ Cambios Realizados

### 1. **Sistema de Responsive Design Mejorado**
- ✨ Nuevo hook `useResponsive()` con información completa sobre el dispositivo
- 📐 Padding y espaciado automático según pantalla
- 🎯 Detección de plataforma (web, iOS, Android)

#### Información disponible en `useResponsive()`:
```javascript
const { 
  width,           // Ancho de pantalla
  height,          // Alto de pantalla
  isWeb,           // true si es web
  isMobile,        // true si <768px
  isTablet,        // true si 768px-1024px
  isDesktop,       // true si >=1024px
  isDesktopLarge,  // true si >=1440px
  paddingObj,      // {horizontal, vertical} responsivo
  maxWidth,        // Ancho máximo para el contenedor
  columns,         // Número de columnas para grid
} = useResponsive();
```

### 2. **Tokens de Diseño Actualizados**
- `BREAKPOINTS`: Puntos de quiebre estándar
- `RESPONSIVE_PADDING`: Padding optimizado por dispositivo
- `MAX_WIDTHS`: Ancho máximo para contenedores en web (1120px)

```javascript
// Breakdown de pantallas:
- Mobile:         0 - 767px
- Tablet:      768px - 1023px
- Desktop:    1024px - 1439px
- Desktop Large: >=1440px
```

### 3. **Componentes Nuevos**

#### ResponsiveContainer.js
Centraliza automáticamente el contenido en web.
```javascript
<ResponsiveContainer>
  {/* Tu contenido se centrará automáticamente */}
</ResponsiveContainer>
```

#### SafeAreaView.js
Protege el contenido de notches en iOS.
```javascript
<SafeAreaWrapper edges={['top', 'bottom']}>
  {/* Contenido protegido */}
</SafeAreaWrapper>
```

### 4. **Dashboard Optimizado para Web/iOS/Android**

#### Cambios en DashboardScreen:
✅ **Web**: Contenido centrado en pantalla grande (1120px max)
✅ **iOS**: SafeArea protegida, padding interior adecuado
✅ **Android**: Responsive a 768px y superiores

#### Padding especifico por dispositivo:
- **Mobile (≤767px)**: 16px horizontal
- **Tablet (768-1023px)**: 24px horizontal
- **Desktop (1024-1439px)**: 32px horizontal
- **Desktop Large (≥1440px)**: 48px horizontal

#### Tipografía responsiva:
- Títulos más grandes en desktop
- Espaciado incrementado en pantallas grandes
- Gaps y márgenes escalados automáticamente

---

## 🎨 Paleta de Tamaños Touch Target (WCAG AA)

Para asegurar accesibilidad:
- **Mínimo**: 44px (pequeños)
- **Recomendado**: 48px (botones, tabs)
- **Grande**: 56px (acciones principales)

---

## 📋 Checklist de Implementación

### ✅ Completado:
- [x] Sistema de tokens responsive mejorado
- [x] Hook `useResponsive` actualizado
- [x] DashboardScreen optimizado para 3 plataformas
- [x] Componente ResponsiveContainer creado
- [x] Componente SafeAreaView creado
- [x] Utilidades responsive en `responsiveHelpers.js`
- [x] Padding y gap escalables en todos los componentes

### 📋 Pendiente (opcional):
- [ ] Aplicar ResponsiveContainer a todas las pantallas
- [ ] Auditar touch targets en botones
- [ ] Testing en dispositivos reales (iOS/Android)
- [ ] Testing en diferentes resoluciones web

---

## 🔧 Cómo Usar en tus Pantallas

### Opción 1: Con ResponsiveContainer (Recomendado)
```javascript
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useResponsive } from '../utils/responsive';

export default function MyScreen() {
  const { isDesktop, paddingObj } = useResponsive();

  return (
    <ResponsiveContainer>
      {/* Tu contenido */}
    </ResponsiveContainer>
  );
}
```

### Opción 2: Manualmente (como DashboardScreen)
```javascript
const { isDesctop, paddingObj, width } = useResponsive();
const contentMaxWidth = isDesktop ? 1120 : width;
const responsivePadding = isDesktopLarge ? 48 : isDesktop ? 32 : 24;

<View style={{ maxWidth: contentMaxWidth, alignSelf: 'center' }}>
  {/* Tu contenido */}
</View>
```

---

## 🧪 Pruebas Recomendadas

### En Web:
1. Redimensiona el navegador a diferentes anchos:
   - 375px (móvil)
   - 768px (tablet)
   - 1024px (desktop)
   - 1440px+ (desktop grande)
2. Verifica que el contenido se centra en >1024px
3. Revisa el padding se incrementa adecuadamente

### En iOS:
1. Prueba en iPhone SE (375px) y iPhone 14+ (430px)
2. Prueba en iPad (768px)
3. Verifica SafeArea protege notch

### En Android:
1. Prueba en dispositivos de 6", 7" y 10"
2. Verifica que el layout es consistente
3. Revisa elemento de notch (si aplica)

---

## 📚 Recursos Utilizados

### Breakpoints estándar:
- **Mobile**: 0-767px (phones)
- **Tablet**: 768-1023px (iPad, tablets 8-10")
- **Desktop**: 1024-1439px (iPad Pro, monitores)
- **Desktop Large**: ≥1440px (monitores grandes)

### Espaciado (SPACING):
```
xs:   4px
sm:   8px
md:   12px
lg:   16px (default)
xl:   24px
xxl:  32px
xxxl: 48px
```

### Tipografía (TYPOGRAPHY):
- **H1**: 28-40px (según dispositivo)
- **H2**: 22-32px
- **Body**: 14-16px
- **Caption**: 11-14px

---

## ⚠️ Notas Importantes

1. **SafeArea en iOS**: Usa `SafeAreaView` para proteger contenido de notches
2. **Max Width en Web**: El contenido de dashboard se centra a 1120px máximo en desktop
3. **Padding Dinámico**: Todos los componentes ajustan padding automáticamente
4. **Responsive Images**: Usa ancho % en imágenes para web
5. **Testing**: Prueba siempre en múltiples dispositivos antes de producción

---

## 🚀 Próximos Pasos

1. Aplicar los mismos patrones a `HomeScreen` y otras pantallas
2. Auditar todos los botones para touch targets (48px mínimo)
3. Hacer testing de UX en dispositivos reales
4. Optimizar gráficas (LineChart, PieChart) para web
5. Considerar orientación landscape en tablets

---

**Última actualización**: Febrero 2026
**Versión**: 1.0
