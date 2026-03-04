// components/SuggestedDirectorsPanel.js
// Panel que muestra directores sugeridos basado en secretarios seleccionados
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { SECRETARIAS_DIRECCIONES, getDireccionesBySecretaria } from '../config/areas';

export default function SuggestedDirectorsPanel({
  selectedUsers = [],
  onAddUser = () => {},
  theme = {}
}) {
  const [suggestedDirectors, setSuggestedDirectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  // Cargar directores sugeridos cuando cambien los usuarios seleccionados
  useEffect(() => {
    loadSuggestedDirectors();
  }, [selectedUsers]);

  const loadSuggestedDirectors = async () => {
    try {
      setLoading(true);

      // Obtener solo secretarios seleccionados
      const secretariosSeleccionados = selectedUsers.filter(u => u.role === 'secretario');
      
      if (secretariosSeleccionados.length === 0) {
        setSuggestedDirectors([]);
        return;
      }

      // Obtener las direcciones reales de los secretarios usando el mapeo
      const direccionesDeSecretarios = new Set();
      
      for (const secretario of secretariosSeleccionados) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', secretario.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const secretarioData = snapshot.docs[0].data();
            const areaSecretario = secretarioData.area || '';
            
            // Usar el mapeo oficial de config/areas.js
            const direcciones = getDireccionesBySecretaria(areaSecretario);
            
            if (direcciones.length > 0) {
              direcciones.forEach(dir => direccionesDeSecretarios.add(dir));
            } else {
              // Búsqueda por coincidencia parcial
              for (const [secretaria, dirs] of Object.entries(SECRETARIAS_DIRECCIONES)) {
                if (areaSecretario.includes('Desarrollo Económico') && secretaria.includes('Desarrollo Económico')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Obras Públicas') && secretaria.includes('Obras Públicas')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Bienestar') && secretaria.includes('Bienestar')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('General') && secretaria.includes('General')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Tesorería') && secretaria.includes('Tesorería')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Planeación') && secretaria.includes('Planeación')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Seguridad') && secretaria.includes('Seguridad')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                } else if (areaSecretario.includes('Pueblos') && secretaria.includes('Pueblos')) {
                  dirs.forEach(dir => direccionesDeSecretarios.add(dir));
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error cargando áreas del secretario ${secretario.email}:`, error);
        }
      }

      // Si no hay direcciones, no hay directores que mostrar
      if (direccionesDeSecretarios.size === 0) {
        setSuggestedDirectors([]);
        return;
      }

      // Obtener directores cuya área coincida con las direcciones
      const directoresRef = collection(db, 'users');
      const qDirectores = query(
        directoresRef,
        where('role', '==', 'director'),
        where('active', '==', true)
      );
      
      const snapshotDirectores = await getDocs(qDirectores);
      const directors = [];

      snapshotDirectores.forEach(doc => {
        const userData = doc.data();
        // Verificar si el área del director coincide con alguna dirección del secretario
        if (direccionesDeSecretarios.has(userData.area)) {
          directors.push({ id: doc.id, ...userData });
        }
      });
      
      // Filtrar los que ya están seleccionados
      const selectedEmails = new Set(selectedUsers.map(u => u.email?.toLowerCase()));
      const unselectedDirectors = directors.filter(
        d => !selectedEmails.has(d.email?.toLowerCase())
      );
      
      setSuggestedDirectors(unselectedDirectors);
    } catch (error) {
      console.error('Error cargando directores sugeridos:', error);
      setSuggestedDirectors([]);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si no hay secretarios seleccionados
  if (!selectedUsers.some(u => u.role === 'secretario')) {
    return null;
  }

  if (suggestedDirectors.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={theme?.primary || '#9F2241'} />
        <Text style={[styles.headerText, { color: theme?.text || '#333' }]}>
          Directores sugeridos
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme?.primary || '#9F2241'} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.directorsScroll}
          contentContainerStyle={styles.directorsContainer}
        >
          {suggestedDirectors.map(director => (
            <DirectorCard
              key={director.id}
              director={director}
              onAdd={() => onAddUser({
                email: director.email,
                displayName: director.displayName,
                role: director.role,
                area: director.area
              })}
              theme={theme}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Tarjeta individual de director sugerido
const DirectorCard = ({ director, onAdd, theme }) => {
  const { isDark } = useTheme();
  
  const getAbbreviation = (name) => {
    const parts = name?.split(' ') || [];
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name?.substring(0, 2).toUpperCase() || '?';
  };

  return (
    <View style={[styles.directorCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
      <View style={[styles.avatar, { backgroundColor: theme?.primary + '30' || '#9F224130' }]}>
        <Text style={[styles.avatarText, { color: theme?.primary || '#9F2241' }]}>
          {getAbbreviation(director.displayName)}
        </Text>
      </View>

      <Text style={[styles.directorName, { color: theme?.text || '#333' }]} numberOfLines={2}>
        {director.displayName}
      </Text>

      <Text style={[styles.directorArea, { color: theme?.textSecondary || '#666' }]} numberOfLines={1}>
        {director.area}
      </Text>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme?.primary || '#9F2241' }]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  directorsScroll: {
    paddingHorizontal: 16,
  },
  directorsContainer: {
    gap: 12,
  },
  directorCard: {
    width: 120,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  directorName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  directorArea: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
