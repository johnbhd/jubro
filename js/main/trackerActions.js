import { normalizeCellValue } from '../services/trackerData.js';

export const trackerActionMethods = {
  refresh({ persist = true } = {}) {
    const tracker = this.getTracker();

    if (!tracker) {
      return;
    }

    if (persist && this.save() === false) {
      this.reloadStateFromStorage();
      return false;
    }

    this.renderSelectTextSortOptions();
    this.renderSelectValueFilterOptions();
    this.updateSelectTextSortVisibility();
    this.renderKanban(tracker);
    this.titleInput.value = tracker.title;
    this.applySearchFilter();

    if (this.dashboardModal && !this.dashboardModal.classList.contains('hidden')) {
      this.renderDashboard();
    }

    return true;
  },

  clearBoardSortControls() {
    if (this.sortSelect) {
      this.sortSelect.value = '';
    }

    if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }

    this.updateSelectTextSortVisibility();
  },

  getMoveTargetIndex(index, length) {
    if (!Number.isInteger(index) || length <= 0) {
      return -1;
    }

    return Math.max(0, Math.min(index, length - 1));
  },

  moveArrayItem(items, fromIndex, toIndex) {
    if (!Array.isArray(items)) {
      return false;
    }

    const targetIndex = this.getMoveTargetIndex(toIndex, items.length);

    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= items.length) {
      return false;
    }

    if (targetIndex === -1 || fromIndex === targetIndex) {
      return false;
    }

    const [item] = items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, item);

    return targetIndex;
  },

  addRow({ useJobDefaults = false, insertAtStart = false } = {}) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) {
      return;
    }

    const newRow = tracker.columns.map((column) => {
      const type = typeof column === 'object' && column.type
        ? column.type
        : 'text';

      return {
        value: normalizeCellValue(type, null),
        type,
      };
    });

    if (useJobDefaults) {
      const companyIndex = this.getColumnIndexByNames(tracker, ['company']);
      const positionIndex = this.getColumnIndexByNames(tracker, ['position', 'role', 'job title']);
      const dateIndex = this.getDateColumnIndex(tracker);
      const now = new Date();
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');

      if (companyIndex >= 0) {
        newRow[companyIndex] = { value: 'Company Name', type: 'text' };
      }

      if (positionIndex >= 0) {
        newRow[positionIndex] = { value: 'Position Role', type: 'text' };
      }

      if (dateIndex >= 0) {
        newRow[dateIndex] = { value: today, type: 'date' };
      }
    }

    const insertIndex = insertAtStart ? 0 : tracker.rows.length;
    tracker.rows.splice(insertIndex, 0, newRow);
    this.refresh();
  },

  deleteApplicationAt(rowIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) {
      return false;
    }

    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= tracker.rows.length) {
      return false;
    }

    tracker.rows.splice(rowIndex, 1);

    if (this.save() === false) {
      this.reloadStateFromStorage();
      return false;
    }

    this.refresh({ persist: false });
    return true;
  },

  moveApplication(rowIndex, direction) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) {
      return false;
    }

    const targetIndex = rowIndex + direction;

    if (!Number.isInteger(rowIndex) || targetIndex < 0 || targetIndex >= tracker.rows.length) {
      return false;
    }

    [tracker.rows[rowIndex], tracker.rows[targetIndex]] = [
      tracker.rows[targetIndex],
      tracker.rows[rowIndex],
    ];

    if (this.save() === false) {
      this.reloadStateFromStorage();
      return false;
    }

    this.refresh({ persist: false });
    return true;
  },
};
