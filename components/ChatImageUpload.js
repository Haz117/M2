// components/ChatImageUpload.js
// Componente para capturar/seleccionar y enviar imágenes en el chat

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export default function ChatImageUpload({ 
  onImageCapture = () => {},
  disabled = false 
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Solicitar permisos
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitas permisos de cámara y galería');
      return false;
    }
    return true;
  };

  // Redimensionar imagen para optimización
  const compressImage = async (imageUri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1280, height: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return imageUri; // Si falla, usar original
    }
  };

  // Capturar foto con cámara
  const takePicture = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.cancelled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedImage({
          uri: compressedUri,
          type: 'photo'
        });
        setPreviewModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar la foto');
    }
  };

  // Seleccionar de galería
  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.cancelled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedImage({
          uri: compressedUri,
          type: 'gallery'
        });
        setPreviewModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Enviar imagen
  const sendImage = async () => {
    if (!selectedImage) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Leer archivo
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();

      // Crear referencia en Storage
      const timestamp = Date.now();
      const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storageRef = ref(storage, `chat-images/${filename}`);

      // Subir con progreso
      await uploadBytes(storageRef, blob, {
        onProgress: (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      // Obtener URL descargable
      const downloadURL = await getDownloadURL(storageRef);

      // Capturar datos de imagen
      const imageData = await Image.getSize(selectedImage.uri);
      const size = blob.size;

      onImageCapture({
        uri: downloadURL,
        type: 'image',
        size: size,
        width: imageData.width || 1280,
        height: imageData.height || 1024,
        localUri: selectedImage.uri
      });

      // Limpiar
      setSelectedImage(null);
      setPreviewModalVisible(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      Alert.alert('Error', 'No se pudo subir la imagen. Intenta nuevamente.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const cancelSelection = () => {
    setSelectedImage(null);
    setPreviewModalVisible(false);
    setUploadProgress(0);
  };

  return (
    <View style={styles.container}>
      {/* Botones de acción */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={takePicture}
          disabled={disabled || uploading}
        >
          <Ionicons
            name="camera"
            size={20}
            color={disabled || uploading ? '#CCC' : '#9F2241'}
          />
          <Text
            style={[
              styles.buttonText,
              (disabled || uploading) && styles.buttonTextDisabled
            ]}
          >
            Foto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={pickFromGallery}
          disabled={disabled || uploading}
        >
          <Ionicons
            name="image"
            size={20}
            color={disabled || uploading ? '#CCC' : '#9F2241'}
          />
          <Text
            style={[
              styles.buttonText,
              (disabled || uploading) && styles.buttonTextDisabled
            ]}
          >
            Galería
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de vista previa */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelSelection}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={cancelSelection}
              disabled={uploading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vista Previa</Text>
            <TouchableOpacity
              onPress={sendImage}
              disabled={uploading}
              style={[styles.sendButton, uploading && styles.sendButtonDisabled]}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Contenido */}
          <View style={styles.previewContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            {/* Progreso de carga */}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <View style={styles.uploadingContent}>
                  <ActivityIndicator size="large" color="#9F2241" />
                  <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                  <Text style={styles.uploadingPercent}>{uploadProgress}%</Text>
                  
                  {/* Barra de progreso */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${uploadProgress}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Footer con información */}
          <View style={styles.modalFooter}>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                La imagen se comprimirá automáticamente para optimizar
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelButton]}
                onPress={cancelSelection}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.confirmButton,
                  uploading && styles.confirmButtonDisabled
                ]}
                onPress={sendImage}
                disabled={uploading}
              >
                <Text style={styles.confirmButtonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    gap: 6,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9F2241',
  },

  buttonTextDisabled: {
    color: '#CCC',
  },

  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },

  closeButton: {
    padding: 8,
  },

  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  sendButton: {
    backgroundColor: '#9F2241',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  previewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadingContent: {
    alignItems: 'center',
    gap: 16,
  },

  uploadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },

  uploadingPercent: {
    color: '#9F2241',
    fontSize: 24,
    fontWeight: '700',
  },

  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#9F2241',
  },

  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },

  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 8,
  },

  infoText: {
    color: '#AAA',
    fontSize: 12,
    flex: 1,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },

  cancelButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  confirmButton: {
    backgroundColor: '#9F2241',
  },

  confirmButtonDisabled: {
    opacity: 0.5,
  },

  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
