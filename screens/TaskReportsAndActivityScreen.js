import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToTaskReports, subscribeToTaskActivity, rateTaskReport } from '../services/reportsService';
import { getCurrentSession } from '../services/authFirestore';
import ReportFormModal from '../components/ReportFormModal';
import ExportReportModal from '../components/ExportReportModal';
import Toast from '../components/Toast';

const { width } = Dimensions.get('window');

const TaskReportsAndActivityScreen = ({ route, navigation }) => {
  const { taskId, taskTitle } = route.params;
  const { theme, isDark } = useTheme();
  const [reports, setReports] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('reports'); // 'reports' or 'activity'
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#f5f5f5',
    },
    header: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 8,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#666' : '#999',
    },
    activeTabText: {
      color: theme.primary,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#333',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 13,
      color: isDark ? '#888' : '#666',
      textAlign: 'center',
      marginBottom: 24,
    },
    addButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.primary,
      borderRadius: 6,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    // Report styles
    reportCard: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      marginHorizontal: 12,
      marginVertical: 8,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      overflow: 'hidden',
    },
    reportHeader: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reportTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      flex: 1,
    },
    reportMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    reportDate: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 12,
      color: isDark ? '#fff' : '#333',
      fontWeight: '600',
    },
    reportContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#272727' : '#f0f0f0',
    },
    reportDescription: {
      fontSize: 13,
      color: isDark ? '#ccc' : '#333',
      lineHeight: 20,
      marginBottom: 12,
    },
    imagesContainer: {
      marginBottom: 12,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    reportImage: {
      width: (width - 48) / 2,
      height: (width - 48) / 2,
      borderRadius: 8,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
    },
    ratingSection: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#272727' : '#f0f0f0',
      paddingTop: 10,
      marginTop: 10,
    },
    ratingLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#888' : '#666',
      marginBottom: 8,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 6,
    },
    starButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    starActive: {
      backgroundColor: '#FFD700',
    },
    // Activity styles
    activityItem: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#272727' : '#f0f0f0',
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityAction: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
    },
    activityDetails: {
      fontSize: 12,
      color: isDark ? '#aaa' : '#555',
      marginTop: 4,
      fontStyle: 'italic',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentSession();
        setCurrentUser(user);

        // Subscribe to reports
        const unsubReports = subscribeToTaskReports(taskId, setReports);

        // Subscribe to activities
        const unsubActivity = subscribeToTaskActivity(taskId, setActivities);

        setLoading(false);

        return () => {
          unsubReports?.();
          unsubActivity?.();
        };
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [taskId]);

  const handleRateReport = (reportId, rating) => {
    Alert.alert(
      'Rate Report',
      'Provide additional feedback',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await rateTaskReport(taskId, reportId, rating, '', currentUser.uid);
              setToastMessage('Report rated successfully!');
              setExpandedReportId(null);
            } catch (error) {
              setToastMessage('Error rating report: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const getActivityIcon = (action) => {
    const iconMap = {
      created: 'add-circle',
      updated: 'create',
      completed: 'checkmark-circle',
      report_created: 'document',
      report_rated: 'star',
      comment_added: 'chatbubble',
      status_changed: 'refresh-circle',
    };
    return iconMap[action] || 'information-circle';
  };

  const getActivityLabel = (action) => {
    const labelMap = {
      created: 'Task Created',
      updated: 'Task Updated',
      completed: 'Task Completed',
      report_created: 'Report Submitted',
      report_rated: 'Report Rated',
      comment_added: 'Comment Added',
      status_changed: 'Status Changed',
    };
    return labelMap[action] || action;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000 || timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  const renderReportCard = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() =>
        setExpandedReportId(expandedReportId === item.id ? null : item.id)
      }
    >
      <View style={styles.reportHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{item.title}</Text>
          <View style={styles.reportMeta}>
            <Ionicons name="time-outline" size={12} color={isDark ? '#888' : '#666'} />
            <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
            {item.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}/5</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name={expandedReportId === item.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.primary}
        />
      </View>

      {expandedReportId === item.id && (
        <View style={styles.reportContent}>
          <Text style={styles.reportDescription}>{item.description}</Text>

          {item.images && item.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={[styles.ratingLabel, { marginBottom: 8 }]}>
                Evidence Photos ({item.images.length})
              </Text>
              <View style={styles.imageGrid}>
                {item.images.map((image, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: image.url }}
                    style={styles.reportImage}
                  />
                ))}
              </View>
            </View>
          )}

          {!item.rating && currentUser?.isAdmin && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate this report</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => handleRateReport(item.id, star)}
                  >
                    <Ionicons
                      name={star <= item.rating ? 'star' : 'star-outline'}
                      size={18}
                      color={star <= (item.rating || 0) ? '#000' : isDark ? '#666' : '#ccc'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: theme.primary }]}>
        <Ionicons
          name={getActivityIcon(item.action)}
          size={20}
          color="#fff"
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>
          {getActivityLabel(item.action)}
        </Text>
        <Text style={styles.activityTime}>
          {formatDate(item.timestamp)}
        </Text>
        {item.details && Object.keys(item.details).length > 0 && (
          <Text style={styles.activityDetails}>
            {JSON.stringify(item.details).substring(0, 60)}...
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{taskTitle}</Text>
          <Text style={{ fontSize: 13, color: isDark ? '#888' : '#666' }}>
            Reports & Activity History
          </Text>
        </View>
        {reports.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSelectedReport(reports[0]);
              setShowExportModal(true);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: theme.primary,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="download" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'reports' && styles.activeTab]}
          onPress={() => setTab('reports')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'reports' && styles.activeTabText,
            ]}
          >
            Reports ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'activity' && styles.activeTab]}
          onPress={() => setTab('activity')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'activity' && styles.activeTabText,
            ]}
          >
            Activity ({activities.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {tab === 'reports' ? (
          reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={48}
                color={isDark ? '#333' : '#ddd'}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyText}>No Reports Yet</Text>
              <Text style={styles.emptySubtext}>
                Submit a report with photos and details about task completion
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowReportForm(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={reports}
              renderItem={renderReportCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8 }}
              ListFooterComponent={
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      marginHorizontal: 12,
                      marginVertical: 12,
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() => setShowReportForm(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add Another Report</Text>
                </TouchableOpacity>
              }
            />
          )
        ) : (
          <FlatList
            data={activities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              activities.length === 0 ? { flex: 1 } : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={isDark ? '#333' : '#ddd'}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>No Activity Yet</Text>
                <Text style={styles.emptySubtext}>
                  Activity history will appear here
                </Text>
              </View>
            }
          />
        )}
      </View>

      <ReportFormModal
        visible={showReportForm}
        onClose={() => setShowReportForm(false)}
        taskId={taskId}
        onSuccess={() => {
          setToastMessage('Report submitted successfully!');
        }}
      />

      <ExportReportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        report={selectedReport}
        task={{ titulo: taskTitle }}
        allReports={reports}
      />

      <Toast
        message={toastMessage}
        onDismiss={() => setToastMessage('')}
      />
    </View>
  );
};

export default TaskReportsAndActivityScreen;
