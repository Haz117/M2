// components/WebSafeBlur.js
// Web-safe alternative to BlurView that works on both web and mobile
import React from 'react';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function WebSafeBlur({ 
  intensity = 70, 
  style, 
  children,
  tint = 'light'
}) {
  // On web, use a regular View with a semi-transparent background
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: tint === 'dark' 
              ? 'rgba(0, 0, 0, 0.5)' 
              : 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)'
          }
        ]}
      >
        {children}
      </View>
    );
  }

  // On native platforms, use the actual BlurView
  return (
    <BlurView intensity={intensity} style={style} tint={tint}>
      {children}
    </BlurView>
  );
}
