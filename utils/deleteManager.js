/**
 * utils/deleteManager.js
 * Extracted delete tracking logic from TasksContext
 * Handles: deleting tasks, tracking state, persistence
 * Compatible with web (localStorage) and native (AsyncStorage)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DELETED_TASKS_KEY = 'permanentlyDeletedTaskIds';

class DeleteManager {
  constructor() {
    this.deletingTasks = new Set();
    this.permanentlyDeleted = new Set();

    if (Platform.OS === 'web') {
      this.permanentlyDeleted = this._loadFromLocalStorage();
    } else {
      this._loadFromAsyncStorage();
    }
  }

  _loadFromLocalStorage() {
    try {
      const arr = JSON.parse(localStorage.getItem(DELETED_TASKS_KEY) || '[]');
      return new Set(arr);
    } catch (e) {
      return new Set();
    }
  }

  async _loadFromAsyncStorage() {
    try {
      const json = await AsyncStorage.getItem(DELETED_TASKS_KEY);
      const arr = JSON.parse(json || '[]');
      arr.forEach(id => this.permanentlyDeleted.add(id));
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Save permanently deleted tasks to storage
   */
  savePermanent() {
    const arr = Array.from(this.permanentlyDeleted);
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(arr));
      } catch (e) {
        // Silent fail
      }
    } else {
      AsyncStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(arr)).catch(() => {});
    }
  }

  /**
   * Mark a task as being deleted (temporary state)
   */
  markDeleting(taskId) {
    this.deletingTasks.add(taskId);
  }

  /**
   * Confirm task as permanently deleted
   */
  confirmDelete(taskId) {
    this.deletingTasks.delete(taskId);
    this.permanentlyDeleted.add(taskId);
    this.savePermanent();
  }

  /**
   * Cancel delete operation
   */
  cancelDelete(taskId) {
    this.deletingTasks.delete(taskId);
  }

  /**
   * Check if task should be hidden
   */
  isHidden(taskId) {
    return this.deletingTasks.has(taskId) || this.permanentlyDeleted.has(taskId);
  }

  /**
   * Restore a permanently deleted task
   */
  restoreTask(taskId) {
    if (this.permanentlyDeleted.has(taskId)) {
      this.permanentlyDeleted.delete(taskId);
      this.savePermanent();
      return true;
    }
    return false;
  }

  /**
   * Clear permanently deleted tasks (sync recovery)
   */
  clearDeleted(taskId) {
    this.permanentlyDeleted.delete(taskId);
    this.savePermanent();
  }

  /**
   * Filter tasks excluding deleted ones
   */
  filterVisible(tasks) {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => !this.isHidden(task.id));
  }

  /**
   * Reset all delete tracking (for logout/cleanup)
   */
  reset() {
    this.deletingTasks.clear();
    this.permanentlyDeleted.clear();
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(DELETED_TASKS_KEY); } catch (e) {}
    } else {
      AsyncStorage.removeItem(DELETED_TASKS_KEY).catch(() => {});
    }
  }
}

// Singleton instance
export const deleteManager = new DeleteManager();
