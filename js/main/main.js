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
    this.btnCloseSearch = document.getElementById('btnCloseSearch');
    this.noSearchResults = document.getElementById('noSearchResults');
    this.dashboardModal = document.getElementById('dashboardModal');
    this.dashboardSelectColumn = document.getElementById('dashboardSelectColumn');
    this.dashboardCards = document.getElementById('dashboardCards');
    this.dashboardCharts = document.getElementById('dashboardCharts');
    this.state = this.initializeState();
    this.jsonService = new JSONService();
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

  getSelectColumns() {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns)) return [];

    return tracker.columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) => typeof column === 'object' && column.type === 'select');
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
    this.btnCloseSearch?.classList.add('hidden');
    this.btnCloseSearch?.classList.remove('inline-flex');
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

  applySearchFilter() {
    const tracker = this.getTracker();
    const query = this.searchInput?.value.trim().toLowerCase() || '';
    const rows = document.querySelectorAll('#tableBody tr');
    const columnIndexes = this.getSearchColumnIndexes(tracker);
    let visibleCount = 0;

    if (!tracker || !Array.isArray(tracker.rows)) return;

    rows.forEach((rowElement, rowIndex) => {
      const row = tracker.rows[rowIndex];
      const isVisible = this.rowMatchesSearch(row, columnIndexes, query);

      rowElement.classList.toggle('hidden', !isVisible);
      if (isVisible) visibleCount += 1;
    });

    this.noSearchResults?.classList.toggle('hidden', visibleCount > 0 || !query);
  }

  refresh() {
    const tracker = this.getTracker();
    Table.render(tracker.columns, tracker.rows);
    this.titleInput.value = tracker.title;
    this.applySearchFilter();
    if (this.dashboardModal && !this.dashboardModal.classList.contains('hidden')) {
      this.renderDashboard();
    }
    this.save();
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
    
    document.getElementById('btn-type-checkbox')?.addEventListener('click', () => {
      this.setColumnType('checkbox');
    });
    
    document.getElementById('btn-type-date')?.addEventListener('click', () => {
      this.setColumnType('date');
    });
    
    document.addEventListener('table:update', () => {
      this.refresh();
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
    const tracker = this.getTracker();
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === 0) return;

    [tracker.rows[activeRow - 1], tracker.rows[activeRow]] =
    [tracker.rows[activeRow], tracker.rows[activeRow - 1]];

    this.refresh();
    closeMenu();
  }

  moveDown() {
    const tracker = this.getTracker();
    const { activeRow, activeType } = UIState;

    if (activeType !== 'row' || activeRow === null || activeRow === tracker.rows.length - 1) return;

    [tracker.rows[activeRow + 1], tracker.rows[activeRow]] =
    [tracker.rows[activeRow], tracker.rows[activeRow + 1]];

    this.refresh();
    closeMenu();
  }

  moveLeft() {
    const tracker = this.getTracker();
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === 0) return;

    [tracker.columns[activeCol - 1], tracker.columns[activeCol]] =
    [tracker.columns[activeCol], tracker.columns[activeCol - 1]];

    tracker.rows.forEach(r => {
      [r[activeCol - 1], r[activeCol]] = [r[activeCol], r[activeCol - 1]];
    });

    this.refresh();
    closeMenu();
  }

  moveRight() {
    const tracker = this.getTracker();
    const { activeCol, activeType } = UIState;

    if (activeType !== 'col' || activeCol === null || activeCol === tracker.columns.length - 1) return;

    [tracker.columns[activeCol + 1], tracker.columns[activeCol]] =
    [tracker.columns[activeCol], tracker.columns[activeCol + 1]];

    tracker.rows.forEach(r => {
      [r[activeCol + 1], r[activeCol]] = [r[activeCol], r[activeCol + 1]];
    });

    this.refresh();
    closeMenu();
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
