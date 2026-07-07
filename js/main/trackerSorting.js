export const trackerSortingMethods = {
getDateColumnIndex(tracker) {
    if (!tracker || !Array.isArray(tracker.columns)) return -1;

    const typedIndex = tracker.columns.findIndex((column) => (
      typeof column === 'object' && column.type === 'date'
    ));

    if (typedIndex !== -1) return typedIndex;

    return tracker.columns.findIndex((column) => {
      const name = String(this.getColumnName(column) || '').trim().toLowerCase();
      return name === 'date' || name === 'date applied';
    });
  },

getDateSortValue(row, dateIndex) {
    const cell = row?.[dateIndex];
    const value = typeof cell === 'object' ? cell.value : cell;
    const time = new Date(`${value || ''}T00:00:00`).getTime();

    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  },

getCellSortText(row, columnIndex) {
    const cell = row?.[columnIndex];
    const value = typeof cell === 'object' ? cell.value : cell;

    return String(value || '').trim().toLowerCase();
  },

getTableRowsForRender(tracker = this.getTracker()) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const rowItems = rows.map((row, rowIndex) => ({ row, rowIndex }));
    const sortValue = this.sortSelect?.value || '';

    if (!tracker || !Array.isArray(tracker.rows)) return rowItems;

    if (sortValue === 'select-text') {
      const columnIndex = Number(this.selectTextSortSelect?.value);
      if (!Number.isInteger(columnIndex) || columnIndex < 0) return rowItems;

      return rowItems.sort((a, b) => (
        this.getCellSortText(a.row, columnIndex).localeCompare(this.getCellSortText(b.row, columnIndex))
      ));
    }

    if (!['date-asc', 'date-desc'].includes(sortValue)) return rowItems;

    const dateIndex = this.getDateColumnIndex(tracker);
    if (dateIndex === -1) return rowItems;

    const direction = sortValue === 'date-desc' ? -1 : 1;

    return rowItems.sort((a, b) => {
      const aTime = this.getDateSortValue(a.row, dateIndex);
      const bTime = this.getDateSortValue(b.row, dateIndex);

      return (aTime - bTime) * direction;
    });
  },

applyCurrentSort() {
    return this.getTableRowsForRender();
  },

renderSelectTextSortOptions() {
    if (!this.selectTextSortSelect) return;

    const selectColumns = this.getSelectColumns();
    const currentValue = this.selectTextSortSelect.value;

    this.selectTextSortSelect.innerHTML = '';

    selectColumns.forEach(({ column, index }) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = this.getColumnName(column) || `Column ${index + 1}`;
      this.selectTextSortSelect.appendChild(option);
    });

    if (selectColumns.some(({ index }) => String(index) === currentValue)) {
      this.selectTextSortSelect.value = currentValue;
    }
  },

renderSelectValueFilterOptions() {
    if (!this.selectValueFilterSelect) return;

    const tracker = this.getTracker();
    const columnIndex = Number(this.selectTextSortSelect?.value);
    const column = tracker?.columns?.[columnIndex];
    const options = this.getDashboardOptions(column);
    const currentValue = this.selectValueFilterSelect.value;

    this.selectValueFilterSelect.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All';
    this.selectValueFilterSelect.appendChild(allOption);

    options.forEach((selectOption) => {
      const option = document.createElement('option');
      option.value = selectOption.label;
      option.textContent = selectOption.label;
      this.selectValueFilterSelect.appendChild(option);
    });

    if (options.some((option) => option.label === currentValue)) {
      this.selectValueFilterSelect.value = currentValue;
    }
  },

updateSelectTextSortVisibility() {
    if (!this.selectTextSortWrapper) return;

    const shouldShow = this.sortSelect?.value === 'select-text';
    this.selectTextSortWrapper.classList.toggle('hidden', !shouldShow);
    this.selectValueFilterWrapper?.classList.toggle('hidden', !shouldShow);
    this.btnCloseSearch?.classList.toggle('hidden', !shouldShow);
    this.btnCloseSearch?.classList.toggle('inline-flex', shouldShow);
    this.btnClearSelectFilter?.classList.toggle('hidden', !shouldShow);
    this.btnClearSelectFilter?.classList.toggle('inline-flex', shouldShow);

    if (shouldShow) {
      this.renderSelectTextSortOptions();
      this.renderSelectValueFilterOptions();
    } else if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }
  },

clearSelectFilter() {
    if (this.sortSelect) {
      this.sortSelect.value = '';
    }

    if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }

    this.updateSelectTextSortVisibility();
    this.refresh({ persist: false });
  },

getSelectColumns() {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns)) return [];

    return tracker.columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => {
        const name = String(this.getColumnName(column) || '').trim().toLowerCase();

        return (typeof column === 'object' && column.type === 'select') || name === 'status';
      })
      .sort((a, b) => {
        const aName = String(this.getColumnName(a.column) || '').trim().toLowerCase();
        const bName = String(this.getColumnName(b.column) || '').trim().toLowerCase();

        if (aName === 'status' && bName !== 'status') return -1;
        if (aName !== 'status' && bName === 'status') return 1;
        return a.index - b.index;
      });
  }
};
