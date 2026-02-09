// utils/responsiveHelpers.js
// Utilidades para crear estilos responsivos de manera más sencilla
import { Platform } from 'react-native';

/**
 * Crea un objeto de estilos responsivo para usar con useResponsive
 * @param {Object} breakpoints - {mobile, tablet, desktop}
 * @returns {Function} - Función que toma el ancho y devuelve el estilo
 */
export const createResponsiveStyle = (breakpoints) => (width) => {
  if (width >= 1440) return breakpoints.desktopLarge || breakpoints.desktop;
  if (width >= 1024) return breakpoints.desktop;
  if (width >= 768) return breakpoints.tablet;
  return breakpoints.mobile;
};

/**
 * Normaliza tamaños de fuente según plataforma
 * @param {Object} sizes - {mobile, tablet, desktop}
 * @returns {Function} - Función que toma el ancho y devuelve el tamaño
 */
export const responsiveFontSize = (sizes) => (width) => {
  if (width >= 1440) return sizes.desktopLarge || sizes.desktop;
  if (width >= 1024) return sizes.desktop;
  if (width >= 768) return sizes.tablet;
  return sizes.mobile;
};

/**
 * Obtiene padding responsivo
 * @param {Object} values - {mobile, tablet, desktop}
 * @returns {Function}
 */
export const responsivePadding = (values) => (width) => {
  if (width >= 1024) return values.desktop || values.tablet || values.mobile;
  if (width >= 768) return values.tablet || values.mobile;
  return values.mobile;
};

/**
 * Calcula ancho responsive para grid o columnas
 * @param {number} screenWidth - Ancho de la pantalla
 * @param {number} columns - Número de columnas
 * @param {number} gap - Espacio entre columnas (default 16)
 * @param {number} containerPadding - Padding del contenedor (default 0)
 * @returns {number} - Ancho de cada columna
 */
export const getColumnWidth = (screenWidth, columns, gap = 16, containerPadding = 0) => {
  const availableWidth = screenWidth - (containerPadding * 2) - (gap * (columns - 1));
  return availableWidth / columns;
};

/**
 * Crea un contenedor responsivo para web
 * Retorna estilos para centrar contenido en desktop
 */
export const getContainerMaxWidth = (screenWidth, isWeb = Platform.OS === 'web') => {
  if (!isWeb) return screenWidth;
  if (screenWidth >= 1440) return 1120;
  if (screenWidth >= 1024) return 1024;
  return screenWidth;
};

/**
 * Touch target size validator (accesibilidad)
 * Devuelve el tamaño mínimo recomendado para elementos interactivos
 */
export const TOUCH_TARGETS = {
  minimum: 44,    // Mínimo WCAG AA
  comfortable: 48, // Recomendado
  large: 56,      // Grande
};

/**
 * Valida que un elemento tenga touch target suficiente
 */
export const isAccessibleTouchTarget = (size) => size >= TOUCH_TARGETS.comfortable;

/**
 * Estilos comunes responsivos
 */
export const responsiveStyles = {
  // Contenedor centrado en web
  containerWeb: (screenWidth) => ({
    width: screenWidth >= 1024 ? Math.min(1120, screenWidth) : screenWidth,
    alignSelf: 'center',
    maxWidth: 1120,
  }),

  // Padding responsivo
  paddingResponsive: (screenWidth) => ({
    paddingHorizontal: screenWidth >= 1024 ? 48 : screenWidth >= 768 ? 24 : 16,
  }),

  // Typography responsivos usuales
  typography: {
    h1: (screenWidth) => ({
      fontSize: screenWidth >= 1024 ? 40 : screenWidth >= 768 ? 32 : 28,
      lineHeight: screenWidth >= 1024 ? 48 : screenWidth >= 768 ? 40 : 36,
    }),
    h2: (screenWidth) => ({
      fontSize: screenWidth >= 1024 ? 32 : screenWidth >= 768 ? 28 : 24,
      lineHeight: screenWidth >= 1024 ? 40 : screenWidth >= 768 ? 36 : 32,
    }),
    body: (screenWidth) => ({
      fontSize: screenWidth >= 1024 ? 16 : 16,
      lineHeight: screenWidth >= 1024 ? 24 : 24,
    }),
  },
};
