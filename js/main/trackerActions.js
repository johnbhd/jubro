import { closeMenu, UIState } from './ui.js';
import { normalizeCellValue } from '../services/trackerData.js';

export const trackerActionMethods = {
showToast(message) {
    const toast = document.getElementById('jubroToast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2600);
  },

refresh({ persist = true } = {}) {
    const tracker = this.getTracker();

    if (!tracker) return;

    if (persist && this.save() === false) {
      this.reloadStateFromStorage();
      return false;
    }

    this.renderSelectTextSortOptions();
    this.renderSelectValueFilterOptions();
    this.updateSelectTextSortVisibility();
    this.renderKanban(tracker);
    this.renderListView(tracker);
    this.updateListFilterChipStyles();
    this.updateBoardView();
    this.titleInput.value = tracker.title;
    this.applySearchFilter();
    if (this.dashboardModal && !this.dashboardModal.classList.contains('hidden')) {
      this.renderDashboard();
    }

    return true;
  },

clearSortControls() {
    if (this.sortSelect) {
      this.sortSelect.value = '';
    }

    if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }

    this.updateSelectTextSortVisibility();
  },

getMoveTargetIndex(index, length) {
    if (!Number.isInteger(index) || length <= 0) return -1;

    return Math.max(0, Math.min(index, length - 1));
  },

moveArrayItem(items, fromIndex, toIndex) {
    if (!Array.isArray(items)) return false;

    const targetIndex = this.getMoveTargetIndex(toIndex, items.length);

    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= items.length) return false;
    if (targetIndex === -1 || fromIndex === targetIndex) return false;

    const [item] = items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, item);

    return targetIndex;
  },

swapArrayItems(items, firstIndex, secondIndex) {
    if (!Array.isArray(items)) return false;
    if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex)) return false;
    if (firstIndex < 0 || secondIndex < 0) return false;
    if (firstIndex >= items.length || secondIndex >= items.length) return false;
    if (firstIndex === secondIndex) return false;

    [items[firstIndex], items[secondIndex]] = [items[secondIndex], items[firstIndex]];

    return secondIndex;
  },

getVisibleRowIndexes() {
    return Array.from(document.querySelectorAll(this.getBoardRowSelector()))
      .filter((rowElement) => !rowElement.classList.contains('hidden'))
      .map((rowElement) => Number(rowElement.dataset.rowIndex))
      .filter((rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0);
  },

getVisibleMoveTargetRowIndex(rowIndex, direction) {
    const visibleRowIndexes = this.getVisibleRowIndexes();
    const visibleIndex = visibleRowIndexes.indexOf(rowIndex);

    if (visibleIndex === -1) {
      return rowIndex + direction;
    }

    return visibleRowIndexes[visibleIndex + direction] ?? null;
  },

  persistRowMove({ manualRows = false } = {}) {
    this.clearSortControls();
    if (manualRows && typeof this.setListManualSort === 'function') {
      this.setListManualSort();
    }
    const sync = this.save();

    if (sync === false) {
      this.reloadStateFromStorage();
      closeMenu();
      return sync;
    }

    this.refresh({ persist: false });
    closeMenu();

    return sync;
  },

reorderRow(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;

    const movedToIndex = this.moveArrayItem(tracker.rows, fromIndex, toIndex);

    if (movedToIndex === false) return;

    UIState.activeRow = movedToIndex;
    UIState.activeCol = null;
    UIState.activeType = 'row';

    this.persistRowMove({ manualRows: true });
  },

swapRows(firstIndex, secondIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;

    const movedToIndex = this.swapArrayItems(tracker.rows, firstIndex, secondIndex);

    if (movedToIndex === false) return;

    UIState.activeRow = movedToIndex;
    UIState.activeCol = null;
    UIState.activeType = 'row';

    this.persistRowMove({ manualRows: true });
  },

copyRow() {
    const tracker = this.getTracker();
    const { activeRow } = UIState;
  
    if (activeRow === null) return;
  
    const row = tracker.rows[activeRow];
  
    const newRow = row.map(cell =>
      typeof cell === 'object'
        ? {
            value: cell.value,
            type: cell.type,
            options: cell.options ? [...cell.options] : undefined
          }
        : cell
    );
  
    tracker.rows.splice(activeRow + 1, 0, newRow);
  
    this.refresh();
    closeMenu();
  },

addRow({ useJobDefaults = false, insertAtStart = false } = {}) {
    const tracker = this.getTracker();
    const { activeRow } = UIState;

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) {
      return false;
    }
  
    const newRow = tracker.columns.map((column) => {
      const type = typeof column === 'object' && column.type
        ? column.type
        : 'text';

      return {
        value: normalizeCellValue(type, null),
        type
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
        String(now.getDate()).padStart(2, '0')
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
  
    const insertIndex = insertAtStart
      ? 0
      : activeRow !== null
        ? activeRow + 1
        : tracker.rows.length;
  
    tracker.rows.splice(insertIndex, 0, newRow);
  
    const refreshResult = this.refresh();
    closeMenu();

    if (useJobDefaults && refreshResult !== false && typeof this.showToast === 'function') {
      this.showToast('New application created.');
    }

    return refreshResult !== false;
  },

moveUp() {
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null) return;

    if (this.viewSelect?.value === 'list' && typeof this.moveListRow === 'function') {
      this.moveListRow(activeRow, -1);
      return;
    }

    const targetRow = this.getVisibleMoveTargetRowIndex(activeRow, -1);

    if (targetRow === null || targetRow < 0) return;

    this.swapRows(activeRow, targetRow);
  },

moveDown() {
    const tracker = this.getTracker();
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null) return;

    if (this.viewSelect?.value === 'list' && typeof this.moveListRow === 'function') {
      this.moveListRow(activeRow, 1);
      return;
    }

    const targetRow = this.getVisibleMoveTargetRowIndex(activeRow, 1);

    if (targetRow === null || targetRow >= tracker.rows.length) return;

    this.swapRows(activeRow, targetRow);
  },

deleteRow() {
    const tracker = this.getTracker();

    if (UIState.activeRow !== null) {
      tracker.rows.splice(UIState.activeRow, 1);
    }

    this.refresh();
    closeMenu();
  },

};
