// components/SecretarioStatsCard.js
// Componente para mostrar estadísticas de rendimiento de secretarios
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getSecretarioMetrics, formatCompletionTime } from '../services/analytics';
import { SPACING, TYPOGRAPHY, RADIUS } from '../theme/tokens';

export default function SecretarioStatsCard({ onSecretarioPress }) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [secretarioData, setSecretarioData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadSecretarioStats();
  }, []);

  const loadSecretarioStats = async () => {
    setLoading(true);
    try {
      const result = await getSecretarioMetrics();
      if (result.success) {
        setSecretarioData(result);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading secretario stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (rate) => {
    if (rate >= 80) return '#4CAF50'; // Verde
    if (rate >= 60) return '#FF9800'; // Naranja
    return '#F44336'; // Rojo
  };

  const getStatusIcon = (rate) => {
    if (rate >= 80) return 'checkmark-circle';
    if (rate >= 60) return 'alert-circle';
    return 'close-circle';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando estadísticas de secretarios...
        </Text>
      </View>
    );
  }

  if (!secretarioData || secretarioData.secretarios.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No hay secretarios registrados
        </Text>
      </View>
    );
  }

  const { secretarios, totals } = secretarioData;

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="briefcase" size={24} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>
            Rendimiento de Secretarios
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.textSecondary} 
        />
      </TouchableOpacity>

      {/* Resumen general */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {totals.totalSecretarios}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Secretarios</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            {totals.totalTasksCreated}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Delegadas</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
            {totals.totalTasksCompleted}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Completadas</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.summaryValue, { color: totals.totalTasksOverdue > 0 ? '#F44336' : theme.text }]}>
            {totals.totalTasksOverdue}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Vencidas</Text>
        </View>
      </View>

      {/* Tasa promedio */}
      <View style={[styles.avgRateContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <View style={styles.avgRateItem}>
          <Ionicons 
            name="trending-up" 
            size={20} 
            color={getStatusColor(parseFloat(totals.avgCompletionRate))} 
          />
          <Text style={[styles.avgRateValue, { color: getStatusColor(parseFloat(totals.avgCompletionRate)) }]}>
            {totals.avgCompletionRate}%
          </Text>
          <Text style={[styles.avgRateLabel, { color: theme.textSecondary }]}>
            Tasa Completitud
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.avgRateItem}>
          <Ionicons 
            name="time" 
            size={20} 
            color={getStatusColor(parseFloat(totals.avgOnTimeRate))} 
          />
          <Text style={[styles.avgRateValue, { color: getStatusColor(parseFloat(totals.avgOnTimeRate)) }]}>
            {totals.avgOnTimeRate}%
          </Text>
          <Text style={[styles.avgRateLabel, { color: theme.textSecondary }]}>
            A Tiempo
          </Text>
        </View>
      </View>

      {/* Lista de secretarios expandible */}
      {expanded && (
        <ScrollView style={styles.secretariosList} nestedScrollEnabled>
          {secretarios.map((secretario, index) => (
            <TouchableOpacity
              key={secretario.id}
              style={[
                styles.secretarioItem,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderLeftColor: getStatusColor(secretario.completionRate)
                }
              ]}
              onPress={() => onSecretarioPress && onSecretarioPress(secretario)}
            >
              <View style={styles.secretarioHeader}>
                <View style={styles.secretarioInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {secretario.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.secretarioDetails}>
                    <Text style={[styles.secretarioName, { color: theme.text }]}>
                      {secretario.displayName}
                    </Text>
                    <Text style={[styles.secretarioEmail, { color: theme.textSecondary }]}>
                      {secretario.email}
                    </Text>
                    {secretario.area && (
                      <Text style={[styles.secretarioArea, { color: theme.primary }]}>
                        {secretario.area}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons 
                  name={getStatusIcon(secretario.completionRate)} 
                  size={24} 
                  color={getStatusColor(secretario.completionRate)} 
                />
              </View>

              <View style={styles.secretarioStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{secretario.totalCreated}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Delegadas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>{secretario.totalCompleted}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completadas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#FF9800' }]}>{secretario.totalPending}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendientes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: secretario.totalOverdue > 0 ? '#F44336' : theme.text }]}>
                    {secretario.totalOverdue}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Vencidas</Text>
                </View>
              </View>

              <View style={styles.secretarioRates}>
                <View style={styles.rateBar}>
                  <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>Completitud</Text>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${secretario.completionRate}%`,
                          backgroundColor: getStatusColor(secretario.completionRate)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.rateValue, { color: getStatusColor(secretario.completionRate) }]}>
                    {secretario.completionRate}%
                  </Text>
                </View>
                <View style={styles.rateBar}>
                  <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>A tiempo</Text>
                  <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${secretario.onTimeRate}%`,
                          backgroundColor: getStatusColor(secretario.onTimeRate)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.rateValue, { color: getStatusColor(secretario.onTimeRate) }]}>
                    {secretario.onTimeRate}%
                  </Text>
                </View>
              </View>

              {secretario.avgCompletionTime > 0 && (
                <View style={styles.timeInfo}>
                  <Ionicons name="timer-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                    Tiempo promedio: {formatCompletionTime(secretario.avgCompletionTime)}
                  </Text>
                </View>
              )}

              <View style={styles.weeklyStats}>
                <Text style={[styles.weeklyLabel, { color: theme.textSecondary }]}>Esta semana:</Text>
                <Text style={[styles.weeklyValue, { color: '#4CAF50' }]}>
                  +{secretario.createdThisWeek} delegadas
                </Text>
                <Text style={[styles.weeklyValue, { color: '#2196F3' }]}>
                  {secretario.completedThisWeek} completadas
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {!expanded && secretarios.length > 0 && (
        <Text style={[styles.expandHint, { color: theme.textSecondary }]}>
          Toca para ver detalles de {secretarios.length} secretario{secretarios.length !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginHorizontal: 2,
    borderRadius: RADIUS.sm,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  avgRateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  avgRateItem: {
    alignItems: 'center',
    flex: 1,
  },
  avgRateValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginTop: 4,
  },
  avgRateLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  secretariosList: {
    maxHeight: 400,
  },
  secretarioItem: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  secretarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  secretarioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  secretarioDetails: {
    flex: 1,
  },
  secretarioName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  secretarioEmail: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  secretarioArea: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  secretarioStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  secretarioRates: {
    marginBottom: SPACING.sm,
  },
  rateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rateLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    width: 70,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rateValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    width: 40,
    textAlign: 'right',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  timeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  weeklyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  weeklyLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  weeklyValue: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  expandHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
