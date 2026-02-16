// components/ProgressBar.js
// Componente de barra de progreso reutilizable
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProgressBar({ 
  progress = 0,
  size = 'medium',
  showLabel = true,
  animated = true,
  color = '#9F2241',
  label = 'Progreso',
  height = null
}) {
  const animatedProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false
      }).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [progress, animated]);

  const sizeConfig = {
    small: { height: 4, labelSize: 12, containerPadding: 8 },
    medium: { height: 8, labelSize: 14, containerPadding: 12 },
    large: { height: 12, labelSize: 16, containerPadding: 16 }
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const barHeight = height || config.height;

  // Determinar colores por progreso
  const getGradientColors = (p) => {
    if (p < 33) return ['#EF4444', '#F87171']; // Rojo
    if (p < 66) return ['#FBBF24', '#F59E0B']; // Naranja/Amarillo
    return [color, '#A83860']; // Verde/Maroon
  };

  const gradientColors = getGradientColors(progress);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: config.labelSize }]}>
            {label}
          </Text>
          <Text style={[styles.percentage, { fontSize: config.labelSize, color }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
      
      <View style={[styles.barContainer, { paddingVertical: config.containerPadding }]}>
        <View style={[styles.barBackground, { height: barHeight }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                height: barHeight,
                width: animatedProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: barHeight / 2 }}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  label: {
    fontWeight: '600',
    color: '#333'
  },
  percentage: {
    fontWeight: '700'
  },
  barContainer: {
    width: '100%'
  },
  barBackground: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  barFill: {
    borderRadius: 999
  }
});
