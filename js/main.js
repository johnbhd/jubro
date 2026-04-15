import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';
import { Storage } from './storage.js';

const appBody = document.getElementById('appBody');
const tableContainer = document.getElementById('tableContainer');

let columns = ['Task', 'Category', 'Priority', 'Status'];
let data = [
  ['Finish UI', 'Work', 'High', 'In Progress'],
  ['Workout', 'Health', 'Medium', 'Pending']
];

const saved = Storage.load();
if (saved) {
  columns = saved.columns;
  data = saved.data;
}

const refresh = () => {
  Table.render(columns, data);
  Storage.save(columns, data);
};

document.getElementById('appBody').addEventListener('click', closeMenu);
document.getElementById('tableContainer').addEventListener('click', (e) => e.stopPropagation());

function addRow() {
  data.push(new Array(columns.length).fill(''));
  refresh();
  closeMenu();
}

function addCol() {
  columns.push('New');
  data.forEach(r => r.push(''));
  refresh();
  closeMenu();
}

function moveUp() {
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === 0) return;
  [data[activeRow - 1], data[activeRow]] = [data[activeRow], data[activeRow - 1]];
  refresh();
  closeMenu();
}

function moveDown() {
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === data.length - 1) return;
  [data[activeRow + 1], data[activeRow]] = [data[activeRow], data[activeRow + 1]];
  refresh();
  closeMenu();
}

function moveLeft() {
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === 0) return;
  [columns[activeCol - 1], columns[activeCol]] = [columns[activeCol], columns[activeCol - 1]];
  data.forEach(r => [r[activeCol - 1], r[activeCol]] = [r[activeCol], r[activeCol - 1]]);
  refresh();
  closeMenu();
}

function moveRight() {
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === columns.length - 1) return;
  [columns[activeCol + 1], columns[activeCol]] = [columns[activeCol], columns[activeCol + 1]];
  data.forEach(r => [r[activeCol + 1], r[activeCol]] = [r[activeCol], r[activeCol + 1]]);
  refresh();
  closeMenu();
}

function deleteRow() {
  if (UIState.activeRow !== null) data.splice(UIState.activeRow, 1);
  refresh();
  closeMenu();
}

function deleteCol() {
  if (UIState.activeCol !== null) {
    columns.splice(UIState.activeCol, 1);
    data.forEach(r => r.splice(UIState.activeCol, 1));
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

function bindActions(map) {
  Object.entries(map).forEach(([id, action]) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', action);
    }
  });
}

bindActions(buttonActions);

refresh();