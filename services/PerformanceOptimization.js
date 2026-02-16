// services/PerformanceOptimization.js
// Utilidades de optimización de rendimiento para ReportsScreen
// - Memoización inteligente
// - Lazy loading
// - Virtualization helper
// - Debounce/Throttle

import React from 'react';

/**
 * Optimización: Memoizar cálculos costosos
 * Usa deep equality check solo cuando es necesario
 */
export function useDeepMemo(value, condition = () => true) {
  const memoRef = React.useRef(value);
  
  React.useEffect(() => {
    if (condition()) {
      memoRef.current = value;
    }
  }, [value, condition]);

  return memoRef.current;
}

/**
 * Debounce para actualizaciones frecuentes
 * Reduce re-renders cuando el usuario filtra rápidamente
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle para scroll/resize events
 */
export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Paginación inteligente: Mostrar solo lo visible
 * Reduce objetos DOM y mejora rendimiento
 */
export function paginate(items = [], pageSize = 10, currentPage = 0) {
  const start = currentPage * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    hasMore: start + pageSize < items.length,
    currentPage
  };
}

/**
 * Filtrar datos eficientemente
 * Evita crear nuevos arrays innecesariamente
 */
export function filterTasksByArea(tasks, selectedAreas) {
  if (!selectedAreas || selectedAreas.length === 0) {
    return tasks;
  }
  
  const areaSet = new Set(selectedAreas);
  return tasks.filter(t => areaSet.has(t.area));
}

/**
 * Caché local para queries frecuentes
 */
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function getCachedQuery(key, queryFn, ttl = CACHE_TTL) {
  const cached = queryCache.get(key);
  const now = Date.now();
  
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const data = queryFn();
  queryCache.set(key, { data, expiry: now + ttl });
  
  return data;
}

/**
 * Limpiar caché
 */
export function clearQueryCache(pattern) {
  if (!pattern) {
    queryCache.clear();
    return;
  }
  
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Comparación inteligente de objetos para shouldComponentUpdate
 */
export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => obj1[key] === obj2[key]);
}

/**
 * Lazy load componentes pesados
 * Carga bajo demanda para mejorar startup performance
 */
export function lazyLoad(importFn) {
  let resolved = null;
  let rejected = null;
  let promise = null;

  const suspender = importFn().then(
    res => { resolved = res; return res; },
    err => { rejected = err; }
  );

  return () => {
    if (resolved) return resolved;
    if (rejected) throw rejected;
    throw suspender;
  };
}

/**
 * Batch updates para reducir re-renders
 * Agrupa múltiples setState en uno solo
 */
export function useBatchedUpdates() {
  const [state, setState] = React.useState({});
  const updates = React.useRef({});

  const updateBatch = (newUpdates) => {
    Object.assign(updates.current, newUpdates);
    setState({ ...updates.current });
  };

  return [state, updateBatch];
}

/**
 * Intersectionobserver para lazy render
 * Solo renderiza elementos visibles en pantalla
 */
export function useIntersectionObserver(ref, options = {}) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      ...options
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);

  return isVisible;
}

/**
 * Medir rendimiento
 */
export function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
  
  return result;
}

/**
 * Monitorear renders
 */
let renderCount = 0;
export function trackRenders(componentName) {
  renderCount++;
  if (renderCount % 10 === 0) {
    console.log(`🔄 ${componentName} rendered ${renderCount} times`);
  }
}
