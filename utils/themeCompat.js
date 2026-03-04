/**
 * Theme Compatibility Layer
 * Permite que los contextos de tema viejo y nuevo trabajen juntos
 */

import { useContext } from 'react';
import { ThemeContext as EnhancedThemeContext } from '../theme/enhancedTheme';
import { ThemeContext as OldThemeContext } from '../contexts/ThemeContext';

/**
 * Hook que unifica ambos contextos de tema
 * Usa EnhancedTheme como primario, fallback a OldTheme
 */
export const useUnifiedTheme = () => {
  try {
    const enhanced = useContext(EnhancedThemeContext);
    if (enhanced && enhanced.theme) {
      // Mapear colores del nuevo sistema al formato del viejo
      return {
        // Viejo formato (para compatibilidad)
        isDark: enhanced.isDark,
        background: enhanced.theme.colors.background.primary,
        card: enhanced.theme.colors.background.card,
        text: enhanced.theme.colors.text.primary,
        textSecondary: enhanced.theme.colors.text.secondary,
        primary: enhanced.theme.colors.primary.default,
        border: enhanced.theme.colors.border.light,
        surface: enhanced.theme.colors.background.secondary || enhanced.theme.colors.background.primary,
        
        // Nuevo formato
        theme: enhanced.theme,
        toggleDarkMode: enhanced.toggleDarkMode,
      };
    }
  } catch (e) {
    // Fallback al contexto viejo
  }

  try {
    const old = useContext(OldThemeContext);
    if (old) {
      return old;
    }
  } catch (e) {
    // Sin contexto disponible
  }

  // Default fallback
  return {
    isDark: false,
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    primary: '#9F2241',
    border: '#E5E5EA',
    surface: '#F5F5F5',
  };
};

/**
 * Hook solo para usar EnhancedTheme
 */
export const useEnhancedTheme = () => {
  return useContext(EnhancedThemeContext);
};

export default useUnifiedTheme;
