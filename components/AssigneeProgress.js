// components/AssigneeProgress.js
// Muestra el progreso de confirmación individual por cada asignado

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AssigneeProgress = ({ 
  assignees = [], // [{email, displayName, completed, completedAt}]
  currentUserEmail = null,
  onConfirm = null, // Callback cuando el usuario confirma su parte
  onRemoveConfirmation = null, // Callback para admin quitar confirmación
  isAdmin = false,
  compact = false
}) => {
  const confirmedCount = assignees.filter(a => a.completed).length;
  const totalCount = assignees.length;
  const progress = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;
  
  const currentUserAssignee = assignees.find(
    a => a.email.toLowerCase() === currentUserEmail?.toLowerCase()
  );
  const currentUserCompleted = currentUserAssignee?.completed || false;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (totalCount === 0) return null;
  
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactProgressBar}>
          <View style={[styles.compactProgressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.compactText}>
          {confirmedCount}/{totalCount} confirmaron
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="people" size={18} color="#6366F1" />
          <Text style={styles.title}>Confirmaciones por asignado</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{confirmedCount}/{totalCount}</Text>
        </View>
      </View>
      
      {/* Barra de progreso */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progress}%` },
              progress === 100 && styles.progressComplete
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
      </View>
      
      {/* Lista de asignados */}
      <View style={styles.assigneesList}>
        {assignees.map((assignee, index) => (
          <View 
            key={assignee.email} 
            style={[
              styles.assigneeItem,
              assignee.completed && styles.assigneeItemCompleted,
              assignee.email.toLowerCase() === currentUserEmail?.toLowerCase() && styles.assigneeItemCurrent
            ]}
          >
            <View style={styles.assigneeInfo}>
              <View style={[
                styles.statusIcon,
                assignee.completed ? styles.statusCompleted : styles.statusPending
              ]}>
                <Ionicons 
                  name={assignee.completed ? "checkmark" : "time-outline"} 
                  size={14} 
                  color={assignee.completed ? "#FFFFFF" : "#9CA3AF"} 
                />
              </View>
              <View style={styles.assigneeTextContainer}>
                <Text style={[
                  styles.assigneeName,
                  assignee.completed && styles.assigneeNameCompleted
                ]}>
                  {assignee.displayName}
                  {assignee.email.toLowerCase() === currentUserEmail?.toLowerCase() && (
                    <Text style={styles.youLabel}> (Tú)</Text>
                  )}
                </Text>
                {assignee.completed && assignee.completedAt && (
                  <Text style={styles.completedAt}>
                    Confirmó: {formatDate(assignee.completedAt)}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Botón para admin quitar confirmación */}
            {isAdmin && assignee.completed && onRemoveConfirmation && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => onRemoveConfirmation(assignee.email)}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      
      {/* Botón para que el usuario actual confirme */}
      {currentUserEmail && currentUserAssignee && !currentUserCompleted && onConfirm && (
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={onConfirm}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>Confirmar mi parte completada</Text>
        </TouchableOpacity>
      )}
      
      {currentUserCompleted && (
        <View style={styles.confirmedBanner}>
          <Ionicons name="checkmark-done" size={20} color="#10B981" />
          <Text style={styles.confirmedBannerText}>Ya confirmaste tu parte</Text>
        </View>
      )}
      
      {progress === 100 && (
        <View style={styles.allCompleteBanner}>
          <Ionicons name="trophy" size={20} color="#F59E0B" />
          <Text style={styles.allCompleteBannerText}>
            Todos han confirmado - Listo para revisión del admin
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  progressComplete: {
    backgroundColor: '#10B981',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 40,
    textAlign: 'right',
  },
  assigneesList: {
    gap: 8,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assigneeItemCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  assigneeItemCurrent: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  statusIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: '#10B981',
  },
  statusPending: {
    backgroundColor: '#E5E7EB',
  },
  assigneeTextContainer: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  assigneeNameCompleted: {
    color: '#059669',
  },
  youLabel: {
    color: '#6366F1',
    fontWeight: '700',
  },
  completedAt: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmedBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  allCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  allCompleteBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B45309',
    flex: 1,
    textAlign: 'center',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  compactText: {
    fontSize: 12,
    color: '#6B7280',
    minWidth: 80,
  },
});

export default memo(AssigneeProgress);
