// screens/TaskChatScreen.js
// Chat simple por tarea usando Firestore. Colección: tasks/{taskId}/messages
// Requiere que configures firebase.js con tu proyecto.
// Funcionalidad mínima: lista de mensajes en tiempo real + enviar mensaje de texto.

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, getServerTimestamp } from '../firebase';
import { getCurrentSession } from '../services/authFirestore';
import { notifyNewComment } from '../services/fcm';
import { notifyNewChatMessage } from '../services/emailNotifications';
import ChatImageUpload from '../components/ChatImageUpload';

// Helper function to check if a task is assigned to a user (supports both string and array formats)
function isTaskAssignedToUser(task, userEmail) {
  if (!task.assignedTo) return false;
  if (Array.isArray(task.assignedTo)) {
    return task.assignedTo.includes(userEmail.toLowerCase());
  }
  // Backward compatibility: old string format
  return task.assignedTo.toLowerCase() === userEmail.toLowerCase();
}

export default function TaskChatScreen({ route, navigation }) {
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
    console.log('[TaskChat] Session result:', result);
    
    if (result.success) {
      const displayName = result.session.displayName || result.session.email || 'Usuario';
      setCurrentUser(displayName);
      setCurrentUserId(result.session.userId);
      console.log('[TaskChat] Current user:', displayName, 'userId:', result.session.userId);
      
      // Cargar datos de la tarea para verificar acceso
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const task = taskDoc.data();
          setTaskData(task);
          console.log('[TaskChat] Task loaded, assignedTo:', task.assignedTo);
          
          // Verificar acceso según rol
          const userRole = result.session.role;
          const userEmail = result.session.email;
          const userDepartment = result.session.department;
          
          console.log('[TaskChat] Checking access - role:', userRole, 'email:', userEmail, 'dept:', userDepartment);
          
          if (userRole === 'admin') {
            console.log('[TaskChat] Access granted - admin');
            setHasAccess(true);
          } else if (userRole === 'jefe' && task.area === userDepartment) {
            console.log('[TaskChat] Access granted - jefe in correct area');
            setHasAccess(true);
          } else if (userRole === 'operativo' && isTaskAssignedToUser(task, userEmail)) {
            console.log('[TaskChat] Access granted - operativo assigned to task');
            setHasAccess(true);
          } else {
            console.log('[TaskChat] Access denied - no matching criteria');
            setHasAccess(false);
          }
        }
      } catch (error) {
        console.error('[TaskChat] Error loading task:', error);
        setHasAccess(false);
      }
    } else {
      console.log('[TaskChat] Session failed:', result);
      setCurrentUser('Usuario');
      setCurrentUserId(null);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    // Solo escuchar mensajes si tiene acceso
    if (!hasAccess) {
      console.log('[TaskChat] Not loading messages - no access');
      return;
    }
    
    console.log('[TaskChat] Setting up message listener for taskId:', taskId);
    // Listener en tiempo real de la colección de mensajes de la tarea
    const q = query(collection(db, 'tasks', taskId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      console.log('[TaskChat] Messages updated:', arr.length, 'messages');
      setMessages(arr);
    }, (err) => {
      console.error('[TaskChat] Error listening to messages:', err);
    });

    return () => unsub();
  }, [taskId, hasAccess]);

  const send = async () => {
    if (!text.trim() || !hasAccess) {
      console.log('[TaskChat] Send blocked - text.trim():', !!text.trim(), 'hasAccess:', hasAccess);
      return;
    }
    
    console.log('[TaskChat] Attempting to send message:', text.trim());
    try {
      // 1. Enviar mensaje al chat
      const msgRef = await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        type: 'text',
        text: text.trim(),
        author: currentUser || 'Usuario',
        createdAt: getServerTimestamp()
      });
      console.log('[TaskChat] Message sent successfully:', msgRef.id);
      
      // 2. Actualizar lastMessageAt en la tarea para ordenar por actividad
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true
        });
      } catch (updateError) {
        console.error('[TaskChat] Error updating task:', updateError);
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
        console.error('[TaskChat] Error notifying:', notifyError);
      }
      
      setText('');
      // scroll opcional
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    } catch (e) {
      console.error('[TaskChat] Error sending message:', e);
      Alert.alert('Error', `No se pudo enviar el mensaje: ${e.message}`);
    }
  };

  const handleImageCapture = async (imageData) => {
    if (!hasAccess) {
      console.log('[TaskChat] Image upload blocked - hasAccess:', hasAccess);
      return;
    }
    
    console.log('[TaskChat] Attempting to upload image:', imageData.uri);
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
      console.log('[TaskChat] Image uploaded successfully:', imgRef.id);
      
      // Actualizar lastMessageAt en la tarea
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario',
          hasUnreadMessages: true
        });
      } catch (updateError) {
        console.error('[TaskChat] Error updating task after image:', updateError);
      }
      
      // Notificar
      try {
        await notifyNewComment(taskId, currentUser || 'Usuario', '[Imagen enviada]');
      } catch (notifyError) {
        console.error('[TaskChat] Error notifying about image:', notifyError);
      }
      
      // scroll opcional
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    } catch (e) {
      console.error('[TaskChat] Error uploading image:', e);
      Alert.alert('Error', `No se pudo enviar la imagen: ${e.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ios:'padding', android:undefined})}>
      <View style={[styles.headerBar, { backgroundColor: '#9F2241' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
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
            renderItem={({ item }) => (
              <View key={item.id} style={styles.msgRow}>
                <Text style={styles.msgAuthor}>{item.author || 'Usuario'}</Text>
                {item.type === 'image' ? (
                  <TouchableOpacity 
                    onPress={() => setSelectedImageUrl(item.imageUrl)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.msgImage}
                      resizeMode="cover"
                    />
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
            )}
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
            />
            <TouchableOpacity 
              style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
              onPress={send}
              disabled={!text.trim()}
              activeOpacity={0.7}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  chatContent: {
    flex: 1,
    flexDirection: 'column'
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
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
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
    backgroundColor: '#FFFFFF', 
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
    borderColor: 'rgba(0,0,0,0.04)'
  },
  msgAuthor: { 
    fontWeight: '700', 
    marginBottom: 6, 
    color: '#9F2241',
    fontSize: 13,
    letterSpacing: 0.2
  },
  msgText: { 
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400'
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E8E8E8',
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
    backgroundColor: '#F5F5F5', 
    borderRadius: 22,
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9F2241',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6
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
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: -0.6
  },
  noAccessText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500'
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
