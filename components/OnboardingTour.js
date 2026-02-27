// components/OnboardingTour.js
// Tour interactivo de onboarding para nuevos usuarios
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const ONBOARDING_KEY = '@onboarding_completed';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Pasos del tour por defecto
 */
const DEFAULT_STEPS = [
  {
    id: 'welcome',
    title: '¡Bienvenido! 👋',
    description: 'Te mostraremos las funciones principales de la aplicación en menos de un minuto.',
    icon: 'rocket-outline',
    color: '#9F2241',
  },
  {
    id: 'tasks',
    title: 'Gestión de Tareas',
    description: 'Crea, asigna y da seguimiento a tareas. Usa deslizar para ver acciones rápidas.',
    icon: 'checkbox-outline',
    color: '#10B981',
  },
  {
    id: 'kanban',
    title: 'Tablero Kanban',
    description: 'Visualiza el flujo de trabajo con columnas de estado. Cambia estado de tareas fácilmente.',
    icon: 'grid-outline',
    color: '#3B82F6',
  },
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Ve todas las fechas de vencimiento. Los puntos indican tareas asignadas ese día.',
    icon: 'calendar-outline',
    color: '#F59E0B',
  },
  {
    id: 'reports',
    title: 'Reportes',
    description: 'Documenta avances con fotos y texto. También funciona sin conexión.',
    icon: 'document-text-outline',
    color: '#8B5CF6',
  },
  {
    id: 'ready',
    title: '¡Listo para empezar!',
    description: 'Ya conoces lo básico. ¿Preguntas? Busca el ícono de ayuda (?) en cada pantalla.',
    icon: 'checkmark-circle-outline',
    color: '#10B981',
  },
];

/**
 * Componente OnboardingTour
 * @param {Array} steps - Pasos personalizados (opcional)
 * @param {Function} onComplete - Callback cuando se completa el tour
 * @param {boolean} forceShow - Mostrar aunque ya se haya completado antes
 */
export default function OnboardingTour({ steps = DEFAULT_STEPS, onComplete, forceShow = false }) {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (visible) {
      animateStep();
    }
  }, [currentStep, visible]);

  const checkOnboardingStatus = async () => {
    try {
      if (forceShow) {
        setVisible(true);
        return;
      }
      
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        setVisible(true);
      }
    } catch (e) {
      // Si hay error, no mostrar
    }
  };

  const animateStep = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      // Silent fail
    }
    
    setVisible(false);
    onComplete?.();
  };

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.card,
            { 
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%`, backgroundColor: step.color }
              ]} 
            />
          </View>

          {/* Skip button */}
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>Saltar</Text>
            </TouchableOpacity>
          )}

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${step.color}20` }]}>
            <Ionicons name={step.icon} size={48} color={step.color} />
          </View>

          {/* Content */}
          <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {step.description}
          </Text>

          {/* Step indicators */}
          <View style={styles.dots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentStep ? step.color : isDark ? '#3A3A3C' : '#E5E7EB',
                    width: index === currentStep ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonRow}>
            {!isFirstStep && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: step.color }]}
                onPress={handlePrevious}
              >
                <Ionicons name="arrow-back" size={20} color={step.color} />
                <Text style={[styles.secondaryButtonText, { color: step.color }]}>Anterior</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: step.color, flex: isFirstStep ? 1 : undefined }]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isLastStep ? '¡Empezar!' : 'Siguiente'}
              </Text>
              {!isLastStep && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              {isLastStep && <Ionicons name="rocket" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Hook para resetear el onboarding (para testing)
 */
export async function resetOnboarding() {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

/**
 * Hook para verificar si el onboarding fue completado
 */
export async function hasCompletedOnboarding() {
  const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
  return !!completed;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
