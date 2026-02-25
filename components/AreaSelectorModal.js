import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * AreaSelectorModal - Componente premium para seleccionar múltiples áreas
 * Diseño UX/UI profesional con:
 * - Búsqueda y filtrado en tiempo real
 * - Visualización clara de áreas seleccionadas
 * - Categorización por tipo (Secretaría/Dirección)
 * - Animaciones suaves
 * - Mejor uso del espacio
 * - Háptica feedback
 */
export default function AreaSelectorModal({
  visible = false,
  onClose = () => {},
  selectedAreas = [],
  onAreasChange = () => {},
  allAreas = [],
  theme = {},
  isDark = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [animValue] = useState(new Animated.Value(0));

  // Mapeo de áreas a tipo
  const areaTypeMap = useMemo(() => ({
    'Secretaría General Municipal': 'secretaria',
    'Secretaría de Tesorería Municipal': 'secretaria',
    'Secretaría de Obras Públicas y Desarrollo Urbano': 'secretaria',
    'Secretaría de Planeación y Evaluación': 'secretaria',
    'Secretaría de Bienestar Social': 'secretaria',
    'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil': 'secretaria',
    'Secretaría de Desarrollo de Pueblos y Comunidades Indígenas': 'secretaria',
    'Secretaría de Desarrollo Económico y Turismo': 'secretaria',
    'Secretaría Ejecutiva de SIPINNA': 'secretaria',
    'Dirección Jurídica': 'direccion',
    'Dirección de Comunicación Social y Marketing Digital': 'direccion',
    'Dirección de Gobierno': 'direccion',
    'Dirección de Reglamentos, Comercio, Mercado y Espectáculos': 'direccion',
    'Dirección de Recursos Materiales y Patrimonio': 'direccion',
    'Dirección de Atención al Migrante': 'direccion',
    'Dirección de Enlace de la Secretaría de Relaciones Exteriores': 'direccion',
    'Dirección de Control y Seguimiento de Egresos': 'direccion',
    'Dirección de Ingresos y Estrategias de Recaudación': 'direccion',
    'Dirección de Recursos Humanos y Nómina': 'direccion',
    'Dirección de Cuenta Pública': 'direccion',
    'Dirección de Catastro': 'direccion',
    'Dirección de Administración': 'direccion',
    'Dirección de Medio Ambiente y Desarrollo Sostenible': 'direccion',
    'Dirección de Obras Públicas': 'direccion',
    'Dirección de Servicios Municipales': 'direccion',
    'Dirección de Servicios Públicos y Limpias': 'direccion',
    'Dirección de Desarrollo Urbano y Ordenamiento Territorial': 'direccion',
    'Dirección Técnica de Planeación y Evaluación': 'direccion',
    'Dirección de Tecnologías de la Información': 'direccion',
    'Dirección de Educación': 'direccion',
    'Dirección de Salud': 'direccion',
    'Dirección de Programas Sociales': 'direccion',
    'Dirección del Deporte': 'direccion',
    'Dirección de Cultura': 'direccion',
    'Dirección de Prevención del Delito': 'direccion',
    'Dirección de Protección Civil y Bomberos': 'direccion',
    'Dirección Administrativa (Seguridad Pública)': 'direccion',
    'Dirección Preventiva de Tránsito Municipal y Auxilio Vial': 'direccion',
    'Dirección de Desarrollo Económico': 'direccion',
    'Dirección de Desarrollo Agropecuario y Proyectos Productivos': 'direccion',
    'Dirección de Turismo': 'direccion',
  }), []);

  // Colores por tipo de área
  const getAreaColor = useCallback((areaType) => {
    if (areaType === 'secretaria') return '#9F2241';
    return '#0EA5E9';
  }, []);

  const getAreaIcon = useCallback((areaType) => {
    if (areaType === 'secretaria') return 'briefcase';
    return 'folder-outline';
  }, []);

  // Filtrar y agrupar áreas
  const groupedAreas = useMemo(() => {
    let filtered = allAreas;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allAreas.filter(area => 
        area.toLowerCase().includes(query)
      );
    }

    // Agrupar por tipo
    const grouped = {
      secretaria: filtered.filter(a => areaTypeMap[a] === 'secretaria'),
      direccion: filtered.filter(a => areaTypeMap[a] === 'direccion')
    };

    return grouped;
  }, [allAreas, searchQuery, areaTypeMap]);

  const toggleArea = useCallback((area) => {
    const newAreas = selectedAreas.includes(area)
      ? selectedAreas.filter(a => a !== area)
      : [...selectedAreas, area];
    onAreasChange(newAreas);
  }, [selectedAreas, onAreasChange]);

  const totalFiltered = (groupedAreas.secretaria?.length || 0) + (groupedAreas.direccion?.length || 0);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Renderizar sección de áreas
  const renderAreaSection = (title, areaList, type) => {
    if (!areaList || areaList.length === 0) return null;

    const color = getAreaColor(type);
    const badgeColor = type === 'secretaria' ? '#9F2241' : '#0EA5E9';

    return (
      <View key={type} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBadge, { backgroundColor: `${badgeColor}20` }]}>
            <Ionicons 
              name={type === 'secretaria' ? 'briefcase' : 'folder'} 
              size={16} 
              color={badgeColor} 
            />
            <Text style={[styles.sectionTitle, { color: badgeColor }]}>
              {title}
            </Text>
            <View style={[styles.sectionCount, { backgroundColor: badgeColor }]}>
              <Text style={styles.sectionCountText}>{areaList.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.areaItemsContainer}>
          {areaList.map((area) => {
            const isSelected = selectedAreas.includes(area);
            return (
              <TouchableOpacity
                key={area}
                onPress={() => toggleArea(area)}
                style={[
                  styles.areaItemBox,
                  isSelected && [styles.areaItemBoxActive, { backgroundColor: `${color}15`, borderColor: color }]
                ]}
                activeOpacity={0.6}
              >
                <View style={styles.areaItemContent}>
                  <View style={[styles.areaItemIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={getAreaIcon(type)} size={18} color={color} />
                  </View>
                  <Text style={[styles.areaItemText, isSelected ? { color: color, fontWeight: '700' } : { color: theme.text }]}>
                    {area.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                  </Text>
                </View>
                
                {isSelected && (
                  <View style={[styles.areaItemCheckmark, { backgroundColor: color }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {/* Handle indicador */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }]} />
          </View>
          
          {/* Header Premium */}
          <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Seleccionar Áreas</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  {selectedAreas.length} seleccionada{selectedAreas.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <View style={[styles.statBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.statBadgeText, { color: theme.primary }]}>
                  {selectedAreas.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Search Box Mejorado */}
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.searchBox, { 
              backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
              borderColor: theme.border 
            }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder="Buscar área..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor={theme.primary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Info de resultados */}
            {searchQuery.length > 0 && (
              <Text style={[styles.resultsInfo, { color: theme.textSecondary }]}>
                {totalFiltered} {totalFiltered === 1 ? 'resultado' : 'resultados'}
              </Text>
            )}
          </View>

          {/* Áreas Seleccionadas Preview */}
          {selectedAreas.length > 0 && (
            <View style={styles.selectedPreview}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedList}>
                {selectedAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[styles.selectedPill, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.selectedPillText} numberOfLines={1}>
                      {area.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                    </Text>
                    <Ionicons name="close-small" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content - Áreas disponibles */}
          <ScrollView 
            style={styles.listContainer}
            showsVerticalScrollIndicator={true}
            indicatorStyle={isDark ? 'white' : 'black'}
          >
            {totalFiltered > 0 ? (
              <View style={styles.areasWrapper}>
                {renderAreaSection('Secretarías', groupedAreas.secretaria, 'secretaria')}
                {renderAreaSection('Direcciones', groupedAreas.direccion, 'direccion')}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  Sin resultados
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                  No encontramos áreas que coincidan con "{searchQuery}"
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer con botones */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.buttonSecondary, { borderColor: theme.border }]}
              onPress={() => {
                setSearchQuery('');
                onAreasChange([]);
              }}
              disabled={selectedAreas.length === 0}
            >
              <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.buttonText, { color: theme.text }]}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.buttonTextPrimary}>
                Listo ({selectedAreas.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    height: Dimensions.get('window').height * 0.88,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  
  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  headerStats: {
    marginLeft: 12,
  },
  statBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 48,
    alignItems: 'center',
  },
  statBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resultsInfo: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginLeft: 4,
  },

  // Selected Preview
  selectedPreview: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.05)' : 'rgba(159, 34, 65, 0.03)',
  },
  selectedList: {
    maxHeight: 56,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 110,
    justifyContent: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  // List Container
  listContainer: {
    flex: 1,
  },
  areasWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Area Items
  areaItemsContainer: {
    gap: 10,
  },
  areaItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'space-between',
  },
  areaItemBoxActive: {
    borderWidth: 2,
    backgroundColor: 'transparent',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  areaItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  areaItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaItemText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  areaItemCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // Empty State
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 240,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 16,
    borderTopWidth: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
  },
  buttonPrimary: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
