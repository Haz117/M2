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
  ActivityIndicator,
  Platform
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

  // Redimensionar imagen para optimización (más pequeña para web/base64)
  const compressImage = async (imageUri) => {
    try {
      // En web, comprimir más para base64
      const maxSize = Platform.OS === 'web' ? 600 : 1280;
      const quality = Platform.OS === 'web' ? 0.5 : 0.7;
      
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: maxSize, height: maxSize } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: Platform.OS === 'web' }
      );
      return {
        uri: manipResult.uri,
        base64: manipResult.base64 || null
      };
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return { uri: imageUri, base64: null }; // Si falla, usar original
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

      if (!result.canceled && result.assets && result.assets[0]) {
        const compressed = await compressImage(result.assets[0].uri);
        setSelectedImage({
          uri: compressed.uri,
          base64: compressed.base64 || null,
          type: 'photo'
        });
        setPreviewModalVisible(true);
      }
    } catch (error) {
      console.error('Error capturando foto:', error);
      Alert.alert('Error', 'No se pudo capturar la foto');
    }
  };

  // Seleccionar de galería
  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const compressed = await compressImage(result.assets[0].uri);
        setSelectedImage({
          uri: compressed.uri,
          base64: compressed.base64 || null,
          type: 'gallery'
        });
        setPreviewModalVisible(true);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Enviar imagen
  const sendImage = async () => {
    if (!selectedImage) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);

      const timestamp = Date.now();
      const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      // En web, usar base64 directamente (evita CORS)
      if (Platform.OS === 'web' || selectedImage.base64) {
        setUploadProgress(50);
        
        // Crear data URL para web
        let imageUri = selectedImage.uri;
        if (selectedImage.base64) {
          imageUri = `data:image/jpeg;base64,${selectedImage.base64}`;
        }
        
        setUploadProgress(100);
        
        onImageCapture({
          uri: imageUri,
          name: filename,
          type: 'image',
          isBase64: true,
          localUri: selectedImage.uri
        });
        
        // Limpiar
        setSelectedImage(null);
        setPreviewModalVisible(false);
        setUploadProgress(0);
        return;
      }
      
      // Para móvil con Storage disponible
      if (!storage) {
        Alert.alert(
          'No disponible', 
          'El almacenamiento de imágenes no está configurado.'
        );
        return;
      }

      // Leer archivo
      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();

      // Crear referencia en Storage
      const storageRef = ref(storage, `chat-images/${filename}`);

      // Subir imagen
      setUploadProgress(30);
      await uploadBytes(storageRef, blob);
      setUploadProgress(80);

      // Obtener URL descargable
      const downloadURL = await getDownloadURL(storageRef);
      setUploadProgress(100);

      onImageCapture({
        uri: downloadURL,
        name: filename,
        type: 'image',
        localUri: selectedImage.uri
      });

      // Limpiar
      setSelectedImage(null);
      setPreviewModalVisible(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      
      // Si falla Storage, intentar con base64 como fallback
      if (selectedImage.base64 || Platform.OS === 'web') {
        try {
          const imageUri = selectedImage.base64 
            ? `data:image/jpeg;base64,${selectedImage.base64}` 
            : selectedImage.uri;
            
          onImageCapture({
            uri: imageUri,
            name: `fallback-${Date.now()}.jpg`,
            type: 'image',
            isBase64: true
          });
          
          setSelectedImage(null);
          setPreviewModalVisible(false);
          setUploadProgress(0);
          return;
        } catch (fallbackError) {
          console.error('Fallback también falló:', fallbackError);
        }
      }
      
      Alert.alert('Error', 'No se pudo enviar la imagen. Intenta de nuevo.');
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
      {/* Botón de acción para imagen */}
      <TouchableOpacity
        style={[styles.imageButton, disabled && styles.buttonDisabled]}
        onPress={pickFromGallery}
        onLongPress={takePicture}
        disabled={disabled || uploading}
      >
        <Ionicons
          name="image"
          size={22}
          color={disabled || uploading ? '#CCC' : '#9F2241'}
        />
      </TouchableOpacity>

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
    // No ocupar todo el ancho
  },

  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(159, 34, 65, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(159, 34, 65, 0.2)',
  },

  buttonDisabled: {
    opacity: 0.5,
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
