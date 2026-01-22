// services/export.js
// Servicio para exportar tareas a CSV/Excel
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Exportar tareas a formato CSV
 * @param {Array} tasks - Array de tareas
 * @param {string} filename - Nombre del archivo (opcional)
 */
export async function exportTasksToCSV(tasks, filename = 'tareas') {
  try {
    // Construir CSV
    const headers = ['Título', 'Descripción', 'Asignado a', 'Área', 'Prioridad', 'Estado', 'Fecha vencimiento', 'Fecha creación'];
    const rows = tasks.map(task => [
      `"${task.title || ''}"`,
      `"${task.description || ''}"`,
      `"${task.assignedTo || ''}"`,
      `"${task.area || ''}"`,
      `"${task.priority || ''}"`,
      `"${task.status || ''}"`,
      task.dueAt ? new Date(task.dueAt).toLocaleString('es-ES') : '',
      task.createdAt ? new Date(task.createdAt.toMillis ? task.createdAt.toMillis() : task.createdAt).toLocaleString('es-ES') : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    if (Platform.OS === 'web') {
      // Exportar en web
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, message: 'Archivo descargado' };
    } else {
      // Exportar en móvil
      const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar tareas',
          UTI: 'public.comma-separated-values-text'
        });
      }
      
      return { success: true, message: 'Archivo compartido', fileUri };
    }
  } catch (error) {
    console.error('Error exportando CSV:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exportar reporte de estadísticas a CSV
 * @param {Object} stats - Objeto con estadísticas
 * @param {Array} tasksByArea - Tareas agrupadas por área
 */
export async function exportStatsToCSV(stats, tasksByArea) {
  try {
    const sections = [];
    
    // Sección 1: Resumen general
    sections.push('RESUMEN GENERAL');
    sections.push(`Total de tareas,${stats.total}`);
    sections.push(`Completadas,${stats.completed}`);
    sections.push(`Pendientes,${stats.pending}`);
    sections.push(`En proceso,${stats.inProgress}`);
    sections.push(`En revisión,${stats.inReview}`);
    sections.push(`Vencidas,${stats.overdue}`);
    sections.push('');
    
    // Sección 2: Por área
    sections.push('TAREAS POR ÁREA');
    sections.push('Área,Pendiente,En proceso,En revisión,Cerrada,Vencidas,Total');
    Object.keys(tasksByArea).forEach(area => {
      const data = tasksByArea[area];
      sections.push(`${area},${data.pendiente},${data.en_proceso},${data.en_revision},${data.cerrada},${data.vencidas},${data.total}`);
    });
    
    const csvContent = sections.join('\n');
    const filename = `reporte_estadisticas_${new Date().toISOString().split('T')[0]}`;
    
    return await exportCSVContent(csvContent, filename);
  } catch (error) {
    console.error('Error exportando estadísticas:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Función auxiliar para exportar contenido CSV
 */
async function exportCSVContent(content, filename) {
  if (Platform.OS === 'web') {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, message: 'Archivo descargado' };
  } else {
    const fileUri = `${FileSystem.documentDirectory}${filename}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar reporte'
      });
    }
    
    return { success: true, message: 'Archivo compartido', fileUri };
  }
}
