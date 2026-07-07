import { LIST_SORT_KEY } from './constants.js';

export const listSortMethods = {
  saveListSortPreference() {
    if (!this.listSortSelect) return;

    localStorage.setItem(LIST_SORT_KEY, this.listSortSelect.value);
  },

  restoreListSortPreference() {
    if (!this.listSortSelect) return;

    const savedSort = localStorage.getItem(LIST_SORT_KEY);

    if (['date-desc', 'date-asc', 'manual'].includes(savedSort)) {
      this.listSortSelect.value = savedSort;
    }
  },

  getSortedListRows(tracker) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const directionValue = this.listSortSelect?.value || 'date-desc';

    if (directionValue === 'manual') {
      return rows.map((row, rowIndex) => ({ row, rowIndex }));
    }

    const dateIndex = this.getDateColumnIndex(tracker);
    const direction = directionValue === 'date-asc' ? 1 : -1;

    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .sort((a, b) => {
        if (dateIndex < 0) return a.rowIndex - b.rowIndex;

        return (this.getDateSortValue(a.row, dateIndex) - this.getDateSortValue(b.row, dateIndex)) * direction;
      });
  },

  setListManualSort() {
    if (this.listSortSelect) {
      this.listSortSelect.value = 'manual';
      this.saveListSortPreference();
    }
  },

  reorderListRow(fromIndex, toIndex) {
    this.setListManualSort();
    this.reorderRow(fromIndex, toIndex);
  },

  moveListRow(rowIndex, direction) {
    const orderedRows = this.getSortedListRows(this.getTracker());
    const currentDisplayIndex = orderedRows.findIndex((item) => item.rowIndex === rowIndex);
    const target = orderedRows[currentDisplayIndex + direction];

    if (!target) return;

    this.reorderListRow(rowIndex, target.rowIndex);
  }
};
