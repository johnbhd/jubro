import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';
import { Storage } from '../storage/storage.js';

export class TrackerApp {
  constructor() {
    this.appBody = document.getElementById('appBody');
    this.tableContainer = document.getElementById('tableContainer');
    this.titleInput = document.querySelector('header input');
    this.state = this.initializeState();
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
                options: ['Applied', 'Interview', 'Rejected'] 
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
              ],
              [
                { value: 'Startup Inc.', type: 'text' },
                { value: 'Full Stack Dev', type: 'text' },
                { value: 'Applied', type: 'select' },
                { value: '2026-04-15', type: 'date' },
                { value: 'https://startup.jobs', type: 'text' }
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

  refresh() {
    const tracker = this.getTracker();
    Table.render(tracker.columns, tracker.rows);
    this.titleInput.value = tracker.title;
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
  
    tracker.rows.forEach((row) => {
      const oldCell = row[activeCol];
  
      let value = typeof oldCell === 'object' ? oldCell.value : oldCell;
  
      if (type === 'checkbox') {
        value = false;
      }
  
      if (type === 'select') {
        row[activeCol] = {
          value: value || '',
          type: 'select',
          options: oldCell?.options || ['Option 1']
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
    btnImport?.addEventListener('click', () => {
      alert("Import CSV clicked");
    });
    
    btnExport?.addEventListener('click', () => {
      alert("Export CSV clicked");
    });

    this.titleInput.addEventListener('input', (e) => {
      this.getTracker().title = e.target.value;
      this.save();
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
  
    const insertIndex = activeCol !== null ? activeCol + 1 : tracker.columns.length;
  
    tracker.columns.splice(insertIndex, 0, 'New');
  
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
