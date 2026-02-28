/**
 * Utilidades para compresión de imágenes
 * Optimizadas para conexiones lentas
 * Soporta caching y detección de velocidad
 */
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { cacheManager } from './cacheManager';

const COMPRESSION_CACHE_PREFIX = 'image_compressed_';
const SETTINGS_CACHE_KEY = 'compression_settings_cache';

/**
 * Comprimir imagen para envío por internet lento
 * @param {string} imageUri - URI de la imagen
 * @param {object} options - { quality?, maxWidth?, maxHeight?, forceCompression? }
 * @returns {Promise<{uri, size, sizeInMB, metadata}>}
 */
export const compressImageForUpload = async (
  imageUri,
  options = {
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 1200,
    forceCompression: false, // Ignorar cache si true
  }
) => {
  try {
    // Verificar cache primero
    if (!options.forceCompression) {
      const cached = await getCachedCompressedImage(imageUri);
      if (cached) {
        console.log('📦 Imagen comprimida (desde cache)');
        return cached;
      }
    }

    console.log('🖼️ Comprimiendo imagen...', imageUri.substring(0, 50));

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: options.maxWidth,
            height: options.maxHeight,
          },
        },
      ],
      {
        compress: options.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('✅ Imagen comprimida:', manipulatedImage.uri);

    // Obtener datos de blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);

    const result = {
      uri: manipulatedImage.uri,
      size: blob.size,
      sizeInMB,
      metadata: {
        quality: options.quality,
        width: options.maxWidth,
        height: options.maxHeight,
        compressedAt: new Date().toISOString(),
      },
    };

    // Guardar en cache
    await cacheCompressedImage(imageUri, result);

    console.log(`📏 Tamaño comprimido: ${sizeInMB} MB`);
    return result;
  } catch (error) {
    console.error('❌ Error comprimiendo imagen:', error);
    throw error;
  }
};

/**
 * Comprimir múltiples imágenes en paralelo con caché
 */
export const compressImagesForUpload = async (imageUris, onProgress = null) => {
  try {
    const compressed = [];
    const totalSize = { bytes: 0 };
    const failedImages = [];

    for (let idx = 0; idx < imageUris.length; idx++) {
      const uri = imageUris[idx];

      if (onProgress) {
        onProgress({
          current: idx + 1,
          total: imageUris.length,
          status: 'compressing',
        });
      }

      try {
        const result = await compressImageForUpload(uri);
        compressed.push(result);
        totalSize.bytes += result.size;

        if (onProgress) {
          onProgress({
            current: idx + 1,
            total: imageUris.length,
            status: 'compressed',
            sizeInMB: result.sizeInMB,
          });
        }
      } catch (error) {
        console.error(`Error comprimiendo imagen ${idx}:`, error);
        failedImages.push({ uri, error: error.message });
      }
    }

    const totalSizeInMB = (totalSize.bytes / (1024 * 1024)).toFixed(2);
    console.log(`📦 Total comprimido: ${totalSizeInMB} MB`);

    return {
      images: compressed,
      totalBytes: totalSize.bytes,
      totalSizeInMB,
      failedImages,
      successCount: compressed.length,
      failCount: failedImages.length,
    };
  } catch (error) {
    console.error('❌ Error en compresión masiva:', error);
    throw error;
  }
};

/**
 * Detectar calidad de conexión y ajustar parámetros
 * @returns {object} { quality, maxWidth, maxHeight }
 */
export const getCompressionSettingsForConnection = (connectionSpeed = 'good') => {
  const settings = {
    slow: {
      quality: 0.5, // 50% - muy lento
      maxWidth: 640,
      maxHeight: 640,
      description: 'Muy comprimido (conexión lenta)',
    },
    medium: {
      quality: 0.7, // 70% - moderado
      maxWidth: 1000,
      maxHeight: 1000,
      description: 'Comprimido (conexión moderada)',
    },
    good: {
      quality: 0.85, // 85% - bueno
      maxWidth: 1400,
      maxHeight: 1400,
      description: 'Calidad buena',
    },
    excellent: {
      quality: 0.95, // 95% - excelente
      maxWidth: 1920,
      maxHeight: 1920,
      description: 'Calidad máxima',
    },
  };

  return settings[connectionSpeed] || settings.good;
};

