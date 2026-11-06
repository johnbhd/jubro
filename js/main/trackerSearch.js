export const trackerSearchMethods = {
  getBoardRowSelector() {
    return this.viewSelect?.value === 'list'
      ? '#listView [data-row-index]'
      : '#kanbanView [data-row-index]';
  },

  getSearchColumnIndexes(tracker) {
    const searchableNames = ['company', 'position', 'status', 'link', 'date applied', 'date'];

    if (!tracker || !Array.isArray(tracker.columns)) {
      return [];
    }

    return tracker.columns
      .map((column, index) => {
        const name = typeof column === 'object' ? column.name : column;
        return searchableNames.includes(String(name || '').trim().toLowerCase()) ? index : null;
      })
      .filter((index) => index !== null);
  },

  rowMatchesSearch(row, columnIndexes, query) {
    if (!query) {
      return true;
    }

    return columnIndexes.some((index) => {
      const cell = row?.[index];
      const value = typeof cell === 'object' ? cell.value : cell;

      return String(value || '').toLowerCase().includes(query);
    });
  },

  rowMatchesSelectFilter(row) {
    if (this.sortSelect?.value !== 'select-text') {
      return true;
    }

    const selectedValue = this.selectValueFilterSelect?.value || '';

    if (!selectedValue) {
      return true;
    }

    const columnIndex = Number(this.selectTextSortSelect?.value);

    if (!Number.isInteger(columnIndex) || columnIndex < 0) {
      return true;
    }

    const cell = row?.[columnIndex];
    const value = typeof cell === 'object' ? cell.value : cell;

    return String(value || '') === selectedValue;
  },

  applySearchFilter() {
    const tracker = this.getTracker();
    const query = this.searchInput?.value.trim().toLowerCase() || '';
    const rowElements = document.querySelectorAll(this.getBoardRowSelector());
    const columnIndexes = this.getSearchColumnIndexes(tracker);
    const hasSelectFilter = this.sortSelect?.value === 'select-text'
      && Boolean(this.selectValueFilterSelect?.value);
    const hasActiveFilter = Boolean(query) || hasSelectFilter;
    let matchedCount = 0;

    if (!tracker || !Array.isArray(tracker.rows)) {
      return;
    }

    rowElements.forEach((rowElement) => {
      const rowIndex = Number(rowElement.dataset.rowIndex);
      const row = tracker.rows[rowIndex];
      const isVisible = this.rowMatchesSearch(row, columnIndexes, query)
        && this.rowMatchesSelectFilter(row);

      rowElement.classList.toggle('hidden', !isVisible);

      if (isVisible) {
        matchedCount += 1;
      }
    });

    this.noSearchResults?.classList.toggle(
      'hidden',
      matchedCount > 0 || !hasActiveFilter,
    );
  },
};
