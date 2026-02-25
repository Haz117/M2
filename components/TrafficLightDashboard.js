// components/TrafficLightDashboard.js
// Dashboard de semáforo por área - Vista ejecutiva rápida
// 🟢 Al día | 🟡 Próximas a vencer | 🔴 Vencidas

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AREAS_CONFIG } from '../config/areas';
import AnimatedNumber from './AnimatedNumber';
import Tooltip from './Tooltip';

const { width: screenWidth } = Dimensions.get('window');
const isDesktop = screenWidth >= 768;

/**
 * TrafficLightDashboard - Vista de semáforo por área
 * @param {Array} tasks - Lista de tareas
 * @param {Function} onAreaPress - Callback al presionar un área
 * @param {Boolean} compact - Modo compacto para widgets pequeños
 */
export default function TrafficLightDashboard({ tasks = [], onAreaPress, compact = false }) {
  const { theme, isDark } = useTheme();
  
  // Calcular métricas por área
  const areaMetrics = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const metrics = {};
    
    // Agrupar por área
    tasks.forEach(task => {
      if (!task) return;
      const area = task.area || 'sin_area';
      if (!metrics[area]) {
        const areaConfig = AREAS_CONFIG ? AREAS_CONFIG[area] : null;
        metrics[area] = {
          area,
          areaName: areaConfig?.name || area,
          areaIcon: areaConfig?.icon || 'folder',
          total: 0,
          green: 0,    // Al día (vence en +48h o sin fecha)
          yellow: 0,   // Próximas (vence en 24-48h)
          orange: 0,   // Urgentes (vence en <24h)
          red: 0,      // Vencidas
          completed: 0,
        };
      }
      
      metrics[area].total++;
      
      // Determinar estado
      if (task.status === 'cerrada' || task.status === 'completada') {
        metrics[area].completed++;
        metrics[area].green++;
      } else if (task.dueAt) {
        const dueDate = new Date(task.dueAt);
        
        if (dueDate < now) {
          metrics[area].red++;
        } else if (dueDate <= in24Hours) {
          metrics[area].orange++;
        } else if (dueDate <= in48Hours) {
          metrics[area].yellow++;
        } else {
          metrics[area].green++;
        }
      } else {
        metrics[area].green++;
      }
    });
    
    // Convertir a array y ordenar por urgencia (más rojas primero)
    return Object.values(metrics)
      .sort((a, b) => (b.red + b.orange) - (a.red + a.orange));
  }, [tasks]);

  // Determinar el color dominante del área
  const getAreaStatus = (metric) => {
    if (!metric) return 'healthy';
    if (metric.red > 0) return 'critical';
    if (metric.orange > 0) return 'urgent';
    if (metric.yellow > 0) return 'warning';
    return 'healthy';
  };

  const statusConfig = {
    critical: { color: '#DC2626', bgColor: '#FEE2E2', icon: 'alert-circle', label: 'Crítico' },
    urgent: { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'warning', label: 'Urgente' },
    warning: { color: '#EAB308', bgColor: '#FEF9C3', icon: 'time', label: 'Atención' },
    healthy: { color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark-circle', label: 'Al día' },
  };

  // Resumen general
  const summary = useMemo(() => {
    const totals = { green: 0, yellow: 0, orange: 0, red: 0 };
    if (!areaMetrics || !Array.isArray(areaMetrics)) return totals;
    areaMetrics.forEach(m => {
      if (!m) return;
      totals.green += m.green || 0;
      totals.yellow += m.yellow || 0;
      totals.orange += m.orange || 0;
      totals.red += m.red || 0;
    });
    return totals;
  }, [areaMetrics]);

  const styles = createStyles(theme, isDark, compact);

  if (compact) {
    // Vista compacta: solo semáforos
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Ionicons name="traffic-light-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.compactTitle, { color: theme.text }]}>Semáforo de Áreas</Text>
        </View>
        <View style={styles.compactSummary}>
          <View style={[styles.summaryBadge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.summaryNumber, { color: '#10B981' }]}>{summary.green}</Text>
            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>✓</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: '#FEF9C3' }]}>
            <Text style={[styles.summaryNumber, { color: '#EAB308' }]}>{summary.yellow}</Text>
            <Text style={[styles.summaryLabel, { color: '#EAB308' }]}>⏳</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.summaryNumber, { color: '#F59E0B' }]}>{summary.orange}</Text>
            <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>⚡</Text>
          </View>
          <View style={[styles.summaryBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>{summary.red}</Text>
            <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>⚠</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con resumen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Semáforo de Áreas</Text>
        </View>
        <View style={styles.headerSummary}>
          <Tooltip content="Al día: Tareas con +48h para vencer o sin fecha" position="bottom">
            <View style={[styles.miniIndicator, { backgroundColor: '#10B981' }]}>
              <AnimatedNumber value={summary.green} duration={500} delay={0} style={styles.miniText} />
            </View>
          </Tooltip>
          <Tooltip content="Atención: Tareas que vencen en 24-48 horas" position="bottom">
            <View style={[styles.miniIndicator, { backgroundColor: '#EAB308' }]}>
              <AnimatedNumber value={summary.yellow} duration={500} delay={100} style={styles.miniText} />
            </View>
          </Tooltip>
          <Tooltip content="Urgente: Tareas que vencen en menos de 24h" position="bottom">
            <View style={[styles.miniIndicator, { backgroundColor: '#F59E0B' }]}>
              <AnimatedNumber value={summary.orange} duration={500} delay={200} style={styles.miniText} />
            </View>
          </Tooltip>
          <Tooltip content="Crítico: Tareas vencidas que requieren atención inmediata" position="bottom">
            <View style={[styles.miniIndicator, { backgroundColor: '#DC2626' }]}>
              <AnimatedNumber value={summary.red} duration={500} delay={300} style={styles.miniText} />
            </View>
          </Tooltip>
        </View>
      </View>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Al día (+48h)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>24-48h</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>&lt;24h</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Vencidas</Text>
        </View>
      </View>

      {/* Grid de áreas */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.areasGrid}>
          {areaMetrics && areaMetrics.map((metric) => {
            if (!metric) return null;
            const status = getAreaStatus(metric);
            const config = statusConfig[status] || statusConfig.healthy;
            
            return (
              <TouchableOpacity
                key={metric.area}
                style={[
                  styles.areaCard,
                  { 
                    backgroundColor: isDark ? theme.card : '#FFFFFF',
                    borderLeftColor: config.color,
                  }
                ]}
                onPress={() => onAreaPress?.(metric.area)}
                activeOpacity={0.7}
              >
                {/* Header del área */}
                <View style={styles.areaHeader}>
                  <View style={[styles.areaIconContainer, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={metric.areaIcon} size={18} color={config.color} />
                  </View>
                  <View style={styles.areaInfo}>
                    <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>
                      {metric.areaName}
                    </Text>
                    <Text style={[styles.areaTotal, { color: theme.textSecondary }]}>
                      {metric.total} tareas
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
                  </View>
                </View>

                {/* Semáforo visual */}
                <View style={styles.trafficLight}>
                  <View style={styles.lightRow}>
                    <View style={[styles.light, { backgroundColor: metric.green > 0 ? '#10B981' : '#E5E7EB' }]}>
                      <Text style={styles.lightText}>{metric.green}</Text>
                    </View>
                    <View style={[styles.light, { backgroundColor: metric.yellow > 0 ? '#EAB308' : '#E5E7EB' }]}>
                      <Text style={styles.lightText}>{metric.yellow}</Text>
                    </View>
                    <View style={[styles.light, { backgroundColor: metric.orange > 0 ? '#F59E0B' : '#E5E7EB' }]}>
                      <Text style={styles.lightText}>{metric.orange}</Text>
                    </View>
                    <View style={[styles.light, { backgroundColor: metric.red > 0 ? '#DC2626' : '#E5E7EB' }]}>
                      <Text style={styles.lightText}>{metric.red}</Text>
                    </View>
                  </View>
                </View>

                {/* Barra de progreso */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    {metric.green > 0 && (
                      <View style={[styles.progressSegment, { 
                        flex: metric.green, 
                        backgroundColor: '#10B981' 
                      }]} />
                    )}
                    {metric.yellow > 0 && (
                      <View style={[styles.progressSegment, { 
                        flex: metric.yellow, 
                        backgroundColor: '#EAB308' 
                      }]} />
                    )}
                    {metric.orange > 0 && (
                      <View style={[styles.progressSegment, { 
                        flex: metric.orange, 
                        backgroundColor: '#F59E0B' 
                      }]} />
                    )}
                    {metric.red > 0 && (
                      <View style={[styles.progressSegment, { 
                        flex: metric.red, 
                        backgroundColor: '#DC2626' 
                      }]} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme, isDark, compact) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? theme.background : '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSummary: {
    flexDirection: 'row',
    gap: 6,
  },
  miniIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  areaCard: {
    width: isDesktop ? 'calc(33.33% - 8px)' : '100%',
    minWidth: isDesktop ? 280 : undefined,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaInfo: {
    flex: 1,
    marginLeft: 10,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
  },
  areaTotal: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trafficLight: {
    marginBottom: 10,
  },
  lightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  light: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  progressSegment: {
    height: '100%',
  },
  // Estilos compactos
  compactContainer: {
    padding: 12,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderRadius: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  compactSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  summaryBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
  },
});
