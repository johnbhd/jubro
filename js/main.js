import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';
import { Storage } from './storage.js';

const appBody = document.getElementById('appBody');
const tableContainer = document.getElementById('tableContainer');
const titleInput = document.querySelector('header input');

let state = Storage.load();

if (!state) {
  state = {
    active: "title1",
    data: {
      title1: {
        title: "Untitled",
        columns: ['Task', 'Category', 'Priority', 'Status'],
        rows: [
          ['Finish UI', 'Work', 'High', 'In Progress'],
          ['Workout', 'Health', 'Medium', 'Pending']
        ]
      }
    }
  };
} else if (state.columns && state.data) {
  state = {
    active: "title1",
    data: {
      title1: {
        title: "Untitled",
        columns: state.columns,
        rows: state.data
      }
    }
  };
} else if (state.columns && state.columns.active) {
  state = state.columns;
}

function getTracker() {
  return state.data[state.active];
}

const refresh = () => {
  const tracker = getTracker();
  Table.render(tracker.columns, tracker.rows);
  titleInput.value = tracker.title;
  Storage.save(state);
};

titleInput.addEventListener('input', (e) => {
  const tracker = getTracker();
  tracker.title = e.target.value;
  Storage.save(state);
});

appBody.addEventListener('click', closeMenu);
tableContainer.addEventListener('click', (e) => e.stopPropagation());

function addRow() {
  const tracker = getTracker();
  tracker.rows.push(new Array(tracker.columns.length).fill(''));
  refresh();
  closeMenu();
}

function addCol() {
  const tracker = getTracker();
  tracker.columns.push('New');
  tracker.rows.forEach(r => r.push(''));
  refresh();
  closeMenu();
}

function moveUp() {
  const tracker = getTracker();
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === 0) return;
  [tracker.rows[activeRow - 1], tracker.rows[activeRow]] =
  [tracker.rows[activeRow], tracker.rows[activeRow - 1]];
  refresh();
  closeMenu();
}

function moveDown() {
  const tracker = getTracker();
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === tracker.rows.length - 1) return;
  [tracker.rows[activeRow + 1], tracker.rows[activeRow]] =
  [tracker.rows[activeRow], tracker.rows[activeRow + 1]];
  refresh();
  closeMenu();
}

function moveLeft() {
  const tracker = getTracker();
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === 0) return;
  [tracker.columns[activeCol - 1], tracker.columns[activeCol]] =
  [tracker.columns[activeCol], tracker.columns[activeCol - 1]];
  tracker.rows.forEach(r => [r[activeCol - 1], r[activeCol]] = [r[activeCol], r[activeCol - 1]]);
  refresh();
  closeMenu();
}

function moveRight() {
  const tracker = getTracker();
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === tracker.columns.length - 1) return;
  [tracker.columns[activeCol + 1], tracker.columns[activeCol]] =
  [tracker.columns[activeCol], tracker.columns[activeCol + 1]];
  tracker.rows.forEach(r => [r[activeCol + 1], r[activeCol]] = [r[activeCol], r[activeCol + 1]]);
  refresh();
  closeMenu();
}

function deleteRow() {
  const tracker = getTracker();
  if (UIState.activeRow !== null) tracker.rows.splice(UIState.activeRow, 1);
  refresh();
  closeMenu();
}

function deleteCol() {
  const tracker = getTracker();
  if (UIState.activeCol !== null) {
    tracker.columns.splice(UIState.activeCol, 1);
    tracker.rows.forEach(r => r.splice(UIState.activeCol, 1));
  }
  refresh();
  closeMenu();
}

const buttonActions = {
  "btn-addRow": addRow,
  "btn-addCol": addCol,
  "btn-moveUp": moveUp,
  "btn-moveDown": moveDown,
  "btn-moveLeft": moveLeft,
  "btn-moveRight": moveRight,
  "btn-delRow": deleteRow,
  "btn-delCol": deleteCol
};

Object.entries(buttonActions).forEach(([id, action]) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', action);
});

refresh();