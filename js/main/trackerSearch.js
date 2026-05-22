import { BOARD_PAGE_SIZE } from './constants.js';

export const trackerSearchMethods = {
getSearchColumnIndexes(tracker) {
    const searchableNames = ['company', 'position', 'status', 'link', 'date applied', 'date'];

    if (!tracker || !Array.isArray(tracker.columns)) return [];

    return tracker.columns
      .map((col, index) => {
        const name = typeof col === 'object' ? col.name : col;
        return searchableNames.includes(String(name || '').trim().toLowerCase()) ? index : null;
      })
      .filter((index) => index !== null);
  },

rowMatchesSearch(row, columnIndexes, query) {
    if (!query) return true;

    return columnIndexes.some((index) => {
      const cell = row?.[index];
      const value = typeof cell === 'object' ? cell.value : cell;

      return String(value || '').toLowerCase().includes(query);
    });
  },

rowMatchesSelectFilter(row) {
    if (this.sortSelect?.value !== 'select-text') return true;

    const selectedValue = this.selectValueFilterSelect?.value || '';
    if (!selectedValue) return true;

    const columnIndex = Number(this.selectTextSortSelect?.value);
    if (!Number.isInteger(columnIndex) || columnIndex < 0) return true;

    const cell = row?.[columnIndex];
    const value = typeof cell === 'object' ? cell.value : cell;

    return String(value || '') === selectedValue;
  },

applySearchFilter() {
    const tracker = this.getTracker();
    const query = this.searchInput?.value.trim().toLowerCase() || '';
    const isListView = this.viewSelect?.value === 'list';
    const rowElements = document.querySelectorAll(isListView ? '#listCards [data-row-index]' : '#tableBody tr');
    const columnIndexes = this.getSearchColumnIndexes(tracker);
    const hasSelectFilter = this.sortSelect?.value === 'select-text' && Boolean(this.selectValueFilterSelect?.value);
    const hasListFilter = isListView && (
      Boolean(this.listSearchInput?.value.trim())
      || this.getActiveListFilterValues().length > 0
    );
    const hasActiveFilter = Boolean(query) || hasSelectFilter || hasListFilter;
    const matchedElements = [];

    if (!tracker || !Array.isArray(tracker.rows)) return;

    rowElements.forEach((rowElement) => {
      const rowIndex = Number(rowElement.dataset.rowIndex);
      const row = tracker.rows[rowIndex];
      const isVisible = this.rowMatchesSearch(row, columnIndexes, query)
        && this.rowMatchesSelectFilter(row)
        && (!isListView || this.rowMatchesListFilters(row, tracker));

      if (isVisible) {
        matchedElements.push(rowElement);
      }
    });

    this.applyPagination(matchedElements);
    this.noSearchResults?.classList.toggle('hidden', matchedElements.length > 0 || !hasActiveFilter);
  },

applyPagination(matchedElements) {
    const rowElements = document.querySelectorAll(
      this.viewSelect?.value === 'list' ? '#listCards [data-row-index]' : '#tableBody tr'
    );
    const totalItems = matchedElements.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / BOARD_PAGE_SIZE));

    this.currentPage = Math.min(Math.max(this.currentPage, 1), totalPages);

    const startIndex = (this.currentPage - 1) * BOARD_PAGE_SIZE;
    const endIndex = startIndex + BOARD_PAGE_SIZE;
    const visiblePageElements = new Set(matchedElements.slice(startIndex, endIndex));

    rowElements.forEach((rowElement) => {
      rowElement.classList.toggle('hidden', !visiblePageElements.has(rowElement));
    });

    this.updatePaginationControls(totalItems, totalPages);
  },

updatePaginationControls(totalItems, totalPages) {
    if (!this.boardPagination || !this.paginationLabel) return;

    this.boardPagination.classList.toggle('hidden', totalItems === 0);
    this.boardPagination.classList.toggle('flex', totalItems > 0);
    this.paginationLabel.textContent = `Page ${this.currentPage} of ${totalPages}`;

    if (this.btnPaginationPrev) {
      this.btnPaginationPrev.disabled = this.currentPage <= 1;
    }

    if (this.btnPaginationNext) {
      this.btnPaginationNext.disabled = this.currentPage >= totalPages;
    }
  },

resetPagination() {
    this.currentPage = 1;
  },

changePage(direction) {
    this.currentPage += direction;
    this.applySearchFilter();
  }
};
