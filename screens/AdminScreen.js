// screens/AdminScreen.js
// Pantalla de administración para gestionar usuarios y roles
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLES = {
  ADMIN: { name: 'Administrador', color: '#FF3B30', icon: '👑' },
  MEMBER: { name: 'Miembro', color: '#007AFF', icon: '👤' },
  GUEST: { name: 'Invitado', color: '#8E8E93', icon: '👁️' }
};

const USERS_KEY = '@todo_users_v1';

export default function AdminScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await AsyncStorage.getItem(USERS_KEY);
      if (data) {
        setUsers(JSON.parse(data));
      } else {
        // Usuarios por defecto
        const defaultUsers = [
          { id: '1', name: 'Admin Principal', email: 'admin@todo.com', role: 'ADMIN', createdAt: Date.now() },
          { id: '2', name: 'Usuario Demo', email: 'demo@todo.com', role: 'MEMBER', createdAt: Date.now() }
        ];
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('@current_user');
      setCurrentUser(user || 'Admin Principal');
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
    }
  };

  const saveUsers = async (newUsers) => {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Error guardando usuarios:', error);
    }
  };

  const addUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const newUser = {
      id: String(Date.now()),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: selectedRole,
      createdAt: Date.now()
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    setNewUserName('');
    setNewUserEmail('');
    setSelectedRole('MEMBER');
    setShowAddModal(false);
    Alert.alert('Éxito', 'Usuario agregado correctamente');
  };

  const changeRole = (userId, newRole) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    );
    saveUsers(updatedUsers);
    Alert.alert('Éxito', 'Rol actualizado correctamente');
  };

  const deleteUser = (userId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updatedUsers = users.filter(u => u.id !== userId);
            saveUsers(updatedUsers);
          }
        }
      ]
    );
  };

  const renderUserCard = (user) => {
    const role = ROLES[user.role];
    const isCurrentUser = user.name === currentUser;

    return (
      <View key={user.id} style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[role.color, role.color + 'CC']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              {isCurrentUser && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>TÚ</Text></View>}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: role.color + '15' }]}>
            <Text style={styles.roleIcon}>{role.icon}</Text>
            <Text style={[styles.roleText, { color: role.color }]}>{role.name}</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <Text style={styles.actionsLabel}>Cambiar rol:</Text>
          <View style={styles.roleButtons}>
            {Object.keys(ROLES).map(roleKey => (
              <TouchableOpacity
                key={roleKey}
                style={[
                  styles.roleButton,
                  user.role === roleKey && styles.roleButtonActive,
                  { borderColor: ROLES[roleKey].color }
                ]}
                onPress={() => changeRole(user.id, roleKey)}
                disabled={isCurrentUser && roleKey !== 'ADMIN'}
              >
                <Text style={[
                  styles.roleButtonText,
                  user.role === roleKey && { color: '#fff' }
                ]}>
                  {ROLES[roleKey].icon}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!isCurrentUser && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteUser(user.id)}
            >
              <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.heading}>Administración</Text>
        <Text style={styles.subheading}>Gestiona usuarios y permisos</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Usuarios</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === 'ADMIN').length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === 'MEMBER').length}</Text>
            <Text style={styles.statLabel}>Miembros</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonText}>+ Agregar Usuario</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.usersList}>
          {users.map(renderUserCard)}
        </View>
      </ScrollView>

      {/* Modal para agregar usuario */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Usuario</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor="#C7C7CC"
              value={newUserName}
              onChangeText={setNewUserName}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#C7C7CC"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Rol:</Text>
            <View style={styles.roleSelector}>
              {Object.keys(ROLES).map(roleKey => (
                <TouchableOpacity
                  key={roleKey}
                  style={[
                    styles.roleSelectorButton,
                    selectedRole === roleKey && styles.roleSelectorButtonActive,
                    { borderColor: ROLES[roleKey].color }
                  ]}
                  onPress={() => setSelectedRole(roleKey)}
                >
                  <Text style={styles.roleIcon}>{ROLES[roleKey].icon}</Text>
                  <Text style={styles.roleSelectorText}>{ROLES[roleKey].name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addUser}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Agregar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  heading: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 8
  },
  subheading: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500'
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#667eea',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  addButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  addButtonGradient: {
    padding: 18,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  usersList: {
    gap: 16
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  currentBadge: {
    position: 'absolute',
    bottom: -4,
    right: 12,
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500'
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6
  },
  roleIcon: {
    fontSize: 16
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  userActions: {
    gap: 12
  },
  actionsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  roleButtonActive: {
    backgroundColor: '#667eea'
  },
  roleButtonText: {
    fontSize: 20
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 24,
    letterSpacing: -0.5
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  roleSelector: {
    gap: 10,
    marginBottom: 24
  },
  roleSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    gap: 12
  },
  roleSelectorButtonActive: {
    backgroundColor: '#F8F9FA'
  },
  roleSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden'
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6E6E73'
  },
  confirmButton: {},
  confirmButtonGradient: {
    padding: 16,
    alignItems: 'center'
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
