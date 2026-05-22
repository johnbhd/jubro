import { closeMenu, UIState } from './ui.js';

export const trackerKeyboardMethods = {
openMobileSearch() {
    this.searchWrapper?.classList.remove('hidden');
    this.searchWrapper?.classList.add('flex');
    this.btnCloseSearch?.classList.remove('hidden');
    this.btnCloseSearch?.classList.add('inline-flex');
    this.searchInput?.focus();
  },

closeMobileSearch() {
    this.searchWrapper?.classList.add('hidden');
    this.searchWrapper?.classList.remove('flex');
    if (this.sortSelect?.value !== 'select-text') {
      this.btnCloseSearch?.classList.add('hidden');
      this.btnCloseSearch?.classList.remove('inline-flex');
    }
  },

isEditableTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  },

focusSearchShortcut() {
    this.openMobileSearch();
    this.searchInput?.focus();
    this.searchInput?.select();
  },

deleteHoveredTableTarget() {
    if (UIState.activeType === 'row') {
      this.deleteRow();
      return true;
    }

    if (UIState.activeType === 'col') {
      this.deleteCol();
      return true;
    }

    return false;
  },

cloneTableValue(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  },

copyHoveredTableTarget() {
    const tracker = this.getTracker();

    if (!tracker) return false;

    if (UIState.activeType === 'row' && UIState.activeRow !== null) {
      const row = tracker.rows?.[UIState.activeRow];
      if (!row) return false;

      this.tableClipboard = {
        type: 'row',
        row: this.cloneTableValue(row)
      };
      return true;
    }

    if (UIState.activeType === 'col' && UIState.activeCol !== null) {
      const column = tracker.columns?.[UIState.activeCol];
      if (!column) return false;

      this.tableClipboard = {
        type: 'col',
        column: this.cloneTableValue(column),
        cells: tracker.rows.map((row) => this.cloneTableValue(row[UIState.activeCol]))
      };
      return true;
    }

    return false;
  },

pasteHoveredTableTarget() {
    const tracker = this.getTracker();

    if (!tracker || !this.tableClipboard) return false;

    if (
      this.tableClipboard.type === 'row'
      && UIState.activeType === 'row'
      && UIState.activeRow !== null
    ) {
      tracker.rows.splice(UIState.activeRow + 1, 0, this.cloneTableValue(this.tableClipboard.row));
      this.clearTableSortControls();
      this.refresh();
      closeMenu();
      return true;
    }

    if (
      this.tableClipboard.type === 'col'
      && UIState.activeType === 'col'
      && UIState.activeCol !== null
    ) {
      const insertIndex = UIState.activeCol + 1;

      tracker.columns.splice(insertIndex, 0, this.cloneTableValue(this.tableClipboard.column));
      tracker.rows.forEach((row, rowIndex) => {
        const hasCopiedCell = rowIndex < this.tableClipboard.cells.length;
        const pastedCell = hasCopiedCell
          ? this.cloneTableValue(this.tableClipboard.cells[rowIndex])
          : { value: '', type: 'text' };

        row.splice(insertIndex, 0, pastedCell);
      });

      this.clearTableSortControls();
      this.refresh();
      closeMenu();
      return true;
    }

    return false;
  }
};
