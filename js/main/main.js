import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';
import { renderDashboardCharts } from './dashboardCharts.js';
import { Storage } from '../storage/storage.js';
import { JSONService } from '../services/jsonService.js';

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.tableContainer = document.getElementById('tableContainer');
    this.titleInput = document.getElementById('trackerTitleInput');
    this.searchWrapper = document.getElementById('searchWrapper');
    this.searchInput = document.getElementById('jobSearchInput');
    this.sortSelect = document.getElementById('tableSortSelect');
    this.selectTextSortWrapper = document.getElementById('selectTextSortWrapper');
    this.selectTextSortSelect = document.getElementById('selectTextSortSelect');
    this.selectValueFilterWrapper = document.getElementById('selectValueFilterWrapper');
    this.selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    this.btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardSelectColumn = document.getElementById('dashboardSelectColumn');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardCharts = document.getElementById('dashboardCharts');
    this.state = this.initializeState();
    this.jsonService = new JSONService();
    this.tableClipboard = null;
    this.save();
    this.initEvents();
    this.refresh();
  }
  generateId() {
    return 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }
  initializeState() {
    let state = Storage.load();
  
   if (!state.data || Object.keys(state.data).length === 0) {
      const defaultId = this.generateId();
    
      return {
        active: defaultId,
        data: {
          [defaultId]: {
            id: defaultId,
            title: "Job Applications",
            columns: [
              { name: 'Company', type: 'text' },
              { name: 'Position', type: 'text' },
              {
                name: 'Status',
                type: 'select',
                options: [
                  { label: 'Applied', color: '#3b82f6' },
                  { label: 'Interview', color: '#69df94' },
                  { label: 'Rejected', color: '#ef4444' }
                ]
              },
              { name: 'Date', type: 'date' },
              { name: 'Link', type: 'text' }
            ],
            rows: [
              [
                { value: 'Google', type: 'text' },
                { value: 'Frontend Intern', type: 'text' },
                { value: 'Applied', type: 'select' },
                { value: '2026-04-10', type: 'date' },
                { value: 'https://careers.google.com', type: 'text' }
              ],
              [
                { value: 'Microsoft', type: 'text' },
                { value: 'Software Engineer', type: 'text' },
                { value: 'Interview', type: 'select' },
                { value: '2026-04-12', type: 'date' },
                { value: 'https://careers.microsoft.com', type: 'text' }
              ],
              [
                { value: 'Meta', type: 'text' },
                { value: 'Web Developer', type: 'text' },
                { value: 'Rejected', type: 'select' },
                { value: '2026-04-08', type: 'date' },
                { value: 'https://www.metacareers.com', type: 'text' }
              ]
            ]
          }
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
    const rows = document.querySelectorAll('#tableBody tr');
    const columnIndexes = this.getSearchColumnIndexes(tracker);
    let visibleCount = 0;

    if (!tracker || !Array.isArray(tracker.rows)) return;

    rows.forEach((rowElement, rowIndex) => {
      const row = tracker.rows[rowIndex];
      const isVisible = this.rowMatchesSearch(row, columnIndexes, query)
        && this.rowMatchesSelectFilter(row);

      rowElement.classList.toggle('hidden', !isVisible);
      if (isVisible) visibleCount += 1;
    });

    this.noSearchResults?.classList.toggle('hidden', visibleCount > 0 || !query);
  }

  refresh() {
    const tracker = this.getTracker();
    this.renderSelectTextSortOptions();
    this.renderSelectValueFilterOptions();
    this.updateSelectTextSortVisibility();
    this.applyCurrentSort();
    Table.render(tracker.columns, tracker.rows);
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
    const tableSortSelect = document.getElementById('tableSortSelect');
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
      this.applySearchFilter();
    });

    tableSortSelect?.addEventListener('change', () => {
      this.updateSelectTextSortVisibility();
      this.refresh();
    });

    selectTextSortSelect?.addEventListener('change', () => {
      if (this.selectValueFilterSelect) {
        this.selectValueFilterSelect.value = '';
      }
      this.renderSelectValueFilterOptions();
      this.refresh();
    });

    selectValueFilterSelect?.addEventListener('change', () => {
      this.refresh();
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
