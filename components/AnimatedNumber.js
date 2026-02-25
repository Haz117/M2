// components/AnimatedNumber.js
// Componente que anima el conteo de números con efecto de "counting up"
// Útil para mostrar estadísticas que cambian de valor

import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';

export default function AnimatedNumber({
  value = 0,
  duration = 1000,
  style = {},
  prefix = '',
  suffix = '',
  decimals = 0,
  formatNumber = true, // Agrega comas para miles
  delay = 0,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(0);

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = typeof value === 'number' ? value : parseFloat(value) || 0;

    // Configurar animación con delay opcional
    const timeout = setTimeout(() => {
      animatedValue.setValue(startValue);
      
      Animated.timing(animatedValue, {
        toValue: endValue,
        duration,
        useNativeDriver: false, // No se puede usar native driver con valores de texto
      }).start();

      // Listener para actualizar el display
      const listener = animatedValue.addListener(({ value: v }) => {
        setDisplayValue(v);
      });

      return () => {
        animatedValue.removeListener(listener);
      };
    }, delay);

    prevValue.current = endValue;

    return () => {
      clearTimeout(timeout);
    };
  }, [value, duration, delay]);

  // Formatear el número
  const formatDisplayValue = (num) => {
    let formattedNum;
    
    if (decimals > 0) {
      formattedNum = num.toFixed(decimals);
    } else {
      formattedNum = Math.round(num).toString();
    }

    if (formatNumber) {
      // Agregar separadores de miles
      const parts = formattedNum.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formattedNum = parts.join('.');
    }

    return `${prefix}${formattedNum}${suffix}`;
  };

  return (
    <Text style={[styles.defaultText, style]}>
      {formatDisplayValue(displayValue)}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
});
