// components/OrgChartEditor.js
// Editor visual del organigrama municipal con persistencia en Firestore en tiempo real

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SECRETARIAS, getDireccionesBySecretaria } from '../config/areas';
import { useTheme } from '../contexts/ThemeContext';

const ORG_DOC_REF = () => doc(db, 'metadata', 'orgStructure');

function buildFromConfig() {
  return {
    secretarias: SECRETARIAS.map(nombre => ({
      nombre,
      direcciones: getDireccionesBySecretaria(nombre),
    })),
  };
}

export default function OrgChartEditor({ adminName = 'Admin' }) {
  const { theme, isDark } = useTheme();
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editingDir, setEditingDir] = useState(null); // { secIdx, dirIdx, value }
  const [addingDir, setAddingDir] = useState(null);   // { secIdx, value }
  const [saving, setSaving] = useState(false);

  // Suscribirse a Firestore en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(
      ORG_DOC_REF(),
      (snap) => {
        if (snap.exists()) {
          setOrgData(snap.data());
        } else {
          // Primera vez: poblar desde config/areas.js
          const initial = buildFromConfig();
          setOrgData(initial);
          setDoc(ORG_DOC_REF(), initial).catch(() => {});
        }
        setLoading(false);
      },
      () => {
        setOrgData(buildFromConfig());
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const persist = useCallback(async (newData) => {
    setSaving(true);
    try {
      await setDoc(ORG_DOC_REF(), newData);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleExpand = (i) => setExpanded(e => ({ ...e, [i]: !e[i] }));

  const confirmRename = async (secIdx, dirIdx) => {
    const name = editingDir?.value?.trim();
    if (!name) { setEditingDir(null); return; }
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones[dirIdx] = name;
    setOrgData(newData);
    setEditingDir(null);
    await persist(newData);
  };

  const confirmAdd = async (secIdx) => {
    const name = addingDir?.value?.trim();
    setAddingDir(null);
    if (!name) return;
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones.push(name);
    setOrgData(newData);
    await persist(newData);
  };

  const removeDir = async (secIdx, dirIdx) => {
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones.splice(dirIdx, 1);
    setOrgData(newData);
    await persist(newData);
  };

  const cardBg = isDark ? '#1E1E2E' : '#FFFFFF';
  const borderCol = isDark ? '#2E2E3E' : '#E5E7EB';
  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#8B0000" />
        <Text style={[styles.loadingText, { color: subtextCol }]}>Cargando organigrama...</Text>
      </View>
    );
  }

  if (!orgData) return null;

  return (
    <View style={styles.root}>
      {/* Nodo Admin */}
      <View style={styles.adminNodeWrap}>
        <View style={styles.adminNode}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.adminRole}>ADMIN</Text>
            <Text style={styles.adminName}>{adminName}</Text>
          </View>
        </View>
        <View style={styles.vertConnector} />
      </View>

      {/* Secretarías */}
      {orgData.secretarias.map((sec, secIdx) => {
        const isOpen = !!expanded[secIdx];
        const dirCount = sec.direcciones?.length ?? 0;

        return (
          <View key={secIdx} style={styles.secWrapper}>
            {/* Línea lateral */}
            <View style={styles.leftTrack}>
              <View style={[styles.horzDash, { backgroundColor: '#8B0000' }]} />
            </View>

            <View style={[styles.secCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              {/* Header de la secretaría */}
              <TouchableOpacity
                style={styles.secHeader}
                onPress={() => toggleExpand(secIdx)}
                activeOpacity={0.7}
              >
                <View style={styles.secBadge}>
                  <Ionicons name="business-outline" size={14} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.secName, { color: theme.text }]} numberOfLines={2}>
                    {sec.nombre}
                  </Text>
                  <Text style={[styles.secMeta, { color: subtextCol }]}>
                    {dirCount} dirección{dirCount !== 1 ? 'es' : ''}
                  </Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                  size={20}
                  color="#8B0000"
                />
              </TouchableOpacity>

              {/* Direcciones adscritas */}
              {isOpen && (
                <View style={[styles.dirsBox, { borderTopColor: borderCol }]}>
                  {(sec.direcciones || []).map((dir, dirIdx) => (
                    <View key={dirIdx} style={[styles.dirRow, { borderBottomColor: borderCol }]}>
                      <View style={styles.dirDot} />
                      {editingDir?.secIdx === secIdx && editingDir?.dirIdx === dirIdx ? (
                        <TextInput
                          style={[styles.dirInput, { color: theme.text, borderColor: '#8B0000', backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
                          value={editingDir.value}
                          onChangeText={v => setEditingDir(e => ({ ...e, value: v }))}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => confirmRename(secIdx, dirIdx)}
                          onBlur={() => confirmRename(secIdx, dirIdx)}
                        />
                      ) : (
                        <Text style={[styles.dirName, { color: theme.text }]} numberOfLines={2}>
                          {dir}
                        </Text>
                      )}
                      <View style={styles.dirActions}>
                        <TouchableOpacity
                          onPress={() => setEditingDir({ secIdx, dirIdx, value: dir })}
                          style={styles.iconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color="#8B0000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeDir(secIdx, dirIdx)}
                          style={[styles.iconBtn, { marginLeft: 4 }]}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Agregar dirección */}
                  {addingDir?.secIdx === secIdx ? (
                    <View style={[styles.dirRow, { borderBottomColor: 'transparent' }]}>
                      <View style={[styles.dirDot, { backgroundColor: '#8B0000' }]} />
                      <TextInput
                        style={[styles.dirInput, { flex: 1, color: theme.text, borderColor: '#8B0000', backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
                        value={addingDir.value}
                        onChangeText={v => setAddingDir(e => ({ ...e, value: v }))}
                        placeholder="Nombre de la nueva dirección..."
                        placeholderTextColor={subtextCol}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => confirmAdd(secIdx)}
                        onBlur={() => confirmAdd(secIdx)}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => setAddingDir({ secIdx, value: '' })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#8B0000" />
                      <Text style={styles.addBtnText}>Agregar dirección</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Indicador de guardado */}
      {saving && (
        <View style={styles.savingBadge}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.savingText}>Guardando...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 24,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },

  // Nodo Admin
  adminNodeWrap: {
    alignItems: 'center',
    marginBottom: 0,
  },
  adminNode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  adminRole: {
    color: '#FECACA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  adminName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  vertConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#8B0000',
    opacity: 0.4,
  },

  // Secretarías
  secWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 16,
  },
  leftTrack: {
    width: 24,
    paddingTop: 18,
    alignItems: 'flex-end',
    marginRight: 0,
  },
  horzDash: {
    height: 2,
    width: 16,
    opacity: 0.4,
    borderRadius: 1,
  },
  secCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  secName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  secMeta: {
    fontSize: 11,
    marginTop: 1,
  },

  // Direcciones
  dirsBox: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dirDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B0000',
    opacity: 0.5,
    marginRight: 8,
    flexShrink: 0,
  },
  dirName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  dirInput: {
    flex: 1,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 2,
    marginRight: 4,
  },
  dirActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
  iconBtn: {
    padding: 3,
  },

  // Agregar dirección
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    color: '#8B0000',
    fontWeight: '500',
  },

  // Badge de guardado
  savingBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,0,0,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  savingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
