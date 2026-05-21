import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';
import { renderDashboardCharts } from './dashboardCharts.js';
import { Storage } from '../storage/storage.js';
import { JSONService } from '../services/jsonService.js';
import { authService } from '../auth/firebaseAuth.js';
import { firebaseTrackerSync } from '../storage/firebaseTrackerSync.js';
import { createDefaultTracker } from '../tracker/defaultTracker.js';
import { getLinkFavicon, getPlatformFavicon } from './favicon.js';

const BOARD_VIEW_KEY = 'jubro_board_view';
const BOARD_PAGE_SIZE = 5;

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.tableContainer = document.getElementById('tableContainer');
    this.tableView = document.getElementById('tableView');
    this.listView = document.getElementById('listView');
    this.listCards = document.getElementById('listCards');
    this.listSearchInput = document.getElementById('listSearchInput');
    this.listSortSelect = document.getElementById('listSortSelect');
    this.listThisMonthCount = document.getElementById('listThisMonthCount');
    this.listTotalCount = document.getElementById('listTotalCount');
    this.titleInput = document.getElementById('trackerTitleInput');
    this.searchWrapper = document.getElementById('searchWrapper');
    this.searchInput = document.getElementById('jobSearchInput');
    this.viewSelect = document.getElementById('boardViewSelect');
    this.sortSelect = document.getElementById('tableSortSelect');
    this.selectTextSortWrapper = document.getElementById('selectTextSortWrapper');
    this.selectTextSortSelect = document.getElementById('selectTextSortSelect');
    this.selectValueFilterWrapper = document.getElementById('selectValueFilterWrapper');
    this.selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    this.btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.boardPagination = document.getElementById('boardPagination');
    this.paginationLabel = document.getElementById('paginationLabel');
    this.btnPaginationPrev = document.getElementById('btnPaginationPrev');
    this.btnPaginationNext = document.getElementById('btnPaginationNext');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardSelectColumn = document.getElementById('dashboardSelectColumn');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardCharts = document.getElementById('dashboardCharts');
    this.state = this.initializeState();
    this.jsonService = new JSONService();
    this.tableClipboard = null;
    this.currentPage = 1;
    this.activeListFilters = {
      status: '',
      platform: ''
    };
    if (!this.getTracker()) {
      window.location.href = '/trackers';
      return;
    }
    this.save();
    this.initEvents();
    this.restoreBoardViewPreference();
    this.refresh();
  }
  generateId() {
    return 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }
  initializeState() {
    let state = Storage.load();
  
   if (!Storage.exists()) {
      const defaultId = this.generateId();
    
      return {
        active: defaultId,
        data: {
          [defaultId]: createDefaultTracker(defaultId)
        }
      };
    }
  
    if (state.columns && state.data) {
        const defaultId = this.generateId();
      
        const normalizedRows = state.data.map(row =>
          row.map(cell => ({
            value: cell,
            type: 'text'
          }))
        );
      
        return {
          active: defaultId,
          data: {
            [defaultId]: {
              id: defaultId,
              title: "Untitled",
              columns: state.columns,
              rows: normalizedRows
            }
          }
        };
      }
  
    const urlTracker = this.getTrackerFromURL();
  
    if (urlTracker && state.data && state.data[urlTracker]) {
      state.active = urlTracker;
    }
  
    Object.keys(state.data || {}).forEach(key => {
      if (!state.data[key].id) {
        state.data[key].id = key;
      }
    });
  
    return state;
  }

  getTracker() {
    return this.state.data[this.state.active];
  }
  getTrackerFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tracker');
  }
  save() {
    Storage.save(this.state);
    this.syncLocalStateToFirebase();
  }

  syncLocalStateToFirebase() {
    const user = authService.getCurrentUser();

    if (!user) return;

    firebaseTrackerSync.syncCurrentLocalState(user).catch((err) => {
      console.error("Tracker Firebase sync error:", err);
    });
  }

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
  }

  getDateSortValue(row, dateIndex) {
    const cell = row?.[dateIndex];
    const value = typeof cell === 'object' ? cell.value : cell;
    const time = new Date(`${value || ''}T00:00:00`).getTime();

    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  }

  getCellSortText(row, columnIndex) {
    const cell = row?.[columnIndex];
    const value = typeof cell === 'object' ? cell.value : cell;

    return String(value || '').trim().toLowerCase();
  }

  applyCurrentSort() {
    const tracker = this.getTracker();
    const sortValue = this.sortSelect?.value || '';

    if (!tracker || !Array.isArray(tracker.rows)) return;

    if (sortValue === 'select-text') {
      const columnIndex = Number(this.selectTextSortSelect?.value);
      if (!Number.isInteger(columnIndex) || columnIndex < 0) return;

      tracker.rows.sort((a, b) => (
        this.getCellSortText(a, columnIndex).localeCompare(this.getCellSortText(b, columnIndex))
      ));
      return;
    }

    if (!['date-asc', 'date-desc'].includes(sortValue)) return;

    const dateIndex = this.getDateColumnIndex(tracker);
    if (dateIndex === -1) return;

    const direction = sortValue === 'date-desc' ? -1 : 1;

    tracker.rows.sort((a, b) => {
      const aTime = this.getDateSortValue(a, dateIndex);
      const bTime = this.getDateSortValue(b, dateIndex);

      return (aTime - bTime) * direction;
    });
  }

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
  }

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
  }

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
  }

  clearSelectFilter() {
    if (this.sortSelect) {
      this.sortSelect.value = 'date-desc';
    }

    if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }

    this.updateSelectTextSortVisibility();
    this.refresh();
  }

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

  getColumnName(column) {
    return typeof column === 'object' ? column.name : column;
  }

  getCellValue(cell) {
    return typeof cell === 'object' ? cell.value : cell;
  }

  getCellDisplay(cell) {
    const value = this.getCellValue(cell);

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value || '').trim() || '-';
  }

  normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  getColumnIndexByNames(tracker, names, fallbackIndex = -1) {
    if (!tracker || !Array.isArray(tracker.columns)) return fallbackIndex;

    const wantedNames = names.map((name) => this.normalizeText(name));
    const index = tracker.columns.findIndex((column) => (
      wantedNames.includes(this.normalizeText(this.getColumnName(column)))
    ));

    return index >= 0 ? index : fallbackIndex;
  }

  getListColumnIndexes(tracker) {
    return {
      company: this.getColumnIndexByNames(tracker, ['company'], 0),
      position: this.getColumnIndexByNames(tracker, ['position', 'role', 'job title'], 1),
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['link', 'url', 'job link'], 5)
    };
  }

  getListRowText(row) {
    return row
      .map((cell) => this.getCellDisplay(cell))
      .join(' ')
      .toLowerCase();
  }

  getFaviconHtml(favicon) {
    if (!favicon?.url) {
      return '<span class="favicon-holder"><i class="fa-solid fa-globe text-[11px] text-gray-500"></i></span>';
    }

    return `
      <span class="favicon-holder">
        <img
          src="${this.escapeHtml(favicon.url)}"
          alt=""
          class="h-5 w-5 rounded"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.replaceWith(Object.assign(document.createElement('i'), { className: 'fa-solid fa-globe text-[11px] text-gray-500' }))"
        />
      </span>
    `;
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  getDashboardOptions(column) {
    if (!column || !Array.isArray(column.options)) return [];

    return column.options.map((option) => {
      if (typeof option === 'string') {
        return {
          label: option,
          color: '#6b7280'
        };
      }

      return {
        label: option.label || 'Option',
        color: option.color || '#6b7280'
      };
    });
  }

  countDashboardOptions(columnIndex, options) {
    const tracker = this.getTracker();
    const counts = new Map(options.map((option) => [option.label, 0]));

    if (!tracker || !Array.isArray(tracker.rows)) return counts;

    tracker.rows.forEach((row) => {
      const cell = row?.[columnIndex];
      const value = typeof cell === 'object' ? cell.value : cell;

      if (counts.has(value)) {
        counts.set(value, counts.get(value) + 1);
      }
    });

    return counts;
  }

  renderDashboardCards(columnIndex) {
    const tracker = this.getTracker();
    const column = tracker?.columns?.[columnIndex];
    const options = this.getDashboardOptions(column);

    if (!this.dashboardCards) return;

    this.dashboardCards.innerHTML = '';

    if (!column || options.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 lg:col-span-3';
      empty.textContent = 'No options found.';
      this.dashboardCards.appendChild(empty);
      renderDashboardCharts(this.dashboardCharts, [], new Map(), tracker);
      return;
    }

    const counts = this.countDashboardOptions(columnIndex, options);

    options.forEach((option) => {
      const card = document.createElement('div');
      card.className = 'rounded-xl border p-4 text-center';
      card.style.borderColor = option.color;

      const label = document.createElement('p');
      label.className = 'truncate text-sm font-medium';
      label.textContent = option.label;
      label.style.color = option.color;

      const count = document.createElement('p');
      count.className = 'mt-2 text-3xl font-semibold';
      count.textContent = counts.get(option.label) || 0;
      count.style.color = option.color;

      card.appendChild(label);
      card.appendChild(count);
      this.dashboardCards.appendChild(card);
    });

    renderDashboardCharts(this.dashboardCharts, options, counts, tracker);
  }

  renderDashboard() {
    if (!this.dashboardSelectColumn) return;

    const selectColumns = this.getSelectColumns();
    const currentValue = this.dashboardSelectColumn.value;

    this.dashboardSelectColumn.innerHTML = '';

    if (selectColumns.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No select columns';
      option.value = '';
      this.dashboardSelectColumn.appendChild(option);
      this.dashboardSelectColumn.disabled = true;
      this.renderDashboardCards(null);
      return;
    }

    this.dashboardSelectColumn.disabled = false;

    selectColumns.forEach(({ column, index }) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = this.getColumnName(column) || `Column ${index + 1}`;
      this.dashboardSelectColumn.appendChild(option);
    });

    const selected = selectColumns.some(({ index }) => String(index) === currentValue)
      ? currentValue
      : String(selectColumns[0].index);

    this.dashboardSelectColumn.value = selected;
    this.renderDashboardCards(Number(selected));
  }

  openDashboard() {
    if (!this.dashboardModal) return;

    this.renderDashboard();
    this.dashboardModal.classList.remove('hidden');
  }

  closeDashboard() {
    this.dashboardModal?.classList.add('hidden');
  }

  openMobileSearch() {
    this.searchWrapper?.classList.remove('hidden');
    this.searchWrapper?.classList.add('flex');
    this.btnCloseSearch?.classList.remove('hidden');
    this.btnCloseSearch?.classList.add('inline-flex');
    this.searchInput?.focus();
  }

  closeMobileSearch() {
    this.searchWrapper?.classList.add('hidden');
    this.searchWrapper?.classList.remove('flex');
    if (this.sortSelect?.value !== 'select-text') {
      this.btnCloseSearch?.classList.add('hidden');
      this.btnCloseSearch?.classList.remove('inline-flex');
    }
  }

  isEditableTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  }

  focusSearchShortcut() {
    this.openMobileSearch();
    this.searchInput?.focus();
    this.searchInput?.select();
  }

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
  }

  cloneTableValue(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

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
  }

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

  getSearchColumnIndexes(tracker) {
    const searchableNames = ['company', 'position', 'status', 'link', 'date applied', 'date'];

    if (!tracker || !Array.isArray(tracker.columns)) return [];

    return tracker.columns
      .map((col, index) => {
        const name = typeof col === 'object' ? col.name : col;
        return searchableNames.includes(String(name || '').trim().toLowerCase()) ? index : null;
      })
      .filter((index) => index !== null);
  }

  rowMatchesSearch(row, columnIndexes, query) {
    if (!query) return true;

    return columnIndexes.some((index) => {
      const cell = row?.[index];
      const value = typeof cell === 'object' ? cell.value : cell;

      return String(value || '').toLowerCase().includes(query);
    });
  }

  rowMatchesSelectFilter(row) {
    if (this.sortSelect?.value !== 'select-text') return true;

    const selectedValue = this.selectValueFilterSelect?.value || '';
    if (!selectedValue) return true;

    const columnIndex = Number(this.selectTextSortSelect?.value);
    if (!Number.isInteger(columnIndex) || columnIndex < 0) return true;

    const cell = row?.[columnIndex];
    const value = typeof cell === 'object' ? cell.value : cell;

    return String(value || '') === selectedValue;
  }

  applySearchFilter() {
    const tracker = this.getTracker();
    const query = this.searchInput?.value.trim().toLowerCase() || '';
    const isListView = this.viewSelect?.value === 'list';
    const rowElements = document.querySelectorAll(isListView ? '#listCards [data-row-index]' : '#tableBody tr');
    const columnIndexes = this.getSearchColumnIndexes(tracker);
    const hasSelectFilter = this.sortSelect?.value === 'select-text' && Boolean(this.selectValueFilterSelect?.value);
    const hasListFilter = isListView && (
      Boolean(this.listSearchInput?.value.trim())
      || Boolean(this.activeListFilters.status)
      || Boolean(this.activeListFilters.platform)
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
  }

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
  }

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
  }

  resetPagination() {
    this.currentPage = 1;
  }

  changePage(direction) {
    this.currentPage += direction;
    this.applySearchFilter();
  }

  rowMatchesListFilters(row, tracker) {
    const listQuery = this.normalizeText(this.listSearchInput?.value);
    const indexes = this.getListColumnIndexes(tracker);

    if (listQuery && !this.getListRowText(row).includes(listQuery)) {
      return false;
    }

    if (
      this.activeListFilters.status
      && this.normalizeText(this.getCellValue(row?.[indexes.status])) !== this.normalizeText(this.activeListFilters.status)
    ) {
      return false;
    }

    if (
      this.activeListFilters.platform
      && this.normalizeText(this.getCellValue(row?.[indexes.platform])) !== this.normalizeText(this.activeListFilters.platform)
    ) {
      return false;
    }

    return true;
  }

  getStatusBadgeClass(status) {
    const normalized = this.normalizeText(status);

    if (normalized === 'applied') return 'bg-blue-100 text-blue-700';
    if (normalized === 'interview') return 'bg-green-100 text-green-700';
    if (normalized === 'rejected') return 'bg-red-100 text-red-700';

    return 'bg-gray-100 text-gray-700';
  }

  getPlatformDotClass(platform) {
    const normalized = this.normalizeText(platform);

    if (normalized === 'linkedin') return 'bg-blue-600';
    if (normalized === 'indeed') return 'bg-indigo-600';
    if (normalized === 'jobstreet') return 'bg-sky-600';
    if (normalized === 'company website') return 'bg-emerald-600';

    return 'bg-gray-400';
  }

  getContrastColor(hex) {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return '#111827';

    const color = hex.replace('#', '');
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);
    const yiq = (red * 299 + green * 587 + blue * 114) / 1000;

    return yiq >= 128 ? '#111827' : '#ffffff';
  }

  getOptionColor(column, value, fallback = '#6b7280') {
    const options = this.getDashboardOptions(column);
    const option = options.find((item) => this.normalizeText(item.label) === this.normalizeText(value));
    const color = option?.color || fallback;

    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  updateListStats(tracker) {
    if (!this.listThisMonthCount || !this.listTotalCount) return;

    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const dateIndex = this.getDateColumnIndex(tracker);
    const now = new Date();
    const thisMonthCount = rows.filter((row) => {
      const dateValue = this.getCellValue(row?.[dateIndex]);
      const date = new Date(`${dateValue || ''}T00:00:00`);

      return !Number.isNaN(date.getTime())
        && date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth();
    }).length;

    this.listThisMonthCount.textContent = String(thisMonthCount);
    this.listTotalCount.textContent = String(rows.length);
  }

  updateListFilterCounts(tracker) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const indexes = this.getListColumnIndexes(tracker);

    document.querySelectorAll('.list-filter-chip').forEach((chip) => {
      const count = chip.querySelector('.list-filter-count');
      const type = chip.dataset.filterType;
      const value = chip.dataset.filterValue || '';

      if (!count || !type) return;

      if (type === 'status' && value === '') {
        count.textContent = String(rows.length);
        return;
      }

      const columnIndex = type === 'status' ? indexes.status : indexes.platform;
      const optionColor = this.getOptionColor(tracker?.columns?.[columnIndex], value);
      const total = rows.filter((row) => (
        this.normalizeText(this.getCellValue(row?.[columnIndex])) === this.normalizeText(value)
      )).length;

      chip.style.setProperty('--chip-color', optionColor);
      chip.style.setProperty('--chip-text-color', this.getContrastColor(optionColor));
      count.textContent = String(total);
    });
  }

  getSortedListRows(tracker) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const dateIndex = this.getDateColumnIndex(tracker);
    const direction = this.listSortSelect?.value === 'date-asc' ? 1 : -1;

    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .sort((a, b) => {
        if (dateIndex < 0) return a.rowIndex - b.rowIndex;

        return (this.getDateSortValue(a.row, dateIndex) - this.getDateSortValue(b.row, dateIndex)) * direction;
      });
  }

  renderListView(tracker) {
    if (!this.listCards) return;

    this.listCards.innerHTML = '';
    this.updateListStats(tracker);
    this.updateListFilterCounts(tracker);

    if (!tracker || !Array.isArray(tracker.rows) || tracker.rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400';
      empty.textContent = 'No rows yet.';
      this.listCards.appendChild(empty);
      return;
    }

    const indexes = this.getListColumnIndexes(tracker);

    this.getSortedListRows(tracker).forEach(({ row, rowIndex }) => {
      const article = document.createElement('article');
      article.className = 'list-view-row rounded-md border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow';
      article.dataset.rowIndex = String(rowIndex);

      const dateApplied = this.getCellDisplay(row[indexes.date]);
      const position = this.getCellDisplay(row[indexes.position]);
      const company = this.getCellDisplay(row[indexes.company]);
      const platform = this.getCellDisplay(row[indexes.platform]);
      const status = this.getCellDisplay(row[indexes.status]);
      const link = this.getCellValue(row[indexes.link]);
      const safeDateApplied = this.escapeHtml(dateApplied);
      const safePosition = this.escapeHtml(position);
      const safeCompany = this.escapeHtml(company);
      const safePlatform = this.escapeHtml(platform);
      const safeStatus = this.escapeHtml(status);
      const safeLink = this.escapeHtml(link || '#');
      const linkFavicon = getLinkFavicon(link);
      const platformFavicon = getPlatformFavicon(platform);
      const safeHostname = this.escapeHtml(linkFavicon.hostname);
      const platformColor = this.getOptionColor(tracker.columns[indexes.platform], platform, '#6b7280');
      const statusColor = this.getOptionColor(tracker.columns[indexes.status], status, '#6b7280');
      const statusTextColor = this.getContrastColor(statusColor);

      article.innerHTML = `
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-gray-400">${safeDateApplied}</p>
            <h3 class="mt-1 truncate text-lg font-semibold text-gray-900">${safePosition}</h3>
            <p class="mt-1 truncate text-sm text-gray-500">${safeCompany}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium" style="border-color: ${platformColor}; color: ${platformColor};">
              ${this.getFaviconHtml(platformFavicon)}
              ${safePlatform}
            </span>
            <a class="inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-gray-100 px-3 text-xs text-gray-500 hover:bg-gray-50" href="${safeLink}" target="_blank" rel="noopener" aria-label="Open job link">
              ${this.getFaviconHtml(linkFavicon)}
              <span class="truncate">${safeHostname || 'Open link'}</span>
            </a>
            <span class="rounded-full px-3 py-1 text-xs font-semibold" style="background-color: ${statusColor}; color: ${statusTextColor};">${safeStatus}</span>
            <button type="button" class="btn-list-edit inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="Edit job">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" class="btn-list-delete inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-red-500 hover:bg-red-50" aria-label="Delete job">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `;

      const linkElement = article.querySelector('a');
      if (!link || !/^https?:\/\//.test(String(link))) {
        linkElement?.classList.add('pointer-events-none', 'opacity-40');
        linkElement?.removeAttribute('href');
      }

      article.querySelector('.btn-list-edit')?.addEventListener('click', () => {
        this.showTableRow(rowIndex);
      });

      article.querySelector('.btn-list-delete')?.addEventListener('click', () => {
        this.deleteRowAt(rowIndex);
      });

      this.listCards.appendChild(article);
    });
  }

  updateBoardView() {
    const isListView = this.viewSelect?.value === 'list';

    this.tableView?.classList.toggle('hidden', isListView);
    this.listView?.classList.toggle('hidden', !isListView);
  }

  saveBoardViewPreference() {
    if (!this.viewSelect) return;

    localStorage.setItem(BOARD_VIEW_KEY, this.viewSelect.value);
  }

  restoreBoardViewPreference() {
    if (!this.viewSelect) return;

    const savedView = localStorage.getItem(BOARD_VIEW_KEY);
    if (savedView === 'list' || savedView === 'table') {
      this.viewSelect.value = savedView;
    }
  }

  showTableRow(rowIndex) {
    if (this.viewSelect) {
      this.viewSelect.value = 'table';
      this.saveBoardViewPreference();
    }

    this.currentPage = Math.floor(rowIndex / BOARD_PAGE_SIZE) + 1;
    this.updateBoardView();
    this.applySearchFilter();

    const rowElement = document.querySelector(`#tableBody tr[data-row-index="${rowIndex}"]`);
    rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  deleteRowAt(rowIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;
    if (rowIndex < 0 || rowIndex >= tracker.rows.length) return;

    tracker.rows.splice(rowIndex, 1);
    this.refresh();
    closeMenu();
  }

  updateListFilterChipStyles() {
    document.querySelectorAll('.list-filter-chip').forEach((chip) => {
      const type = chip.dataset.filterType;
      const value = chip.dataset.filterValue || '';
      const isActive = type === 'status' && value === ''
        ? this.activeListFilters.status === ''
        : this.activeListFilters[type] === value;

      chip.classList.toggle('is-active', isActive);
    });
  }

  refresh() {
    const tracker = this.getTracker();
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
    this.save();
  }

  clearTableSortControls() {
    if (this.sortSelect) {
      this.sortSelect.value = '';
    }

    if (this.selectValueFilterSelect) {
      this.selectValueFilterSelect.value = '';
    }

    this.updateSelectTextSortVisibility();
  }

  reorderRow(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= tracker.rows.length || toIndex >= tracker.rows.length) return;

    const [row] = tracker.rows.splice(fromIndex, 1);
    tracker.rows.splice(toIndex, 0, row);

    this.clearTableSortControls();
    this.refresh();
    closeMenu();
  }

  reorderColumn(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= tracker.columns.length || toIndex >= tracker.columns.length) return;

    const [column] = tracker.columns.splice(fromIndex, 1);
    tracker.columns.splice(toIndex, 0, column);

    tracker.rows.forEach((row) => {
      const [cell] = row.splice(fromIndex, 1);
      row.splice(toIndex, 0, cell);
    });

    this.clearTableSortControls();
    this.refresh();
    closeMenu();
  }
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
  }
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
  }
  
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
  }
  initEvents() {
    const btnMenu = document.getElementById('btnMenu');
    const dropdown = document.getElementById('navDropdown');
    const btnImport = document.getElementById('btnImport');
    const btnExport = document.getElementById('btnExport');
    const btnDashboard = document.getElementById('btnDashboard');
    const btnCloseDashboard = document.getElementById('btnCloseDashboard');
    const btnOpenSearch = document.getElementById('btnOpenSearch');
    const btnCloseSearch = document.getElementById('btnCloseSearch');
    const btnPaginationPrev = document.getElementById('btnPaginationPrev');
    const btnPaginationNext = document.getElementById('btnPaginationNext');
    const tableSortSelect = document.getElementById('tableSortSelect');
    const boardViewSelect = document.getElementById('boardViewSelect');
    const listSearchInput = document.getElementById('listSearchInput');
    const listSortSelect = document.getElementById('listSortSelect');
    const btnListAddJob = document.getElementById('btnListAddJob');
    const selectTextSortSelect = document.getElementById('selectTextSortSelect');
    const selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    const btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    
    document.getElementById('btn-type-checkbox')?.addEventListener('click', () => {
      this.setColumnType('checkbox');
    });
    
    document.getElementById('btn-type-date')?.addEventListener('click', () => {
      this.setColumnType('date');
    });
    
    document.addEventListener('table:update', () => {
      this.refresh();
    });

    document.addEventListener('table:row-reorder', (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      this.reorderRow(Number(fromIndex), Number(toIndex));
    });

    document.addEventListener('table:col-reorder', (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      this.reorderColumn(Number(fromIndex), Number(toIndex));
    });
    
    document.getElementById('btn-type-text')?.addEventListener('click', () => {
      this.setColumnType('text');
    });
    
    document.getElementById('btn-type-select')?.addEventListener('click', () => {
      this.setColumnType('select');
    });
    
    // toggle dropdown
    btnMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    
    // close properly
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btnMenu) {
        dropdown.classList.add('hidden');
      }
    });
    
    // prevent closing inside
    dropdown?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // TEMP actions
    btnExport?.addEventListener('click', () => {
      const tracker = this.state.data[this.state.active];

      if (!tracker) return;

      this.jsonService.export(tracker, `${tracker.title}.json`);

    });

    btnImport?.addEventListener('click', () => {
      this.jsonService.import((data) => {

        this.state.data[this.state.active] = {
          ...this.state.data[this.state.active],
          columns: structuredClone(data.columns),
          rows: structuredClone(data.rows)
        };

        this.save();

        window.location.reload();
      });
    });

    btnDashboard?.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      this.openDashboard();
    });

    btnOpenSearch?.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      this.openMobileSearch();
    });

    btnCloseSearch?.addEventListener('click', () => {
      if (this.sortSelect?.value === 'select-text') {
        this.clearSelectFilter();
        return;
      }

      this.closeMobileSearch();
    });

    this.dashboardSelectColumn?.addEventListener('change', (e) => {
      this.renderDashboardCards(Number(e.target.value));
    });

    btnCloseDashboard?.addEventListener('click', () => {
      this.closeDashboard();
    });

    this.dashboardModal?.addEventListener('click', (e) => {
      if (e.target === this.dashboardModal) {
        this.closeDashboard();
      }
    });

    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        this.focusSearchShortcut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'c' && !this.isEditableTarget(e.target)) {
        if (this.copyHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'v' && !this.isEditableTarget(e.target)) {
        if (this.pasteHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !this.isEditableTarget(e.target)) {
        if (this.deleteHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        this.closeMobileSearch();
        this.closeDashboard();
      }
    });
    
    this.titleInput.addEventListener('input', (e) => {
      this.getTracker().title = e.target.value;
      this.save();
    });

    this.titleInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      this.titleInput.blur();
    });

    this.searchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    boardViewSelect?.addEventListener('change', () => {
      this.saveBoardViewPreference();
      this.resetPagination();
      this.updateBoardView();
      this.applySearchFilter();
    });

    listSearchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    listSortSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.renderListView(this.getTracker());
      this.applySearchFilter();
    });

    btnListAddJob?.addEventListener('click', () => {
      this.addRow();
    });

    document.querySelectorAll('.list-filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.filterType;
        const value = chip.dataset.filterValue || '';

        if (!type) return;

        this.activeListFilters[type] = value === '' || this.activeListFilters[type] === value ? '' : value;
        this.resetPagination();
        this.updateListFilterChipStyles();
        this.applySearchFilter();
      });
    });

    tableSortSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.updateSelectTextSortVisibility();
      this.refresh();
    });

    selectTextSortSelect?.addEventListener('change', () => {
      if (this.selectValueFilterSelect) {
        this.selectValueFilterSelect.value = '';
      }
      this.renderSelectValueFilterOptions();
      this.resetPagination();
      this.refresh();
    });

    selectValueFilterSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.refresh();
    });

    btnPaginationPrev?.addEventListener('click', () => {
      this.changePage(-1);
    });

    btnPaginationNext?.addEventListener('click', () => {
      this.changePage(1);
    });

    btnClearSelectFilter?.addEventListener('click', () => {
      this.clearSelectFilter();
    });

    this.appBody.addEventListener('click', (e) => {
      const menu = document.getElementById('contextMenu');
      if (!menu) return;
    
      if (!menu.contains(e.target)) {
        closeMenu();
      }
    });
    this.tableContainer.addEventListener('click', (e) => e.stopPropagation());

    const buttonActions = {
      "btn-addRow": (e) => {
        e.preventDefault();
        this.addRow();
      },
      "btn-addCol": (e) => {
        e.preventDefault();
        this.addCol();
      },
      "btn-copyRow": (e) => {
        e.preventDefault();
        this.copyRow();
      },
      "btn-copyCol": (e) => {
        e.preventDefault();
        this.copyCol();
      },
      "btn-moveUp": (e) => {
        e.preventDefault();
        this.moveUp();
      },
      "btn-moveDown": (e) => {
        e.preventDefault();
        this.moveDown();
      },
      "btn-moveLeft": (e) => {
        e.preventDefault();
        this.moveLeft();
      },
      "btn-moveRight": (e) => {
        e.preventDefault();
        this.moveRight();
      },
      "btn-delRow": (e) => {
        e.preventDefault();
        this.deleteRow();
      },
      "btn-delCol": (e) => {
        e.preventDefault();
        this.deleteCol();
      }
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => action(e));
    });
  }

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
  }

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
  }

  moveUp() {
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === 0) return;

    this.reorderRow(activeRow, activeRow - 1);
  }

  moveDown() {
    const tracker = this.getTracker();
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === tracker.rows.length - 1) return;

    this.reorderRow(activeRow, activeRow + 1);
  }

  moveLeft() {
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === 0) return;

    this.reorderColumn(activeCol, activeCol - 1);
  }

  moveRight() {
    const tracker = this.getTracker();
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === tracker.columns.length - 1) return;

    this.reorderColumn(activeCol, activeCol + 1);
  }

  deleteRow() {
    const tracker = this.getTracker();

    if (UIState.activeRow !== null) {
      tracker.rows.splice(UIState.activeRow, 1);
    }

    this.refresh();
    closeMenu();
  }

  deleteCol() {
    const tracker = this.getTracker();

    if (UIState.activeCol !== null) {
      tracker.columns.splice(UIState.activeCol, 1);
      tracker.rows.forEach(r => r.splice(UIState.activeCol, 1));
    }

    this.refresh();
    closeMenu();
  }
}
