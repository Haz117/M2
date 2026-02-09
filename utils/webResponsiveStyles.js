// utils/webResponsiveStyles.js
// Estilos responsive específicos para web
// Proporciona utilidades para containers adaptables en dispositivos grandes

import { Platform } from 'react-native';

export const getWebContainerStyles = (screenWidth) => {
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb) return {};

  return {
    maxWidth: screenWidth > 1440 ? 1200 : screenWidth > 1024 ? 1000 : '100%',
    alignSelf: 'center',
    width: '100%',
  };
};

export const getResponsiveColumnsGrid = (screenWidth, itemCount = 4) => {
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb) {
    return {
      columns: 2,
      gap: 12,
    };
  }

  if (screenWidth >= 1440) {
    return {
      columns: itemCount,
      gap: 16,
    };
  }

  if (screenWidth >= 1024) {
    return {
      columns: Math.min(itemCount, 3),
      gap: 16,
    };
  }

  if (screenWidth >= 768) {
    return {
      columns: 2,
      gap: 12,
    };
  }

  return {
    columns: 1,
    gap: 12,
  };
};

export const getCardMaxWidth = (screenWidth, columnCount = 4) => {
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb) return undefined;

  if (screenWidth >= 1440) return `calc(${100 / columnCount}% - ${16 * (columnCount - 1) / columnCount}px)`;
  if (screenWidth >= 1024) return `calc(${100 / Math.min(columnCount, 3)}% - ${16 * (Math.min(columnCount, 3) - 1) / Math.min(columnCount, 3)}px)`;
  if (screenWidth >= 768) return 'calc(50% - 6px)';
  
  return '100%';
};

export const getHorizontalScrollContainerWidth = (screenWidth, itemWidth, gap = 12, padding = 32) => {
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb) {
    // En mobile, mostrar items en scroll horizontal
    return {
      scrollWidth: screenWidth - padding,
      itemWidth: screenWidth - padding * 2,
    };
  }

  // En web, limitar ancho máximo
  const maxWidth = screenWidth > 1440 ? 1200 : screenWidth > 1024 ? 1000 : screenWidth - padding;
  
  return {
    scrollWidth: maxWidth,
    itemWidth: itemWidth,
  };
};
