// screens/TaskChatScreen.js
// Chat simple por tarea usando Firestore. Colección: tasks/{taskId}/messages
// Requiere que configures firebase.js con tu proyecto.
// Funcionalidad mínima: lista de mensajes en tiempo real + enviar mensaje de texto.

import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, getServerTimestamp } from '../firebase';
import { getCurrentSession } from '../services/authFirestore';
import { notifyNewComment } from '../services/fcm';
import { notifyNewChatMessage } from '../services/emailNotifications';
import ChatImageUpload from '../components/ChatImageUpload';
import { useTheme } from '../contexts/ThemeContext';

// Helper function to check if a task is assigned to a user (supports both string and array formats)
function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;
  
  const normalizedUserEmail = userEmail?.toLowerCase().trim() || '';
  if (!normalizedUserEmail) return false;
  
  if (Array.isArray(task.assignedTo)) {
    return task.assignedTo.some(email => email?.toLowerCase().trim() === normalizedUserEmail);
  }
  
  // Backward compatibility: old string format
  return (task.assignedTo?.toLowerCase().trim() || '') === normalizedUserEmail;
}

export default function TaskChatScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { taskId, taskTitle } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [taskData, setTaskData] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const flatRef = useRef();

  // Cargar usuario actual y verificar acceso a la tarea
  useEffect(() => {
    loadCurrentUserAndCheckAccess();
  }, []);

  const loadCurrentUserAndCheckAccess = async () => {
    const result = await getCurrentSession();

    if (result.success) {
      const displayName = result.session.displayName || result.session.email || 'Usuario';
      setCurrentUser(displayName);
      setCurrentUserId(result.session.userId);

      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const task = taskDoc.data();
          setTaskData(task);

          const userRole = result.session.role;
          if (userRole === 'admin' || userRole === 'director' || userRole === 'secretario') {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[TaskChat] Error loading task:', error);
        setHasAccess(false);
      }
    } else {
      setCurrentUser('Usuario');
      setCurrentUserId(null);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const q = query(collection(db, 'tasks', taskId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setMessages(arr);
    }, (err) => {
      if (__DEV__) console.error('[TaskChat] Error listening to messages:', err);
    });

    return () => unsub();
  }, [taskId, hasAccess]);

  const send = async () => {
    if (!text.trim() || !hasAccess) return;

    try {
      // 1. Enviar mensaje al chat
      const msgRef = await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        type: 'text',
        text: text.trim(),
        author: currentUser || 'Usuario',
        createdAt: getServerTimestamp()
      });
      
      // 2. Actualizar lastMessageAt en la tarea para ordenar por actividad
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true
        });
      } catch (updateError) {
        if (__DEV__) console.error('[TaskChat] Error updating task:', updateError);
      }
      
      // 3. Notificar a otros usuarios de la tarea
      try {
        await notifyNewComment(taskId, currentUser || 'Usuario', text.trim());
        
        // Enviar email si el asignado es diferente al que escribe
        if (taskData && taskData.assignedTo && taskData.assignedTo !== currentUserId) {
          await notifyNewChatMessage(
            { id: taskId, title: taskTitle || taskData.title },
            { author: currentUser, text: text.trim() },
            taskData.assignedTo
          );
        }
      } catch (notifyError) {
        if (__DEV__) console.error('[TaskChat] Error notifying:', notifyError);
      }
      
      setText('');
      // scroll opcional
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    } catch (e) {
      if (__DEV__) console.error('[TaskChat] Error sending message:', e);
      Alert.alert('Error', `No se pudo enviar el mensaje: ${e.message}`);
    }
  };

  const handleImageCapture = async (imageData) => {
    if (!hasAccess) return;

    setIsUploadingImage(true);
    try {
      // imageData should contain: { uri, type, name }
      const imgRef = await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        type: 'image',
        imageUrl: imageData.uri,
        imageName: imageData.name,
        author: currentUser || 'Usuario',
        createdAt: getServerTimestamp()
      });
      
      // Actualizar lastMessageAt en la tarea
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true
        });
      } catch (updateError) {
        if (__DEV__) console.error('[TaskChat] Error updating task after image:', updateError);
      }
      
      // Notificar
      try {
        await notifyNewComment(taskId, currentUser || 'Usuario', '[Imagen enviada]');
      } catch (notifyError) {
        if (__DEV__) console.error('[TaskChat] Error notifying about image:', notifyError);
      }
      
      // scroll opcional
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    } catch (e) {
      if (__DEV__) console.error('[TaskChat] Error uploading image:', e);
      Alert.alert('Error', `No se pudo enviar la imagen: ${e.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const renderMessageItem = useCallback(({ item }) => (
    <View style={styles.msgRow}>
      <Text style={styles.msgAuthor}>{item.author || 'Usuario'}</Text>
      {item.type === 'image' ? (
        <TouchableOpacity
          onPress={() => setSelectedImageUrl(item.imageUrl)}
          activeOpacity={0.9}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.msgImage} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.msgText}>{item.text || ''}</Text>
      )}
      <Text style={styles.msgTime}>
        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Sin fecha'}
      </Text>
    </View>
  ), [styles, setSelectedImageUrl]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'padding' })}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
    >
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{taskTitle || 'Chat'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!hasAccess ? (
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={80} color="#C7C7CC" />
          <Text style={styles.noAccessTitle}>Sin acceso</Text>
          <Text style={styles.noAccessText}>
            No tienes permisos para ver este chat
          </Text>
        </View>
      ) : (
        <View style={styles.chatContent}>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.messagesContainer}
            renderItem={renderMessageItem}
            windowSize={10}
            maxToRenderPerBatch={10}
            initialNumToRender={15}
            removeClippedSubviews={true}
            inverted={false}
          />

          <View style={styles.composer}>
            <ChatImageUpload
              onImageCapture={handleImageCapture}
              disabled={isUploadingImage}
            />
            <TextInput
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              style={styles.input}
              multiline
              maxLength={500}
              accessibilityLabel="Escribe un mensaje"
              accessibilityRole="text"
              editable={!isUploadingImage}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!text.trim() || isUploadingImage) && styles.sendButtonDisabled]}
              onPress={send}
              disabled={!text.trim() || isUploadingImage}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Enviar mensaje"
              accessibilityRole="button"
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Modal para ver imagen en pantalla completa */}
      <Modal
        visible={!!selectedImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <TouchableOpacity 
          style={styles.imageModalContainer}
          activeOpacity={1}
          onPress={() => setSelectedImageUrl(null)}
        >
          <TouchableOpacity 
            style={styles.imageModalClose}
            onPress={() => setSelectedImageUrl(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          
          <Text style={styles.imageModalHint}>Toca fuera para cerrar</Text>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  chatContent: {
    flex: 1,
    flexDirection: 'column',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8
  },
  msgRow: {
    marginBottom: 14,
    backgroundColor: theme.card,
    padding: 14,
    borderRadius: 18,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  msgAuthor: {
    fontWeight: '700',
    marginBottom: 6,
    color: theme.primary,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  msgText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  msgImage: {
    width: 220,
    height: 180,
    borderRadius: 14,
    marginVertical: 8
  },
  msgTime: { 
    marginTop: 8, 
    fontSize: 11, 
    color: '#A0A0A0',
    fontWeight: '500'
  },
  composer: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderColor: theme.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
    borderRadius: 22,
    color: theme.text,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: theme.border,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#D0D0D0',
    shadowOpacity: 0.1
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  noAccessTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  noAccessText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  // Estilos para overlay de imagen
  imageOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 6,
  },
  // Estilos para modal de imagen
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.7,
    borderRadius: 12,
  },
  imageModalHint: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  }
});
