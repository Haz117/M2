// components/StateStatusCards.js
// Tarjetas de estado mejoradas para mostrar visualmente los estados de tareas
// ✨ Componente nuevo para mejor visualización de estados - RESPONSIVE WEB

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StateStatusCards({
  completed = 0,
  pending = 0,
  inProgress = 0,
  inReview = 0,
  onPress = null,
}) {
  const { theme, isDark } = useTheme();
  const { width } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getStateColor = (type) => {
    switch (type) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'inProgress':
        return '#3B82F6';
      case 'inReview':
        return '#8B5CF6';
      default:
        return theme.primary;
    }
  };

  const StateCard = ({ icon, label, value, colorKey, onCardPress }) => {
    const color = getStateColor(colorKey);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onCardPress}
        style={[
          styles.stateCardWrapper,
          isDesktop && styles.stateCardWrapperDesktop,
          isTablet && styles.stateCardWrapperDesktop,
        ]}
      >
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: `${color}12`,
              borderColor: color,
            }
          ]}
        >
          <View style={styles.stateCardHeader}>
            <View style={[styles.stateIconWrapper, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
          </View>

          <View style={styles.stateCardContent}>
            <Text style={[styles.stateValue, { color: color }]}>{value}</Text>
            <Text style={[styles.stateLabel, { color: theme.textSecondary }]}>{label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Por Estado
      </Text>

      {isDesktop || isTablet ? (
        // Desktop/Tablet: 4 tarjetas en una fila
        <View style={[styles.row, styles.rowFlex]}>
          <StateCard
            icon="checkmark-done-sharp"
            label="Completadas"
            value={completed.toString()}
            colorKey="completed"
            onCardPress={onPress ? () => onPress('completed') : null}
          />
          <StateCard
            icon="alert-circle"
            label="Pendientes"
            value={pending.toString()}
            colorKey="pending"
            onCardPress={onPress ? () => onPress('pending') : null}
          />
          <StateCard
            icon="play-circle"
            label="En Proceso"
            value={inProgress.toString()}
            colorKey="inProgress"
            onCardPress={onPress ? () => onPress('inProgress') : null}
          />
          <StateCard
            icon="eye-outline"
            label="En Revisión"
            value={inReview.toString()}
            colorKey="inReview"
            onCardPress={onPress ? () => onPress('inReview') : null}
          />
        </View>
      ) : (
        // Mobile: 2 filas de 2 tarjetas
        <>
          <View style={styles.row}>
            <StateCard
              icon="checkmark-done-sharp"
              label="Completadas"
              value={completed.toString()}
              colorKey="completed"
              onCardPress={onPress ? () => onPress('completed') : null}
            />
            <StateCard
              icon="alert-circle"
              label="Pendientes"
              value={pending.toString()}
              colorKey="pending"
              onCardPress={onPress ? () => onPress('pending') : null}
            />
          </View>

          <View style={styles.row}>
            <StateCard
              icon="play-circle"
              label="En Proceso"
              value={inProgress.toString()}
              colorKey="inProgress"
              onCardPress={onPress ? () => onPress('inProgress') : null}
            />
            <StateCard
              icon="eye-outline"
              label="En Revisión"
              value={inReview.toString()}
              colorKey="inReview"
              onCardPress={onPress ? () => onPress('inReview') : null}
            />
          </View>
        </>
      )}

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={styles.statBarItem}>
          <View style={[styles.statBarDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.statBarText, { color: theme.text }]}>
            {completed}
          </Text>
          <Text style={[styles.statBarLabel, { color: theme.textSecondary }]}>
            Completadas
          </Text>
        </View>
        <View style={styles.statBarDivider} />
        <View style={styles.statBarItem}>
          <Text style={[styles.statBarPercentage, { color: theme.primary }]}>
            {pending > 0 ? Math.round((pending / (completed + pending + inProgress + inReview || 1)) * 100) : 0}%
          </Text>
          <Text style={[styles.statBarLabel, { color: theme.textSecondary }]}>
            Pendientes
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowFlex: {
    justifyContent: 'space-between',
  },
  stateCardWrapper: {
    flex: 1,
  },
  stateCardWrapperDesktop: {
    maxWidth: 'calc(25% - 10px)',
  },
  stateCard: {
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    minHeight: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  stateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  stateIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateCardContent: {
    alignItems: 'flex-start',
  },
  stateValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  stateLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  statBarItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  statBarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statBarPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  statBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statBarDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 8,
  },
});
