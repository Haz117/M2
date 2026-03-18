// screens/LoginScreen.js  
// Login moderno con animaciones avanzadas
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, 
  Platform, ScrollView, Animated, Dimensions, Linking, ActivityIndicator, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../services/authFirestore';
import Toast from 'react-native-toast-message';

const BRAND = BRAND;

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Animaciones avanzadas
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de entrada escalonada
    Animated.sequence([
      // Logo entra con escala y rotación
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Título
      Animated.timing(titleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Formulario
      Animated.timing(formAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Botón
      Animated.spring(buttonAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // Pulso continuo en el logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Shake animation para errores
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg']
  });

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showToast = (message, type = 'error') => {
    if (type === 'error') triggerShake();
    Toast.show({
      type: type === 'success' ? 'success' : type === 'warning' ? 'info' : 'error',
      text1: message,
      position: type === 'error' ? 'top' : 'bottom',
      visibilityTime: 3000,
    });
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }
    
    // Normalizar email a minúsculas
    const normalizedEmail = email.trim().toLowerCase();

    setLoading(true);
    
    try {
      const result = await loginUser(normalizedEmail, password);
      
      if (result.success) {
        showToast('¡Bienvenido! Iniciando sesión...', 'success');
        setTimeout(() => {
          if (onLogin) onLogin();
        }, 800);
      } else {
        showToast(result.error || 'Usuario o contraseña incorrectos', 'error');
      }
    } catch (error) {
      showToast('Error de conexión. Verifica tu internet', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.gradient}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }, { rotate: logoRotation }] }]}>
              <View style={styles.logo}>
                <Ionicons name="checkmark-done" size={60} color="#FFF" />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
              <Text style={styles.title}>TodoApp</Text>
              <Text style={styles.subtitle}>Gestiona tus tareas con estilo</Text>
            </Animated.View>

            <Animated.View style={[styles.form, { opacity: formAnim, transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <View style={[styles.input, focusedInput === 'email' && styles.inputFocused]}>
                <Ionicons name="mail" size={20} color={focusedInput === 'email' ? '#FFD93D' : 'rgba(255,255,255,0.6)'} style={{ marginRight: 12 }} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.input, focusedInput === 'password' && styles.inputFocused]}>
                <Ionicons name="lock-closed" size={20} color={focusedInput === 'password' ? '#FFD93D' : 'rgba(255,255,255,0.6)'} style={{ marginRight: 12 }} />
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  style={styles.textInput}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 8 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  accessibilityRole="button"
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <Animated.View style={{ transform: [{ scale: buttonAnim }], opacity: buttonAnim }}>
                <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                  <View style={[styles.btnGrad, loading && { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                    {loading ? (
                      <>
                        <ActivityIndicator size="small" color="#9F2241" />
                        <Text style={[styles.btnText, { marginLeft: 8 }]}>Ingresando...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.btnText}>Iniciar Sesión</Text>
                        <Ionicons name="arrow-forward" size={20} color="#9F2241" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Separador */}
              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>o descarga la app</Text>
                <View style={styles.separatorLine} />
              </View>

              {/* Botón Ver Opciones de Descarga */}
              <TouchableOpacity 
                style={styles.downloadBtn} 
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // En web, abrir en nueva pestaña
                    window.open('/download.html', '_blank');
                  } else {
                    // En móvil, abrir con Linking
                    Linking.openURL('https://to-do-iota-opal.vercel.app/download.html');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.downloadBtnGrad}>
                  <Ionicons name="phone-portrait-outline" size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.downloadBtnText}>Ver Opciones de Descarga</Text>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </View>
              </TouchableOpacity>

              <Text style={styles.downloadHint}>
                Disponible para Android e iOS (PWA)
              </Text>
            </Animated.View>

            <View style={styles.features}>
              <View style={styles.feat}><View style={styles.dot} /><Text style={styles.featText}>Sincronización en tiempo real</Text></View>
              <View style={styles.feat}><View style={styles.dot} /><Text style={styles.featText}>Seguridad garantizada</Text></View>
              <View style={styles.feat}><View style={styles.dot} /><Text style={styles.featText}>Colaboración en equipo</Text></View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: BRAND // Fondo de respaldo
  },
  gradient: { 
    flex: 1, 
    backgroundColor: BRAND,
    minHeight: '100%'
  },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)', top: -100, left: -100 },
  circle2: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.03)', bottom: -150, right: -100 },
  scroll: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20, 
    paddingTop: 48,
    minHeight: '100%'
  },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)', elevation: 10 },
  title: { fontSize: 48, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 32, fontWeight: '500' },
  form: { width: '100%', marginBottom: 32 },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, marginBottom: 16, paddingHorizontal: 16, height: 54, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  inputFocused: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.3)' },
  textInput: { flex: 1, fontSize: 16, color: '#FFF', fontWeight: '500' },
  btn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', elevation: 8 },
  btnDisabled: { opacity: 0.6 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, backgroundColor: '#FFF' },
  btnText: { fontSize: 17, fontWeight: '700', color: BRAND, letterSpacing: 0.3 },
  separator: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  separatorLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  separatorText: { marginHorizontal: 16, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  downloadBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.08)' },
  downloadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  downloadBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF', letterSpacing: 0.3 },
  downloadHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  features: { marginTop: 24, gap: 10 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  featText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
});
