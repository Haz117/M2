// screens/LandingScreen.js
// Pantalla de bienvenida con opción de descarga
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDownloadAPK = () => {
    // Actualiza este link cuando tengas el APK
    const apkUrl = 'https://expo.dev/artifacts/eas/ACTUALIZAR-CON-TU-LINK.apk';
    Linking.openURL(apkUrl);
  };

  const handleOpenWeb = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="checkmark-done" size={80} color="#FFF" />
            </View>
          </View>

          {/* Título */}
          <Text style={styles.title}>TodoApp</Text>
          <Text style={styles.subtitle}>Gestiona tus tareas con el poder de MORENA</Text>

          {/* Características */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="people" size={24} color="#FFF" />
              <Text style={styles.featureText}>Sistema de roles y permisos</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sync" size={24} color="#FFF" />
              <Text style={styles.featureText}>Sincronización en tiempo real</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={24} color="#FFF" />
              <Text style={styles.featureText}>Tablero Kanban y reportes</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="chatbubbles" size={24} color="#FFF" />
              <Text style={styles.featureText}>Chat por tarea</Text>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            {/* Botón Web */}
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]} 
              onPress={handleOpenWeb}
              activeOpacity={0.8}
            >
              <Ionicons name="globe" size={24} color="#9F2241" />
              <Text style={styles.buttonTextPrimary}>Usar App Web</Text>
            </TouchableOpacity>

            {/* Botón APK - Solo móvil */}
            {Platform.OS === 'android' && (
              <TouchableOpacity 
                style={[styles.button, styles.buttonSecondary]} 
                onPress={handleDownloadAPK}
                activeOpacity={0.8}
              >
                <Ionicons name="download" size={24} color="#FFF" />
                <Text style={styles.buttonTextSecondary}>Descargar APK</Text>
              </TouchableOpacity>
            )}

            {/* Para iOS y Web mostrar link alternativo */}
            {Platform.OS !== 'android' && (
              <TouchableOpacity 
                style={[styles.button, styles.buttonSecondary]} 
                onPress={() => Linking.openURL('https://tu-proyecto.vercel.app')}
                activeOpacity={0.8}
              >
                <Ionicons name="phone-portrait" size={24} color="#FFF" />
                <Text style={styles.buttonTextSecondary}>Abrir en móvil</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info adicional */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.infoText}>
              Usa la app web ahora o descarga el APK para instalar en tu celular Android
            </Text>
          </View>

          {/* Versión */}
          <Text style={styles.version}>v1.0.0 • Compatible con Android 8.0+</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9F2241',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -100,
    left: -100,
  },
  circle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -150,
    right: -100,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  content: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: '500',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  features: {
    marginBottom: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  featureText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 16,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPrimary: {
    backgroundColor: '#FFF',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonTextPrimary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9F2241',
    letterSpacing: 0.3,
  },
  buttonTextSecondary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});
