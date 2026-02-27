// components/ErrorBoundary.js
// Captura errores de React y muestra UI de fallback en lugar de crashear la app
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isReloading: false
    };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log del error para debugging/analytics
    this.setState({ errorInfo });
    
    // Aquí podrías enviar a un servicio de crash reporting
    console.error('🔴 ErrorBoundary caught:', error);
    console.error('Component stack:', errorInfo?.componentStack);
    
    // Guardar en analytics si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = async () => {
    this.setState({ isReloading: true });
    
    try {
      if (Platform.OS === 'web') {
        // En web, recargar la página
        window.location.reload();
      } else {
        // En móvil, simplemente limpiar el error
        // El usuario puede cerrar y reabrir la app si necesita un reload completo
        this.setState({ hasError: false, error: null, errorInfo: null, isReloading: false });
      }
    } catch (e) {
      // Si falla, solo limpiar el error
      this.setState({ hasError: false, error: null, errorInfo: null, isReloading: false });
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, isReloading } = this.state;
      const isDev = __DEV__;
      
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Icono de error */}
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={64} color="#EF4444" />
            </View>
            
            {/* Título */}
            <Text style={styles.title}>¡Ups! Algo salió mal</Text>
            <Text style={styles.subtitle}>
              La aplicación encontró un error inesperado
            </Text>
            
            {/* Detalles técnicos (solo en desarrollo) */}
            {isDev && error && (
              <ScrollView style={styles.errorDetails} showsVerticalScrollIndicator={false}>
                <Text style={styles.errorName}>{error.name}: {error.message}</Text>
                {errorInfo?.componentStack && (
                  <Text style={styles.errorStack}>
                    {errorInfo.componentStack.trim().split('\n').slice(0, 5).join('\n')}
                  </Text>
                )}
              </ScrollView>
            )}
            
            {/* Botones de acción */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.reloadButton} 
                onPress={this.handleReload}
                disabled={isReloading}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={20} color="#9F2241" />
                <Text style={styles.reloadButtonText}>
                  {isReloading ? 'Recargando...' : 'Recargar App'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Info de soporte */}
            <Text style={styles.supportText}>
              Si el problema persiste, contacta a soporte técnico
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorDetails: {
    maxHeight: 150,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#9F2241',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9F2241',
  },
  reloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9F2241',
  },
  supportText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
