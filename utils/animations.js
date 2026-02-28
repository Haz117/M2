/**
 * Animations & Transitions Utilities
 * Reutilizables y configurables
 */

import { Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';

/**
 * @typedef {Object} AnimationConfig
 * @property {number} duration - Duración en ms
 * @property {Function} easing - Función de easing (Easing.ease, Easing.inOut, etc)
 * @property {number} delay - Delay antes de empezar (ms)
 * @property {boolean} useNativeDriver - Usar native driver para mejor performance
 */

const defaultConfig = {
  duration: 300,
  easing: Easing.inOut(Easing.ease),
  delay: 0,
  useNativeDriver: true,
};

/**
 * Fade In Animation Hook
 */
export const useFadeIn = (config = {}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: finalConfig.duration,
      easing: finalConfig.easing,
      delay: finalConfig.delay,
      useNativeDriver: finalConfig.useNativeDriver,
    }).start();
  }, []);

  return animValue;
};

/**
 * Slide In Animation Hook
 */
export const useSlideIn = (direction = 'left', config = {}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: finalConfig.duration,
      easing: finalConfig.easing,
      delay: finalConfig.delay,
      useNativeDriver: finalConfig.useNativeDriver,
    }).start();
  }, []);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'left' ? [-50, 0] : [50, 0],
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'up' ? [50, 0] : [-50, 0],
  });

  return {
    opacity: animValue,
    transform: [
      { translateX: direction === 'left' || direction === 'right' ? translateX : 0 },
      { translateY: direction === 'up' || direction === 'down' ? translateY : 0 },
    ],
  };
};

/**
 * Scale Animation Hook
 */
export const useScale = (config = {}) => {
  const animValue = useRef(new Animated.Value(0.8)).current;
  const finalConfig = { ...defaultConfig, duration: 200, ...config };

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: finalConfig.duration,
      easing: finalConfig.easing,
      delay: finalConfig.delay,
      useNativeDriver: finalConfig.useNativeDriver,
    }).start();
  }, []);

  return {
    opacity: animValue,
    transform: [{ scale: animValue }],
  };
};

/**
 * Bounce Animation Hook
 */
export const useBounce = (config = {}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const finalConfig = { ...defaultConfig, duration: 600, ...config };

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      bounciness: 8,
      speed: 12,
      useNativeDriver: finalConfig.useNativeDriver,
    }).start();
  }, []);

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.1, 1],
  });

  return {
    transform: [{ scale }],
  };
};

/**
 * Pulse Animation Hook (continuous)
 */
export const usePulse = (config = {}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const finalConfig = { duration: 1500, ...config };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: finalConfig.duration / 2,
          easing: Easing.ease,
          useNativeDriver: finalConfig.useNativeDriver,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: finalConfig.duration / 2,
          easing: Easing.ease,
          useNativeDriver: finalConfig.useNativeDriver,
        }),
      ])
    ).start();
  }, []);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return { opacity };
};

/**
 * Shake Animation Hook
 */
export const useShake = (config = {}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const finalConfig = { duration: 500, ...config };

  const shake = () => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  return {
    transform: [{ translateX: animValue }],
    shake,
  };
};

/**
 * Press Animation Hook
 */
export const usePressAnimation = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return {
    transform: [{ scale: scaleAnim }],
    onPressIn,
    onPressOut,
  };
};

/**
 * Height transition animation
 */
export const useHeightAnimation = (toHeight, config = {}) => {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const finalConfig = { ...defaultConfig, duration: 300, ...config };

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: toHeight,
      duration: finalConfig.duration,
      easing: finalConfig.easing,
      useNativeDriver: false,
    }).start();
  }, [toHeight]);

  return heightAnim;
};

/**
 * Opacity transition
 */
export const useOpacityTransition = (visible, config = {}) => {
  const opacityAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const finalConfig = { ...defaultConfig, duration: 300, ...config };

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: finalConfig.duration,
      easing: finalConfig.easing,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return opacityAnim;
};

/**
 * Timing presets
 */
export const timings = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
};

/**
 * Easing presets
 */
export const easings = {
  linear: Easing.linear,
  ease: Easing.ease,
  in: Easing.in(Easing.ease),
  out: Easing.out(Easing.ease),
  inOut: Easing.inOut(Easing.ease),
  elastic: Easing.elastic(1),
  bounce: Easing.bounce,
};

export default {
  useFadeIn,
  useSlideIn,
  useScale,
  useBounce,
  usePulse,
  useShake,
  usePressAnimation,
  useHeightAnimation,
  useOpacityTransition,
  timings,
  easings,
};
