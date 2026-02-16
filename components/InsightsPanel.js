// components/InsightsPanel.js
// Panel de insights, comparativas y predicciones
// Ligero y optimizado para rendimiento

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SpringCard from './SpringCard';
import { ProgressBar } from 'react-native';

const { width } = Dimensions.get('window');

export default function InsightsPanel({
  monthlyComparative = null,
  bottlenecks = [],
  predictions = {},
  workloadDistribution = {}
}) {
  const { theme, isDark } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      scrollEventThrottle={16}
    >
      {/* Comparativa mensual */}
      {monthlyComparative && (
        <SpringCard style={[styles.insightCard, { backgroundColor: theme.card }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="trending-up" size={20} color="#3B82F6" />
            <Text style={[styles.insightTitle, { color: theme.text }]}>Comparativa Mensual</Text>
          </View>

          <View style={styles.insightContent}>
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                Este Mes
              </Text>
              <Text style={[styles.comparisonValue, { color: '#3B82F6' }]}>
                {monthlyComparative.current?.completionRate || 0}%
              </Text>
            </View>

            {monthlyComparative.previous && (
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>
                  Mes Anterior
                </Text>
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={
                      monthlyComparative.current?.completionRate > monthlyComparative.previous?.completionRate
                        ? 'arrow-up'
                        : 'arrow-down'
                    }
                    size={12}
                    color={
                      monthlyComparative.current?.completionRate > monthlyComparative.previous?.completionRate
                        ? '#10B981'
                        : '#DC2626'
                    }
                  />
                  <Text
                    style={[
                      styles.trendValue,
                      {
                        color:
                          monthlyComparative.current?.completionRate >
                          monthlyComparative.previous?.completionRate
                            ? '#10B981'
                            : '#DC2626'
                      }
                    ]}
                  >
                    {Math.abs(
                      (monthlyComparative.current?.completionRate || 0) -
                        (monthlyComparative.previous?.completionRate || 0)
                    )}%
                  </Text>
                </View>
              </View>
            )}

            <Text
              style={[
                styles.trendLabel,
                {
                  color: theme.textSecondary,
                  fontSize: 11
                }
              ]}
            >
              {monthlyComparative.trend === 'improving' && '📈 Mejorando'}
              {monthlyComparative.trend === 'declining' && '📉 Declinando'}
              {monthlyComparative.trend === 'accelerating' && '🚀 Acelerando'}
            </Text>
          </View>
        </SpringCard>
      )}

      {/* Cuellos de botella */}
      {bottlenecks.length > 0 && (
        <SpringCard style={[styles.insightCard, { backgroundColor: theme.card }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="git-network" size={20} color="#F59E0B" />
            <Text style={[styles.insightTitle, { color: theme.text }]}>Cuellos de Botella</Text>
          </View>

          <View style={styles.insightContent}>
            {bottlenecks.slice(0, 2).map((bottleneck, index) => (
              <View key={index} style={styles.bottleneckItem}>
                <Text style={[styles.bottleneckArea, { color: theme.text }]} numberOfLines={1}>
                  {bottleneck.area}
                </Text>
                <View style={styles.bottleneckStats}>
                  <Text style={[styles.bottleneckDays, { color: '#F59E0B' }]}>
                    {bottleneck.avgDays} días
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          bottleneck.severity === 'high'
                            ? '#DC262630'
                            : '#F59E0B30'
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color:
                            bottleneck.severity === 'high'
                              ? '#DC2626'
                              : '#F59E0B'
                        }
                      ]}
                    >
                      {bottleneck.severity === 'high' ? '🔴' : '🟡'} {bottleneck.severity}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </SpringCard>
      )}

      {/* Predicción de tendencia */}
      {Object.values(predictions).some(p => p) && (
        <SpringCard style={[styles.insightCard, { backgroundColor: theme.card }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="crystal-ball" size={20} color="#8B5CF6" />
            <Text style={[styles.insightTitle, { color: theme.text }]}>Predicción</Text>
          </View>

          <View style={styles.insightContent}>
            {Object.entries(predictions)
              .filter(([_, p]) => p)
              .slice(0, 2)
              .map(([area, prediction], index) => (
                <View key={index} style={styles.predictionItem}>
                  <View style={styles.predictionHeader}>
                    <Text style={[styles.predictionArea, { color: theme.text }]} numberOfLines={1}>
                      {area}
                    </Text>
                    <Ionicons
                      name={prediction.trend === 'up' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={
                        prediction.trend === 'up' ? '#10B981' : '#DC2626'
                      }
                    />
                  </View>
                  <Text style={[styles.predictionValue, { color: '#8B5CF6' }]}>
                    {prediction.predictedRate}%
                  </Text>
                  <Text style={[styles.confidenceText, { color: theme.textSecondary }]}>
                    {prediction.confidence}% confianza
                  </Text>
                </View>
              ))}
          </View>
        </SpringCard>
      )}

      {/* Distribución de carga */}
      {Object.keys(workloadDistribution).length > 0 && (
        <SpringCard style={[styles.insightCard, { backgroundColor: theme.card }]}>
          <View style={styles.insightHeader}>
            <Ionicons name="layers" size={20} color="#EC4899" />
            <Text style={[styles.insightTitle, { color: theme.text }]}>Carga de Trabajo</Text>
          </View>

          <View style={styles.insightContent}>
            {Object.entries(workloadDistribution)
              .sort((a, b) => b[1].percentage - a[1].percentage)
              .slice(0, 3)
              .map(([area, distribution], index) => (
                <View key={index} style={styles.workloadItem}>
                  <Text style={[styles.workloadArea, { color: theme.text }]} numberOfLines={1}>
                    {area}
                  </Text>
                  <View style={styles.workloadBar}>
                    <View
                      style={[
                        styles.workloadFill,
                        {
                          width: `${distribution.percentage}%`,
                          backgroundColor:
                            distribution.status === 'overloaded'
                              ? '#DC2626'
                              : distribution.status === 'balanced'
                              ? '#10B981'
                              : '#3B82F6'
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.workloadPercent, { color: theme.textSecondary }]}>
                    {Math.round(distribution.percentage)}%
                  </Text>
                </View>
              ))}
          </View>
        </SpringCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    marginHorizontal: -16
  },
  insightCard: {
    width: width * 0.75,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    paddingVertical: 12
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  insightContent: {
    gap: 10
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700'
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '700'
  },
  trendLabel: {
    marginTop: 4,
    fontWeight: '600'
  },
  bottleneckItem: {
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6
  },
  bottleneckArea: {
    fontSize: 13,
    fontWeight: '600'
  },
  bottleneckStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bottleneckDays: {
    fontSize: 14,
    fontWeight: '700'
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600'
  },
  predictionItem: {
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  predictionArea: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '700'
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '500'
  },
  workloadItem: {
    paddingVertical: 8,
    gap: 6
  },
  workloadArea: {
    fontSize: 12,
    fontWeight: '600'
  },
  workloadBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  workloadFill: {
    height: '100%',
    borderRadius: 3
  },
  workloadPercent: {
    fontSize: 11,
    fontWeight: '600'
  }
});
