// hooks/usePerformanceOptimizations.js
// Hook para optimizaciones de rendimiento en pantallas
// ⚡ Centraliza configuraciones de performance para listas y animaciones

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Platform, InteractionManager } from 'react-native';

/**
 * Hook para optimizaciones de rendimiento en FlatList
 * @param {Object} options - Opciones de configuración
 * @param {number} options.itemHeight - Altura estimada de cada item (default: 100)
 * @param {number} options.threshold - Umbral para modo bajo rendimiento (default: 50)
 */
export function useListOptimizations({ itemHeight = 100, threshold = 50 } = {}) {
  const [lowPerfMode, setLowPerfMode] = useState(false);
  
  // Configuración optimizada para FlatList
  const flatListConfig = useMemo(() => ({
    // Virtualización
    windowSize: lowPerfMode ? 3 : 5,
    maxToRenderPerBatch: lowPerfMode ? 3 : 5,
    initialNumToRender: lowPerfMode ? 5 : 8,
    updateCellsBatchingPeriod: lowPerfMode ? 150 : 100,
    removeClippedSubviews: Platform.OS !== 'web', // Solo en nativo
    
    // Layout optimization
    getItemLayout: (data, index) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
  }), [lowPerfMode, itemHeight]);
  
  // Activar modo bajo rendimiento si hay muchos items
  const checkPerformanceMode = useCallback((itemCount) => {
    setLowPerfMode(itemCount > threshold);
  }, [threshold]);
  
  return {
    flatListConfig,
    lowPerfMode,
    checkPerformanceMode,
  };
}

/**
 * Hook para deshabilitar animaciones durante operaciones pesadas
 */
export function useAnimationOptimizations() {
  const animationsEnabled = useRef(true);
  const [ready, setReady] = useState(false);
  
  // Esperar a que la interacción termine antes de habilitar animaciones
  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    
    return () => interaction.cancel();
  }, []);
  
  const disableAnimations = useCallback(() => {
    animationsEnabled.current = false;
  }, []);
  
  const enableAnimations = useCallback(() => {
    animationsEnabled.current = true;
  }, []);
  
  const shouldAnimate = useCallback(() => {
    return animationsEnabled.current && ready;
  }, [ready]);
  
  return {
    ready,
    shouldAnimate,
    disableAnimations,
    enableAnimations,
  };
}

/**
 * Hook para debounce de búsquedas y filtros
 * @param {*} value - Valor a debounce
 * @param {number} delay - Delay en ms (default: 300)
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook para memorización de callbacks con cleanup
 */
export function useStableCallback(callback) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args) => {
    return callbackRef.current?.(...args);
  }, []);
}

/**
 * Hook para detectar si el componente está montado
 */
export function useIsMounted() {
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return isMounted;
}

/**
 * Configuración por defecto para ScrollView optimizado
 */
export const optimizedScrollConfig = {
  scrollEventThrottle: 16,
  removeClippedSubviews: Platform.OS !== 'web',
  keyboardShouldPersistTaps: 'handled',
  showsVerticalScrollIndicator: false,
  overScrollMode: 'never',
};

export default {
  useListOptimizations,
  useAnimationOptimizations,
  useDebounce,
  useStableCallback,
  useIsMounted,
  optimizedScrollConfig,
};
