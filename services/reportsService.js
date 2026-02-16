// Services for task reports with images and evidence
import { 
  db, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  writeBatch
} from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

/**
 * Notificar a los admins sobre un nuevo reporte
 */
const notifyAdminsOfNewReport = async (taskId, reportId, reportTitle, createdByName) => {
  try {
    // Obtener info de la tarea
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    const taskData = taskDoc.exists() ? taskDoc.data() : {};
    const taskTitle = taskData.title || 'Tarea sin título';

    // Obtener todos los admins
    const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminsSnapshot = await getDocs(adminsQuery);

    // Crear notificación para cada admin
    const notifications = [];
    adminsSnapshot.forEach((adminDoc) => {
      const adminData = adminDoc.data();
      notifications.push({
        userId: adminDoc.id,
        userEmail: adminData.email,
        type: 'new_report',
        title: '📋 Nuevo Reporte Enviado',
        body: `${createdByName} envió un reporte: "${reportTitle}" para la tarea "${taskTitle}"`,
        taskId,
        reportId,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // Guardar todas las notificaciones
    for (const notification of notifications) {
      await addDoc(collection(db, 'notifications'), notification);
    }

    console.log(`✅ Notificación enviada a ${notifications.length} admin(s)`);
  } catch (error) {
    console.error('Error notificando a admins:', error);
    // No lanzar error para no interrumpir el flujo del reporte
  }
};

/**
 * Create a report for a task with images and evidence
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID creating report
 * @param {Object} reportData - Report data (title, description, images)
 * @returns {Promise<string>} Report ID
 */
export const createTaskReport = async (taskId, userId, reportData) => {
  try {
    // Obtener nombre del usuario que crea el reporte
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const createdByName = userData.displayName || userData.email || 'Usuario';

    const report = {
      taskId,
      createdBy: userId,
      createdByName: createdByName,
      title: reportData.title,
      description: reportData.description,
      images: reportData.images || [],
      rating: reportData.rating || null,
      ratingComment: reportData.ratingComment || '',
      status: 'submitted',
      attachments: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, 'task_reports'),
      report
    );

    // Add report reference to task
    await updateDoc(doc(db, 'tasks', taskId), {
      reports: arrayUnion(docRef.id),
      lastReportDate: serverTimestamp(),
    });

    // Log activity
    await logTaskActivity(taskId, userId, 'report_created', {
      reportId: docRef.id,
      title: report.title,
    });

    // Notificar a los admins
    await notifyAdminsOfNewReport(taskId, docRef.id, reportData.title, createdByName);

    return docRef.id;
  } catch (error) {
    console.error('Error creating task report:', error);
    throw error;
  }
};

/**
 * Upload image for task report
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @param {Object} imageData - Image data with uri
 * @returns {Promise<string>} Download URL
 */
export const uploadReportImage = async (taskId, reportId, imageData) => {
  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const storagePath = `task_reports/${taskId}/${reportId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Convert base64 to blob if needed
    let blob = imageData.blob;
    if (!blob && imageData.base64) {
      const bstr = atob(imageData.base64);
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      blob = new Blob([u8arr], { type: 'image/jpeg' });
    }

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Update report with image URL
    await updateDoc(doc(db, 'task_reports', reportId), {
      images: arrayUnion({
        url: downloadURL,
        uploadedAt: serverTimestamp(),
        uploadedBy: imageData.uploadedBy,
      }),
      updatedAt: serverTimestamp(),
    });

    return downloadURL;
  } catch (error) {
    console.error('Error uploading report image:', error);
    throw error;
  }
};

/**
 * Rate/evaluate completed task
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @param {number} rating - Rating 1-5
 * @param {string} comment - Optional comment
 * @param {string} ratedBy - User ID rating
 * @returns {Promise<void>}
 */
export const rateTaskReport = async (taskId, reportId, rating, comment = '', ratedBy) => {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await updateDoc(doc(db, 'task_reports', reportId), {
      rating,
      ratingComment: comment,
      ratedBy,
      ratedAt: serverTimestamp(),
      status: 'rated',
      updatedAt: serverTimestamp(),
    });

    // Update task with rating
    await updateDoc(doc(db, 'tasks', taskId), {
      qualityRating: rating,
      ratedAt: serverTimestamp(),
    });

    // Log activity
    await logTaskActivity(taskId, ratedBy, 'report_rated', {
      reportId,
      rating,
      comment,
    });
  } catch (error) {
    console.error('Error rating task report:', error);
    throw error;
  }
};

/**
 * Get task reports with real-time updates
 * @param {string} taskId - Task ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskReports = (taskId, callback) => {
  const q = query(
    collection(db, 'task_reports'),
    where('taskId', '==', taskId)
  );

  return onSnapshot(q, (snapshot) => {
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Sort by creation date descending
    reports.sort((a, b) => b.createdAt - a.createdAt);
    callback(reports);
  });
};

/**
 * Get all reports for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of reports
 */
export const getUserReports = async (userId) => {
  try {
    const q = query(
      collection(db, 'task_reports'),
      where('createdBy', '==', userId)
    );

    const snapshot = await getDocs(q);
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return reports;
  } catch (error) {
    console.error('Error getting user reports:', error);
    throw error;
  }
};

/**
 * Log task activity (audit trail)
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID performing action
 * @param {string} action - Action type (created, updated, completed, etc.)
 * @param {Object} details - Additional details
 * @returns {Promise<void>}
 */
export const logTaskActivity = async (taskId, userId, action, details = {}) => {
  try {
    await addDoc(collection(db, 'task_activity_log'), {
      taskId,
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging task activity:', error);
    throw error;
  }
};

/**
 * Get task activity history
 * @param {string} taskId - Task ID
 * @param {Function} callback - Callback for real-time updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskActivity = (taskId, callback) => {
  const q = query(
    collection(db, 'task_activity_log'),
    where('taskId', '==', taskId)
  );

  return onSnapshot(q, (snapshot) => {
    const activities = [];
    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    // Sort by timestamp descending (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    callback(activities);
  });
};

/**
 * Delete report
 * @param {string} taskId - Task ID
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export const deleteTaskReport = async (taskId, reportId) => {
  try {
    // Remove report reference from task
    const taskRef = doc(db, 'Tasks', taskId);
    const taskSnapshot = await getDocs(
      query(collection(db, 'Tasks'), where('__name__', '==', taskId))
    );

    if (!taskSnapshot.empty) {
      // In a real implementation, you'd filter the reports array
      // For now, we'll just mark the report as deleted
      await updateDoc(doc(db, 'task_reports', reportId), {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};

/**
 * Get report statistics
 * @param {string} area - Area name (optional)
 * @returns {Promise<Object>} Statistics
 */
export const getReportStatistics = async (area = null) => {
  try {
    let q;
    if (area) {
      q = query(
        collection(db, 'task_reports'),
        where('area', '==', area)
      );
    } else {
      q = collection(db, 'task_reports');
    }

    const snapshot = await getDocs(q);
    const reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) {
        reports.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Calculate statistics
    const totalReports = reports.length;
    const ratedReports = reports.filter((r) => r.rating).length;
    const avgRating = ratedReports > 0
      ? (reports.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReports).toFixed(2)
      : 0;
    const withImages = reports.filter((r) => r.images && r.images.length > 0).length;

    return {
      totalReports,
      ratedReports,
      avgRating: parseFloat(avgRating),
      withImages,
      reports,
    };
  } catch (error) {
    console.error('Error getting report statistics:', error);
    throw error;
  }
};
