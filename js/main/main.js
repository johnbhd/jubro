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
            columns: ['Company', 'Position', 'Status', 'Date Applied'],
            rows: [
              ['Google', 'Frontend Intern', 'Applied', '2026-04-01'],
              ['Meta', 'Backend Intern', 'Interview', '2026-04-05'],
              ['Amazon', 'Fullstack Intern', 'Pending', '2026-04-10']
            ]
          }
        }
      };
    }
  
    if (state.columns && state.data) {
      const defaultId = this.generateId();
  
      return {
        active: defaultId,
        data: {
          [defaultId]: {
            id: defaultId,
            title: "Untitled",
            columns: state.columns,
            rows: state.data
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

  initEvents() {
    const btnMenu = document.getElementById('btnMenu');
    const dropdown = document.getElementById('navDropdown');
    const btnImport = document.getElementById('btnImport');
    const btnExport = document.getElementById('btnExport');
    
    // toggle dropdown
    btnMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    
    // close when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });
    
    // prevent closing when clicking inside
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
    tracker.rows.push(new Array(tracker.columns.length).fill(''));
    this.refresh();
    closeMenu();
  }

  addCol() {
    const tracker = this.getTracker();
    tracker.columns.push('New');
    tracker.rows.forEach(r => r.push(''));
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
