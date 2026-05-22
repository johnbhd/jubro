import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';

export const trackerTableActionMethods = {
refresh({ persist = true } = {}) {
    const tracker = this.getTracker();

    if (!tracker) return;

    this.renderSelectTextSortOptions();
    this.renderSelectValueFilterOptions();
    this.updateSelectTextSortVisibility();
    this.applyCurrentSort();
    Table.render(tracker.columns, tracker.rows);
    this.renderListView(tracker);
    this.updateListFilterChipStyles();
    this.updateBoardView();
    this.titleInput.value = tracker.title;
    this.applySearchFilter();
    if (this.dashboardModal && !this.dashboardModal.classList.contains('hidden')) {
      this.renderDashboard();
    }

    if (persist) {
      this.save();
    }
  },

clearTableSortControls() {
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

reorderRow(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;

    const movedToIndex = this.moveArrayItem(tracker.rows, fromIndex, toIndex);

    if (movedToIndex === false) return;

    UIState.activeRow = movedToIndex;
    UIState.activeCol = null;
    UIState.activeType = 'row';

    this.clearTableSortControls();
    this.save();
    this.refresh({ persist: false });
    closeMenu();
  },

reorderColumn(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;

    const movedToIndex = this.moveArrayItem(tracker.columns, fromIndex, toIndex);

    if (movedToIndex === false) return;

    tracker.rows.forEach((row) => {
      if (!Array.isArray(row) || fromIndex >= row.length) return;

      const [cell] = row.splice(fromIndex, 1);
      row.splice(movedToIndex, 0, cell);
    });

    UIState.activeRow = null;
    UIState.activeCol = movedToIndex;
    UIState.activeType = 'col';

    this.clearTableSortControls();
    this.save();
    this.refresh({ persist: false });
    closeMenu();
  },

copyCol() {
    const tracker = this.getTracker();
    const { activeCol } = UIState;
  
    if (activeCol === null) return;
  
    const col = tracker.columns[activeCol];
  
    const newCol = {
      name: col.name ? col.name + " Copy" : col + " Copy",
      type: col.type || 'text',
      options: col.options ? [...col.options] : undefined
    };
  
    tracker.columns.splice(activeCol + 1, 0, newCol);
  
    tracker.rows.forEach(row => {
      const cell = row[activeCol];
  
      row.splice(activeCol + 1, 0, typeof cell === 'object'
        ? {
            value: cell.value,
            type: cell.type,
            options: cell.options ? [...cell.options] : undefined
          }
        : cell
      );
    });
  
    this.refresh();
    closeMenu();
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

setColumnType(type) {
    const tracker = this.getTracker();
    const { activeCol } = UIState;
  
    if (activeCol === null) return;

    const currentColumn = tracker.columns[activeCol];
    const columnName = typeof currentColumn === 'object' ? currentColumn.name : currentColumn;
    const existingOptions = Array.isArray(currentColumn?.options) ? currentColumn.options : [];

    tracker.columns[activeCol] = {
      name: columnName || 'New',
      type,
      ...(type === 'select'
        ? {
            options: existingOptions.length
              ? existingOptions
              : [{ label: 'Option 1', color: '#cccccc' }]
          }
        : {})
    };
  
    tracker.rows.forEach((row) => {
      const oldCell = row[activeCol];
  
      let value = typeof oldCell === 'object' ? oldCell.value : oldCell;
  
      if (type === 'checkbox') {
        value = false;
      }
  
      if (type === 'select') {
        row[activeCol] = {
          value: value || '',
          type: 'select'
        };
      } else {
        row[activeCol] = {
          value,
          type
        };
      }
    });
  
    this.refresh();
    closeMenu();
  },

addRow() {
    const tracker = this.getTracker();
    const { activeRow } = UIState;
  
    const newRow = tracker.columns.map(() => ({
      value: '',
      type: 'text'
    }));
  
    const insertIndex = activeRow !== null ? activeRow + 1 : tracker.rows.length;
  
    tracker.rows.splice(insertIndex, 0, newRow);
  
    this.refresh();
    closeMenu();
  },

addCol() {
    const tracker = this.getTracker();
    const { activeCol } = UIState;

    const insertIndex =
      activeCol !== null
        ? activeCol + 1
        : tracker.columns.length;

    tracker.columns.splice(insertIndex, 0, {
      name: 'New',
      type: 'text'
    });

    tracker.rows.forEach(row => {
      row.splice(insertIndex, 0, {
        value: '',
        type: 'text'
      });
    });

    this.refresh();
    closeMenu();
  },

moveUp() {
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === 0) return;

    this.reorderRow(activeRow, activeRow - 1);
  },

moveDown() {
    const tracker = this.getTracker();
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === tracker.rows.length - 1) return;

    this.reorderRow(activeRow, activeRow + 1);
  },

moveLeft() {
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === 0) return;

    this.reorderColumn(activeCol, activeCol - 1);
  },

moveRight() {
    const tracker = this.getTracker();
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === tracker.columns.length - 1) return;

    this.reorderColumn(activeCol, activeCol + 1);
  },

deleteRow() {
    const tracker = this.getTracker();

    if (UIState.activeRow !== null) {
      tracker.rows.splice(UIState.activeRow, 1);
    }

    this.refresh();
    closeMenu();
  },

deleteCol() {
    const tracker = this.getTracker();

    if (UIState.activeCol !== null) {
      tracker.columns.splice(UIState.activeCol, 1);
      tracker.rows.forEach(r => r.splice(UIState.activeCol, 1));
    }

    this.refresh();
    closeMenu();
  }
};
