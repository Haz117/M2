import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { createTaskReport, uploadReportImage } from '../services/reportsService';
import { getCurrentSession } from '../services/authFirestore';
import Toast from './Toast';
import WebSafeBlur from './WebSafeBlur';

const { width } = Dimensions.get('window');

const ReportFormModal = ({ visible, onClose, taskId, onSuccess }) => {
  const { theme, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errors, setErrors] = useState({});

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    background: {
      flex: 1,
    },
    sheet: {
      maxHeight: '90%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 24,
      flexDirection: 'column',
      display: 'flex',
    },
    scrollView: {
      flex: 1,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: isDark ? '#888' : '#666',
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 8,
    },
    input: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#272727' : '#f9f9f9',
    },
    multilineInput: {
      minHeight: 100,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    ratingContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    star: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
    },
    starActive: {
      backgroundColor: '#FFD700',
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    imageContainer: {
      position: 'relative',
      borderRadius: 8,
      overflow: 'hidden',
    },
    image: {
      width: (width - 56) / 2,
      height: (width - 56) / 2,
    },
    removeImageButton: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 16,
      padding: 4,
    },
    addImageButton: {
      width: (width - 56) / 2,
      height: (width - 56) / 2,
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#272727' : '#f9f9f9',
    },
    addImageText: {
      fontSize: 12,
      color: theme.primary,
      marginTop: 8,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    saveButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    errorText: {
      color: '#FF3B30',
      fontSize: 12,
      marginTop: 4,
    },
    ratingCommentInput: {
      minHeight: 80,
      marginTop: 8,
    },
  });

  const handleAddImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          uploading: false,
        };
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setToastMessage('Error selecting image');
    }
  };

  const handleRemoveImage = (imageId) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await getCurrentSession();
      if (!result.success || !result.session) {
        throw new Error('User not authenticated');
      }
      const currentUser = result.session;

      // Preparar URIs de imágenes (sin subir a Storage por problemas de CORS en desarrollo)
      const imageUrls = images.map(img => ({
        uri: img.uri,
        uploadedBy: currentUser.userId,
        uploadedAt: new Date().toISOString(),
      }));

      // Create report con imágenes incluidas
      const reportId = await createTaskReport(taskId, currentUser.userId, {
        title: title.trim(),
        description: description.trim(),
        rating: rating > 0 ? rating : null,
        ratingComment: ratingComment.trim(),
        images: imageUrls, // Guardar URIs directamente
      });

      setToastMessage('Report created successfully!');
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setImages([]);
        setRating(0);
        setRatingComment('');
        setErrors({});
        onSuccess?.();
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error creating report:', error);
      setToastMessage('Error creating report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <WebSafeBlur intensity={70} style={styles.container}>
        <TouchableOpacity
          style={styles.background}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            <View style={styles.header}>
              <Text style={styles.title}>Task Report</Text>
              <Text style={styles.subtitle}>
                Document task completion with photos and notes
              </Text>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Report Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Completed website redesign"
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                value={title}
                onChangeText={setTitle}
                editable={!loading}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe what was completed, steps taken, results..."
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                value={description}
                onChangeText={setDescription}
                multiline
                editable={!loading}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Photos/Evidence */}
            <View style={styles.section}>
              <Text style={styles.label}>Photos/Evidence</Text>
              <View style={styles.imageGrid}>
                {images.map((image) => (
                  <View key={image.id} style={styles.imageContainer}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.image}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(image.id)}
                      disabled={loading}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 5 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={handleAddImage}
                    disabled={loading}
                  >
                    <Ionicons
                      name="camera"
                      size={32}
                      color={theme.primary}
                    />
                    <Text style={styles.addImageText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Quality Rating */}
            <View style={styles.section}>
              <Text style={styles.label}>Task Quality Rating</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={[
                      styles.star,
                      rating >= star && styles.starActive,
                    ]}
                    onPress={() => setRating(star)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={24}
                      color={rating >= star ? '#000' : isDark ? '#666' : '#ccc'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <View style={styles.section}>
                  <Text style={styles.label}>Additional Comments</Text>
                  <TextInput
                    style={[styles.input, styles.ratingCommentInput]}
                    placeholder="Share details about the quality and completion..."
                    placeholderTextColor={isDark ? '#666' : '#ccc'}
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    multiline
                    editable={!loading}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </WebSafeBlur>

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage('')}
      />
    </Modal>
  );
};

export default ReportFormModal;
