// theme/tokens.js
// Sistema de Design Tokens para consistencia visual

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const BREAKPOINTS = {
  mobile: 0,
  mobileLarge: 375,
  tablet: 768,
  desktop: 1024,
  desktopLarge: 1440,
};

export const TOUCH_TARGET = {
  min: 44, // Mínimo recomendado iOS/Android
  comfortable: 48,
  large: 56,
};

// Ancho máximo para contenedores
export const MAX_WIDTHS = {
  content: 1280,    // Ancho máximo para contenido principal
  contentPadded: 1120, // Con padding incluido
  narrow: 800,      // Para forms y contenido estrecho
  card: 600,        // Para cards individuales
  modal: 500,
};

// Padding responsivo por pantalla
export const RESPONSIVE_PADDING = {
  mobile: { horizontal: 12, vertical: 16 },
  tablet: { horizontal: 20, vertical: 24 },
  desktop: { horizontal: 32, vertical: 32 },
  desktopLarge: { horizontal: 48, vertical: 40 },
};

// Helper para obtener responsive values
export const getResponsiveValue = (screenWidth, values) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return values.desktopLarge || values.desktop;
  if (screenWidth >= BREAKPOINTS.desktop) return values.desktop;
  if (screenWidth >= BREAKPOINTS.tablet) return values.tablet;
  if (screenWidth >= BREAKPOINTS.mobileLarge) return values.mobileLarge || values.mobile;
  return values.mobile;
};

// Helper para columns en grid
export const getColumnCount = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return 4;
  if (screenWidth >= BREAKPOINTS.desktop) return 3;
  if (screenWidth >= BREAKPOINTS.tablet) return 2;
  return 1;
};

// Helper para padding responsive basado en ancho
export const getResponsivePadding = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return RESPONSIVE_PADDING.desktopLarge.horizontal;
  if (screenWidth >= BREAKPOINTS.desktop) return RESPONSIVE_PADDING.desktop.horizontal;
  if (screenWidth >= BREAKPOINTS.tablet) return RESPONSIVE_PADDING.tablet.horizontal;
  return RESPONSIVE_PADDING.mobile.horizontal;
};

// Helper para obtener ancho máximo del contenedor
export const getMaxWidth = (screenWidth) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) return MAX_WIDTHS.contentPadded;
  return screenWidth;
};
