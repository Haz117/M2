/**
 * Gestor de cache con auto-limpieza
 * Previene que AsyncStorage crezca indefinidamente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';
const CACHE_METADATA = 'cache_metadata';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB en bytes estimados
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cada 1 hora

let cleanupTimer = null;
const cacheSizes = {}; // Track approximate sizes

/**
 * Guardar dato en cache con metadata
 * @param {string} key - Clave
 * @param {any} value - Valor
 * @param {number} ttl - Duración en ms (default: 7 días)
 */
export const setCacheItem = async (key, value, ttl = CACHE_TTL) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const data = JSON.stringify(value);
    
    // Estimar tamaño
    const estimatedSize = data.length * 2; // UTF-16 encoding
    cacheSizes[key] = estimatedSize;

    const metadata = {
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      size: estimatedSize
    };

    await AsyncStorage.setItem(cacheKey, data);
    await updateCacheMetadata(key, metadata);
    
    // Limpiar si supera límite
    await cleanupIfNeeded();

    return true;
  } catch (error) {
    console.error('Error saving cache item:', error);
    return false;
  }
};

/**
 * Obtener dato del cache
 * @param {string} key - Clave
 * @returns {any|null} Valor o null si expirado
 */
export const getCacheItem = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const data = await AsyncStorage.getItem(cacheKey);

    if (!data) return null;

    // Verificar expiration
    const metadata = await getCacheMetadata(key);
    if (metadata && Date.now() > metadata.expiresAt) {
      // Cache expirado, eliminarlo
      await removeCacheItem(key);
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading cache item:', error);
    return null;
  }
};

/**
 * Remover item del cache
 * @param {string} key - Clave
 */
export const removeCacheItem = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await AsyncStorage.removeItem(cacheKey);
    delete cacheSizes[key];

    // Remover metadata
    const allMetadata = await getAllCacheMetadata();
    delete allMetadata[key];
    await AsyncStorage.setItem(CACHE_METADATA, JSON.stringify(allMetadata));

    return true;
  } catch (error) {
    console.error('Error removing cache item:', error);
    return false;
  }
};

/**
 * Limpiar cache expirado y reducir tamaño si es necesario
 */
export const cleanupIfNeeded = async () => {
  try {
    let totalSize = Object.values(cacheSizes).reduce((a, b) => a + b, 0);

    // Si supera límite, remover items más viejos
    if (totalSize > MAX_CACHE_SIZE) {
      const metadata = await getAllCacheMetadata();
      const items = Object.entries(metadata)
        .map(([key, meta]) => ({ key, ...meta }))
        .sort((a, b) => a.createdAt - b.createdAt); // Más viejos primero

      // Remover ~20% del cache
      const toRemove = Math.ceil(items.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        await removeCacheItem(items[i].key);
      }

      console.log(`Cleaned up ${toRemove} old cache items`);
    }

    // Remover items expirados
    const now = Date.now();
    const metadata = await getAllCacheMetadata();
    let removedCount = 0;

    for (const [key, meta] of Object.entries(metadata)) {
      if (now > meta.expiresAt) {
        await removeCacheItem(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Removed ${removedCount} expired cache items`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

/**
 * Limpiar todo el cache
 */
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    await AsyncStorage.removeItem(CACHE_METADATA);
    Object.keys(cacheSizes).forEach(key => delete cacheSizes[key]);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Obtener estadísticas del cache
 */
export const getCacheStats = async () => {
  try {
    const allMetadata = await getAllCacheMetadata();
    const totalSize = Object.values(cacheSizes).reduce((a, b) => a + b, 0);
    const itemCount = Object.keys(allMetadata).length;
    const expiredCount = Object.values(allMetadata)
      .filter(meta => Date.now() > meta.expiresAt).length;

    return {
      totalSize: (totalSize / 1024).toFixed(2) + ' KB',
      itemCount,
      expiredCount,
      utilizationPercent: ((totalSize / MAX_CACHE_SIZE) * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

// Helpers
const updateCacheMetadata = async (key, metadata) => {
  const allMetadata = await getAllCacheMetadata();
  allMetadata[key] = metadata;
  await AsyncStorage.setItem(CACHE_METADATA, JSON.stringify(allMetadata));
};

const getCacheMetadata = async (key) => {
  const allMetadata = await getAllCacheMetadata();
  return allMetadata[key];
};

const getAllCacheMetadata = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_METADATA);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

/**
 * Iniciar limpieza automática periódica
 * Llamar una sola vez en App.js
 */
export const startAutoCacheCleanup = () => {
  if (cleanupTimer) return; // Ya iniciado

  cleanupTimer = setInterval(async () => {
    await cleanupIfNeeded();
  }, CLEANUP_INTERVAL);

  console.log('Auto cache cleanup started');
};

/**
 * Detener limpieza automática
 */
export const stopAutoCacheCleanup = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

export default {
  setCacheItem,
  getCacheItem,
  removeCacheItem,
  cleanupIfNeeded,
  clearAllCache,
  getCacheStats,
  startAutoCacheCleanup,
  stopAutoCacheCleanup
};
