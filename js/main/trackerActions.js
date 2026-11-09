import { closeMenu, UIState } from './ui.js';
import { normalizeCellValue } from '../services/trackerData.js';
import { getKanbanColumns, getKanbanStatusColumn } from './kanban.js';
import { showToast as presentToast } from '../toast.js';

export const trackerActionMethods = {
  moveApplicationByDirection(rowIndex, direction) {
    if (![-1, 1].includes(direction)) return false;
    const isList = this.viewSelect?.value === 'list';
    const root = isList ? this.listCards : this.kanbanColumns;
    const elements = [...root.querySelectorAll('[data-row-index]')];
    const source = elements.find(card => Number(card.dataset.rowIndex) === rowIndex);
    const column = isList ? null : source?.closest('.kanban-column');
    const visible = elements.filter(card => (
      !card.classList.contains('hidden') && (isList || card.closest('.kanban-column') === column)
    ));
    const index = visible.indexOf(source);
    const target = index < 0 ? null : visible[index + direction];
    if (!target) return false;
    const targetIndex = Number(target.dataset.rowIndex);
    const alreadyPlaced = direction < 0 ? rowIndex === targetIndex - 1 : rowIndex === targetIndex + 1;
    if (isList && this.listSortSelect?.value !== 'manual' && alreadyPlaced) {
      // The requested visible move is already stored; only leave automatic sorting.
      this.setListManualSort();
      this.refresh({ persist: false });
      return true;
    }
    try {
      return this.repositionApplication({
        sourceIndex: rowIndex,
        targetIndex,
        placement: direction < 0 ? 'before' : 'after',
      });
    } catch {
      this.showToast('Could not move application. Saved data has been restored.');
      return false;
    }
  },

  repositionApplication({ sourceIndex, targetIndex = null, placement = 'after', statusValue }) {
    const tracker = this.getTracker();
    const rows = tracker?.rows;
    const source = rows?.[sourceIndex];

    if (!Array.isArray(rows) || !Number.isInteger(sourceIndex) || !Array.isArray(source)) return false;
    if (!['before', 'after'].includes(placement)) return false;
    if (targetIndex !== null && (!Number.isInteger(targetIndex) || !Array.isArray(rows[targetIndex]))) return false;

    const statusColumn = getKanbanStatusColumn(tracker);
    const normalizeStatus = value => String(value ?? '').trim().toLowerCase();
    const rowStatus = row => {
      const cell = row[statusColumn.index];
      return normalizeStatus(cell && typeof cell === 'object' ? cell.value : cell);
    };
    let nextStatus;

    if (statusValue !== undefined) {
      if (!statusColumn || typeof statusValue !== 'string') return false;
      const status = getKanbanColumns(tracker).find(column => (
        normalizeStatus(column.value) === normalizeStatus(statusValue)
      ));
      // Blank remains a valid destination even before a fallback column exists.
      if (!status && statusValue !== '') return false;
      nextStatus = status?.value ?? '';
      if (targetIndex !== null && rowStatus(rows[targetIndex]) !== normalizeStatus(nextStatus)) return false;
    }

    const statusChanged = nextStatus !== undefined && rowStatus(source) !== normalizeStatus(nextStatus);
    if (targetIndex === null && nextStatus !== undefined && !statusChanged
      && rows.findLastIndex(row => rowStatus(row) === normalizeStatus(nextStatus)) === sourceIndex) {
      return false;
    }

    const remaining = rows.filter((row, index) => index !== sourceIndex);
    let insertionIndex = remaining.length;

    if (targetIndex !== null) {
      if (targetIndex === sourceIndex) return false;
      insertionIndex = remaining.indexOf(rows[targetIndex]) + (placement === 'after' ? 1 : 0);
    } else if (nextStatus !== undefined) {
      const lastDestination = remaining.findLastIndex(row => rowStatus(row) === normalizeStatus(nextStatus));
      if (lastDestination >= 0) insertionIndex = lastDestination + 1;
    }

    remaining.splice(insertionIndex, 0, source);
    const orderChanged = remaining.some((row, index) => row !== rows[index]);

    if (!orderChanged && !statusChanged) return false;

    if (statusChanged) {
      const cell = source[statusColumn.index];
      source[statusColumn.index] = {
        ...(cell && typeof cell === 'object' ? cell : {}),
        value: normalizeCellValue('select', nextStatus),
        type: 'select',
      };
    }
    rows.splice(0, rows.length, ...remaining);

    try {
      if (this.save() === false) {
        this.reloadStateFromStorage();
        return false;
      }
    } catch (failure) {
      this.reloadStateFromStorage();
      throw failure;
    }

    UIState.activeRow = insertionIndex;
    UIState.activeCol = null;
    UIState.activeType = 'row';
    if (orderChanged) this.setListManualSort();
    this.refresh({ persist: false });
    return true;
  },

showToast(message) {
    presentToast(message);
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
    if (this.titleInput) this.titleInput.value = tracker.title;
    this.renderJobSearchSelector?.();
    this.applySearchFilter();
    if (this.dashboardModal && !this.dashboardModal.classList.contains('hidden')) {
      this.renderDashboard();
    }

    return true;
  },

clearSortControls() {
    if (this.sortSelect) {
      this.sortSelect.value = '';
      this.syncSortSelectWidth?.(this.sortSelect);
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

addRow({ insertAtStart = false } = {}) {
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

  
    const insertIndex = insertAtStart
      ? 0
      : activeRow !== null
        ? activeRow + 1
        : tracker.rows.length;
  
    tracker.rows.splice(insertIndex, 0, newRow);
  
    const refreshResult = this.refresh();
    closeMenu();

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
