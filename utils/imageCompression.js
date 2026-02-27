/**
 * Utilidades para compresión de imágenes
 * Optimizadas para conexiones lentas
 */
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Comprimir imagen para envío por internet lento
 * @param {string} imageUri - URI de la imagen
 * @param {object} options - { quality?, maxWidth?, maxHeight? }
 * @returns {Promise<{uri, size}>}
 */
export const compressImageForUpload = async (
  imageUri,
  options = {
    quality: 0.8,
    maxWidth: 1200,
    maxHeight: 1200,
  }
) => {
  try {
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

    // Estimar tamaño (aproximado)
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);

    console.log(`📏 Tamaño comprimido: ${sizeInMB} MB`);

    return {
      uri: manipulatedImage.uri,
      size: blob.size,
      sizeInMB,
    };
  } catch (error) {
    console.error('❌ Error comprimiendo imagen:', error);
    throw error;
  }
};

/**
 * Comprimir múltiples imágenes en paralelo
 */
export const compressImagesForUpload = async (imageUris, onProgress = null) => {
  try {
    const compressed = [];
    const totalSize = { bytes: 0 };

    for (let idx = 0; idx < imageUris.length; idx++) {
      const uri = imageUris[idx];

      if (onProgress) {
        onProgress({
          current: idx + 1,
          total: imageUris.length,
          status: 'compressing',
        });
      }

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
    }

    const totalSizeInMB = (totalSize.bytes / (1024 * 1024)).toFixed(2);
    console.log(`📦 Total comprimido: ${totalSizeInMB} MB`);

    return {
      images: compressed,
      totalBytes: totalSize.bytes,
      totalSizeInMB,
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
      maxWidth: 800,
      maxHeight: 800,
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

export default {
  compressImageForUpload,
  compressImagesForUpload,
  getCompressionSettingsForConnection,
  estimateUploadTime,
  formatUploadTime,
};
