import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { getReportStatistics } from '../services/reportsService';
import { getOverallTaskMetrics, subscribeToTasks } from '../services/tasks';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [reportStats, setReportStats] = useState(null);
  const [taskMetrics, setTaskMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#f5f5f5',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
    },
    headerSubtitle: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginTop: 4,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      marginHorizontal: 12,
      marginVertical: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#fff' : '#000',
      marginBottom: 10,
      marginTop: 8,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
    metricCard: {
      width: (width - 44) / 2,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    metricCardGradient: {
      borderRadius: 12,
      padding: 12,
      width: (width - 44) / 2,
    },
    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    metricLabel: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
    },
    metricSubvalue: {
      fontSize: 11,
      color: isDark ? '#666' : '#999',
      marginTop: 2,
    },
    ratingContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    ratingTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 8,
    },
    ratingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
    },
    ratingLabel: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      width: 30,
    },
    ratingBarBackground: {
      flex: 1,
      height: 8,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
    },
    ratingCount: {
      fontSize: 11,
      color: isDark ? '#666' : '#999',
      minWidth: 40,
      textAlign: 'right',
    },
    heatmapContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    heatmapTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 10,
    },
    heatmapGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    heatmapCell: {
      width: 32,
      height: 32,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heatmapLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: '#fff',
    },
    chartContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    chartTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 12,
    },
    chartBar: {
      marginBottom: 10,
    },
    chartBarLabel: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginBottom: 4,
    },
    chartBarBackground: {
      height: 20,
      backgroundColor: isDark ? '#272727' : '#f0f0f0',
      borderRadius: 4,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    chartBarSegment: {
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    topTasksContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 12,
      padding: 0,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e0e0e0',
      overflow: 'hidden',
    },
    topTaskItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#272727' : '#f0f0f0',
    },
    topTaskTitle: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#fff' : '#000',
      marginBottom: 6,
    },
    topTaskMeta: {
      fontSize: 11,
      color: isDark ? '#888' : '#666',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load report statistics
        const stats = await getReportStatistics();
        setReportStats(stats);

        // Load task metrics
        const metrics = await getOverallTaskMetrics();
        setTaskMetrics(metrics);

        // Subscribe to tasks for top performers
        const unsubTasks = subscribeToTasks((allTasks) => {
          // Get top 5 tasks with highest ratings
          const topTasks = allTasks
            .filter((t) => t.qualityRating)
            .sort((a, b) => (b.qualityRating || 0) - (a.qualityRating || 0))
            .slice(0, 5);
          setTasks(topTasks);
        });

        setLoading(false);

        return () => unsubTasks?.();
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getRatingDistribution = () => {
    if (!reportStats) return {};
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reportStats.reports.forEach((report) => {
      if (report.rating) {
        distribution[report.rating]++;
      }
    });
    return distribution;
  };

  const ratingDist = getRatingDistribution();
  const totalRated = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <View style={[styles.container]}>
        <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSubtitle}>
            Overall project insights and performance metrics
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="document" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.metricLabel}>Total Reports</Text>
              <Text style={styles.metricValue}>{reportStats?.totalReports || 0}</Text>
              <Text style={styles.metricSubvalue}>
                {reportStats?.withImages || 0} with images
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="star" size={20} color="#E91E63" />
              </View>
              <Text style={styles.metricLabel}>Avg Rating</Text>
              <Text style={styles.metricValue}>
                {reportStats?.avgRating?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.metricSubvalue}>
                from {reportStats?.ratedReports || 0} reports
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="checkmark-done" size={20} color="#2196F3" />
              </View>
              <Text style={styles.metricLabel}>Tasks</Text>
              <Text style={styles.metricValue}>{taskMetrics?.total || 0}</Text>
              <Text style={styles.metricSubvalue}>
                {taskMetrics?.completed || 0} completed
              </Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="trending-up" size={20} color="#FF9800" />
              </View>
              <Text style={styles.metricLabel}>Completion</Text>
              <Text style={styles.metricValue}>
                {taskMetrics?.completionPercentage?.toFixed(0) || 0}%
              </Text>
              <Text style={styles.metricSubvalue}>Overall progress</Text>
            </View>
          </View>
        </View>

        {/* Rating Distribution */}
        {totalRated > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quality Rating Distribution</Text>
            <View style={styles.ratingContainer}>
              {[5, 4, 3, 2, 1].map((rating) => (
                <View key={rating} style={styles.ratingBar}>
                  <Text style={styles.ratingLabel}>{rating}⭐</Text>
                  <View style={styles.ratingBarBackground}>
                    <View
                      style={[
                        styles.ratingBarFill,
                        {
                          width: `${(ratingDist[rating] / totalRated) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingCount}>
                    {ratingDist[rating]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Task Status Distribution */}
        {taskMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Status</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chartBar}>
                <View style={styles.chartBarLabel}>
                  <Text style={styles.chartBarLabel}>
                    Completed: {taskMetrics.completed}
                  </Text>
                </View>
                <View style={styles.chartBarBackground}>
                  <View
                    style={[
                      styles.chartBarSegment,
                      {
                        width: `${(taskMetrics.completed / taskMetrics.total) * 100}%`,
                        backgroundColor: '#4CAF50',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.chartBar}>
                <View style={styles.chartBarLabel}>
                  <Text style={styles.chartBarLabel}>
                    In Progress: {taskMetrics.inProgress}
                  </Text>
                </View>
                <View style={styles.chartBarBackground}>
                  <View
                    style={[
                      styles.chartBarSegment,
                      {
                        width: `${(taskMetrics.inProgress / taskMetrics.total) * 100}%`,
                        backgroundColor: '#FF9800',
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.chartBar}>
                <View style={styles.chartBarLabel}>
                  <Text style={styles.chartBarLabel}>
                    Pending: {taskMetrics.pending}
                  </Text>
                </View>
                <View style={styles.chartBarBackground}>
                  <View
                    style={[
                      styles.chartBarSegment,
                      {
                        width: `${(taskMetrics.pending / taskMetrics.total) * 100}%`,
                        backgroundColor: '#9C27B0',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Top Rated Tasks */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Rated Tasks</Text>
            <View style={styles.topTasksContainer}>
              {tasks.map((task, idx) => (
                <View
                  key={task.id}
                  style={[
                    styles.topTaskItem,
                    idx === tasks.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={styles.topTaskTitle}>
                      {idx + 1}. {task.titulo}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Ionicons
                        name="star"
                        size={14}
                        color="#FFD700"
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isDark ? '#fff' : '#000',
                        }}
                      >
                        {task.qualityRating}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.topTaskMeta}>
                    {task.area} • {task.prioridad}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

export default AnalyticsScreen;