/**
 * Detectar velocidad de conexión automáticamente
 * @returns {Promise<string>} 'slow' | 'medium' | 'good' | 'excellent'
 */
export const detectConnectionSpeed = async () => {
  try {
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
      return 'offline';
    }

    const type = state.type;

    // Estimaciones basadas en tipo de conexión
    const speedMap = {
      wifi: 'excellent',
      cellular: {
        '4g': 'good',
        '3g': 'medium',
        '2g': 'slow',
        lte: 'good',
        '5g': 'excellent',
      },
      ethernet: 'excellent',
      none: 'offline',
      unknown: 'medium',
    };

    if (type === 'cellular') {
      const subType = state.details?.cellularGeneration;
      return speedMap.cellular[subType] || 'medium';
    }

    return speedMap[type] || 'medium';
  } catch (error) {
    console.error('Error detectando velocidad:', error);
    return 'good'; // Default
  }
};

/**
 * Obtener ajustes de compresión automáticos
 */
export const getAutoCompressionSettings = async (forceDetect = false) => {
  try {
    // Verificar cache
    if (!forceDetect) {
      const cached = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 5 * 60 * 1000) { // 5 min de validez
          console.log('⚙️ Usando ajustes en caché');
          return data.settings;
        }
      }
    }

    // Detectar velocidad actual
    const speed = await detectConnectionSpeed();
    const settings = getCompressionSettingsForConnection(speed);

    // Guardar en cache
    await AsyncStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({
        settings,
        speed,
        timestamp: Date.now(),
      })
    );

    console.log(`⚙️ Ajustes de compresión automáticos: ${speed}`);
    return settings;
  } catch (error) {
    console.error('Error obteniendo ajustes auto:', error);
    return getCompressionSettingsForConnection('good');
  }
};

/**
 * Estimar tiempo de carga para una imagen
 * @param {number} fileSizeInMB - Tamaño en MB
 * @param {number} speedMBps - Velocidad de conexión en MB/s (típicamente 0.5 - 10)
 * @returns {number} Segundos estimados
 */
export const estimateUploadTime = (fileSizeInMB, speedMBps = 1) => {
  const seconds = fileSizeInMB / speedMBps;
  return Math.round(seconds);
};

/**
 * Formattear tiempo en segundos a string legible
 */
export const formatUploadTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Limpiar cache de imágenes comprimidas
 */
export const clearCompressionCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(COMPRESSION_CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log(`🗑️ Limpiar ${cacheKeys.length} imágenes en caché`);
    return true;
  } catch (error) {
    console.error('Error limpiando cache:', error);
    return false;
  }
};

/**
 * Obtener estadísticas de cache de compresión
 */
export const getCompressionCacheStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(COMPRESSION_CACHE_PREFIX));
    let totalSize = 0;

    for (const key of cacheKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    }

    return {
      cachedImages: cacheKeys.length,
      sizeInMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    return { cachedImages: 0, sizeInMB: '0' };
  }
};

// ===== HELPERS INTERNOS =====

const cacheCompressedImage = async (originalUri, compressedData) => {
  try {
    const key = `${COMPRESSION_CACHE_PREFIX}${hashImageUri(originalUri)}`;
    await AsyncStorage.setItem(key, JSON.stringify(compressedData));
  } catch (error) {
    console.error('Error guardando imagen en caché:', error);
  }
};

const getCachedCompressedImage = async (originalUri) => {
  try {
    const key = `${COMPRESSION_CACHE_PREFIX}${hashImageUri(originalUri)}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error leyendo imagen del caché:', error);
    return null;
  }
};

const hashImageUri = (uri) => {
  // Simple hash para usar como key
  return uri.split('/').pop().split('.')[0];
};


export default {
  compressImageForUpload,
  compressImagesForUpload,
  getCompressionSettingsForConnection,
  getAutoCompressionSettings,
  detectConnectionSpeed,
  estimateUploadTime,
  formatUploadTime,
  clearCompressionCache,
  getCompressionCacheStats,
};
