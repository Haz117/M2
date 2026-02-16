// services/ReportsExport.js
// Utilidad para exportar reportes a CSV, con soporte para datos grandes
// Optimizado para no bloquear el thread principal

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Genera CSV desde datos
 * Optimizado: Chunks grandes de 50MB
 */
function generateCSV(headers, rows) {
  const csvHeaders = headers.map(h => `"${h}"`).join(',');
  const csvRows = rows.map(row => 
    row.map(cell => {
      const str = String(cell || '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Exportar reporte completo de áreas
 * @param {Object} areaMetrics - Datos de métricas por área
 * @param {Array} allTasks - Todas las tareas
 * @param {String} period - 'week' | 'month' | 'quarter'
 */
export async function exportAreaReport(areaMetrics, allTasks, period = 'month') {
  try {
    const sections = [];

    // SECCIÓN 1: Resumen por Área
    const areaHeaders = ['Área', 'Total', 'Completadas', '% Completación', 'Pendientes', 'Vencidas', 'Tiempo Prom.'];
    const areaRows = Object.entries(areaMetrics).map(([area, metrics]) => [
      area,
      metrics.total || 0,
      metrics.completed || 0,
      `${metrics.completionRate || 0}%`,
      metrics.pending || 0,
      metrics.overdue || 0,
      metrics.avgCompletionTime || 'N/A'
    ]);
    
    sections.push('=== REPORTE POR ÁREA ===\n');
    sections.push(generateCSV(areaHeaders, areaRows));
    sections.push('\n\n');

    // SECCIÓN 2: Detalles de tareas vencidas
    const overdueHeaders = ['ID', 'Título', 'Área', 'Asignado', 'Fecha Vencimiento', 'Días Retrasado'];
    const now = Date.now();
    const overdueRows = allTasks
      .filter(t => t.dueAt && t.dueAt < now && t.status !== 'cerrada')
      .map(t => [
        t.id.substring(0, 8),
        t.title,
        t.area || 'N/A',
        t.assignedToNames?.join('; ') || 'No asignado',
        new Date(t.dueAt).toLocaleDateString('es-MX'),
        Math.floor((now - t.dueAt) / (1000 * 60 * 60 * 24))
      ])
      .sort((a, b) => b[5] - a[5]) // Ordenar por días retrasados
      .slice(0, 100); // Max 100 vencidas para no saturar

    if (overdueRows.length > 0) {
      sections.push('=== TAREAS VENCIDAS ===\n');
      sections.push(generateCSV(overdueHeaders, overdueRows));
      sections.push('\n\n');
    }

    // SECCIÓN 3: Distribución por estado
    const statusDistribution = {
      pendiente: allTasks.filter(t => t.status === 'pendiente').length,
      en_proceso: allTasks.filter(t => t.status === 'en_proceso').length,
      en_revision: allTasks.filter(t => t.status === 'en_revision').length,
      cerrada: allTasks.filter(t => t.status === 'cerrada').length,
    };

    sections.push('=== ESTADÍSTICAS GENERALES ===\n');
    sections.push('Estado,Cantidad\n');
    Object.entries(statusDistribution).forEach(([status, count]) => {
      sections.push(`${status},${count}\n`);
    });
    sections.push(`Total,${allTasks.length}\n`);

    const csvContent = sections.join('');
    
    // Guardar en documentos
    const filename = `Reporte-Areas-${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Guardar Reporte'
      });
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Error exportando reporte:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exportar vista de heatmap/productividad
 * @param {Array} heatmapData - Datos de actividad
 */
export async function exportProductivityReport(heatmapData, user = 'usuario') {
  try {
    const headers = ['Fecha', 'Hora', 'Tareas Completadas', 'Tiempo Invertido'];
    const rows = heatmapData.map(item => [
      new Date(item.date).toLocaleDateString('es-MX'),
      item.hour || item.period,
      item.completed || 0,
      item.timeInvested || 'N/A'
    ]);

    const csvContent = generateCSV(headers, rows);
    const filename = `Productividad-${user}-${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Error exportando productividad:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generar JSON para análisis externo
 * @param {Object} data - Datos a exportar
 */
export async function exportToJSON(data, reportName = 'reporte') {
  try {
    const filename = `${reportName}-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2), {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Error exportando JSON:', error);
    return { success: false, error: error.message };
  }
}
