// components/MultiUserSelector.js
// Selector de múltiples usuarios para asignaciones
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function MultiUserSelector({ 
  selectedUsers = [], 
  onSelectionChange = () => {},
  role = 'admin',
  area = null
}) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar usuarios disponibles
  useEffect(() => {
    loadUsers();
  }, [role, area]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let usersList = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        
        // Solo admin puede asignar a todos
        // Jefe solo puede asignar de su área
        if (role === 'admin' || userData.department === area) {
          // Excluir admin de la lista para operativos
          if (userData.role !== 'admin' || role === 'admin') {
            usersList.push({
              id: doc.id,
              email: userData.email,
              displayName: userData.displayName,
              role: userData.role,
              department: userData.department,
              avatar: userData.avatar || null
            });
          }
        }
      });
      
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const toggleUserSelection = (user) => {
    const isSelected = selectedUsers.some(u => u.email === user.email);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedUsers.filter(u => u.email !== user.email);
    } else {
      newSelection = [...selectedUsers, user];
    }
    
    onSelectionChange(newSelection);
  };

  const isUserSelected = (email) => {
    return selectedUsers.some(u => u.email === email);
  };

  const removeSelectedUser = (email) => {
    const newSelection = selectedUsers.filter(u => u.email !== email);
    onSelectionChange(newSelection);
  };

  const UserItem = ({ user, isSelected }) => (
    <TouchableOpacity
      style={[styles.userItem, isSelected && styles.userItemSelected]}
      onPress={() => toggleUserSelection(user)}
    >
      <View style={styles.userAvatarContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userRoleBadge}>
          <Text style={styles.userRoleText}>
            {user.role === 'operativo' ? '👤 Operativo' : '👔 ' + user.role}
          </Text>
        </View>
      </View>
      
      <View style={styles.checkbox}>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#9F2241" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SelectedUserTag = ({ user }) => (
    <View style={styles.selectedTag}>
      <Text style={styles.selectedTagText} numberOfLines={1}>
        {user.displayName}
      </Text>
      <TouchableOpacity
        onPress={() => removeSelectedUser(user.email)}
        style={styles.removeTagButton}
      >
        <Ionicons name="close-circle" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Vista de usuarios seleccionados */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>Asignados ({selectedUsers.length})</Text>
          <View style={styles.selectedTags}>
            {selectedUsers.map(user => (
              <SelectedUserTag key={user.email} user={user} />
            ))}
          </View>
        </View>
      )}

      {/* Botón para abrir selector */}
      <TouchableOpacity
        style={[styles.selectorButton, selectedUsers.length > 0 && styles.selectorButtonActive]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={20} color="#9F2241" />
        <Text style={styles.selectorButtonText}>
          {selectedUsers.length === 0 ? 'Asignar a' : 'Agregar más'}
        </Text>
      </TouchableOpacity>

      {/* Modal selector */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Asignados</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o email..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de usuarios */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando usuarios...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchText ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={({ item }) => (
                <UserItem
                  user={item}
                  isSelected={isUserSelected(item.email)}
                />
              )}
              keyExtractor={item => item.email}
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled={true}
            />
          )}

          {/* Footer con botón de confirmación */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>
                Confirmar ({selectedUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  
  selectedContainer: {
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9F2241',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  selectedTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 120,
  },
  removeTagButton: {
    padding: 2,
  },

  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9F2241',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
  },
  selectorButtonActive: {
    backgroundColor: '#FFF9F5',
  },
  selectorButtonText: {
    color: '#9F2241',
    fontSize: 14,
    fontWeight: '600',
  },

  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#9F2241',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#333',
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  userItemSelected: {
    backgroundColor: '#F5E6E6',
    borderLeftWidth: 4,
    borderLeftColor: '#9F2241',
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8D4D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#9F2241',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userRoleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
  },
  userRoleText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  checkbox: {
    marginLeft: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },

  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  confirmButton: {
    backgroundColor: '#9F2241',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
