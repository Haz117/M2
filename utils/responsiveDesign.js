/**
 * Responsive Design Utilities
 * Breakpoints, utilities, media queries helpers
 */

import { useWindowDimensions, Platform } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Breakpoints standard
 */
export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Device types
 */
export const DeviceType = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  WIDE: 'wide',
};

/**
 * Hook para obtener dimensiones y tipo de dispositivo
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const [deviceType, setDeviceType] = useState(DeviceType.MOBILE);

  useEffect(() => {
    let type = DeviceType.MOBILE;
    if (width >= breakpoints.xl) {
      type = DeviceType.WIDE;
    } else if (width >= breakpoints.lg) {
      type = DeviceType.DESKTOP;
    } else if (width >= breakpoints.md) {
      type = DeviceType.TABLET;
    }
    setDeviceType(type);
  }, [width]);

  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg && width < breakpoints.xl;
  const isWide = width >= breakpoints.xl;
  const isLandscape = width > height;
  const isPortrait = width <= height;

  return {
    width,
    height,
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isLandscape,
    isPortrait,
  };
};

/**
 * Grid configuration
 */
export const getGridConfig = (deviceType) => {
  const configs = {
    [DeviceType.MOBILE]: {
      columns: 1,
      gap: 8,
      maxColumns: 1,
    },
    [DeviceType.TABLET]: {
      columns: 2,
      gap: 12,
      maxColumns: 2,
    },
    [DeviceType.DESKTOP]: {
      columns: 3,
      gap: 16,
      maxColumns: 3,
    },
    [DeviceType.WIDE]: {
      columns: 4,
      gap: 16,
      maxColumns: 4,
    },
  };
  return configs[deviceType] || configs[DeviceType.MOBILE];
};

/**
 * Container max width
 */
export const getContainerMaxWidth = (deviceType) => {
  const maxWidths = {
    [DeviceType.MOBILE]: '100%',
    [DeviceType.TABLET]: 700,
    [DeviceType.DESKTOP]: 1000,
    [DeviceType.WIDE]: 1280,
  };
  return maxWidths[deviceType] || '100%';
};

/**
 * Responsive layout hook
 */
export const useResponsiveLayout = () => {
  const { deviceType, width, isTablet, isDesktop, isWide } = useResponsive();

  const getLayout = (mobileLayout, tabletLayout = null, desktopLayout = null) => {
    if (isWide && desktopLayout) return desktopLayout;
    if (isDesktop && desktopLayout) return desktopLayout;
    if (isTablet && tabletLayout) return tabletLayout;
    return mobileLayout;
  };

  const gridConfig = getGridConfig(deviceType);

  return {
    deviceType,
    width,
    getLayout,
    gridConfig,
    containerMaxWidth: getContainerMaxWidth(deviceType),
  };
};

/**
 * Touch target size (mínimo 44x44 iOS, 48x48 Android)
 */
export const getTouchTargetSize = () => {
  return Platform.OS === 'ios' ? 44 : 48;
};

/**
 * Aspect ratio utilities
 */
export const AspectRatios = {
  square: 1 / 1,
  video: 16 / 9,
  image: 4 / 3,
  portrait: 3 / 4,
  ultrawide: 21 / 9,
};

/**
 * Calculate aspect ratio height
 */
export const calculateAspectHeight = (width, aspectRatio) => {
  return width / aspectRatio;
};

/**
 * Orientation hook
 */
export const useOrientation = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  return {
    isLandscape,
    isPortrait,
    orientation: isLandscape ? 'landscape' : 'portrait',
  };
};

/**
 * Responsive text size
 */
export const getResponsiveTextSize = (baseSize) => {
  const { width } = useWindowDimensions();
  
  if (width < breakpoints.md) return baseSize * 0.9;
  if (width < breakpoints.lg) return baseSize * 1;
  if (width < breakpoints.xl) return baseSize * 1.1;
  return baseSize * 1.2;
};

/**
 * Safe area config
 */
export const SafeAreaConfig = {
  top: Platform.OS === 'ios' ? 50 : 30,
  bottom: Platform.OS === 'ios' ? 34 : 0,
};

export default {
  breakpoints,
  DeviceType,
  useResponsive,
  useResponsiveLayout,
  useOrientation,
  getGridConfig,
  getContainerMaxWidth,
  getTouchTargetSize,
  AspectRatios,
  calculateAspectHeight,
  SafeAreaConfig,
  getResponsiveTextSize,
};
