// screens/DebugScreen.js - Para verificar credenciales en runtime
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { db, app } from '../firebase';

export default function DebugScreen() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    setConfig({
      projectId: app?.options?.projectId || 'desconocido',
      authDomain: app?.options?.authDomain || 'desconocido',
      apiKey: app?.options?.apiKey?.substring(0, 10) + '...',
      dbEndpoint: db?._databaseId?.database || 'desconocido',
      firebaseInitialized: !!app,
      firestoreInitialized: !!db
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 DEBUG - Configuración Firebase</Text>
      <ScrollView style={styles.scrollView}>
        {config ? (
          Object.entries(config).map(([key, value]) => (
            <View key={key} style={styles.item}>
              <Text style={styles.label}>{key}:</Text>
              <Text style={styles.value}>{String(value)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.loading}>Cargando...</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  scrollView: { flex: 1 },
  item: { 
    backgroundColor: '#fff', 
    padding: 12, 
    marginBottom: 10, 
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#9F2241'
  },
  label: { fontSize: 12, fontWeight: '600', color: '#666' },
  value: { fontSize: 11, color: '#333', marginTop: 4, fontFamily: 'monospace' },
  loading: { fontSize: 14, color: '#999' }
});
