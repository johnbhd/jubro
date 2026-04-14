import { Table } from './table.js';
import { closeMenu, UIState } from './ui.js';

// App State
let columns = ['Task', 'Category', 'Priority', 'Status'];
let data = [
  ['Finish UI', 'Work', 'High', 'In Progress'],
  ['Workout', 'Health', 'Medium', 'Pending']
];

const refresh = () => Table.render(columns, data);

// Global UI Listeners
document.getElementById('appBody').addEventListener('click', closeMenu);
document.getElementById('tableContainer').addEventListener('click', (e) => e.stopPropagation());

// Menu Action Listeners
document.getElementById('btn-addRow').addEventListener('click', () => {
  data.push(new Array(columns.length).fill(''));
  refresh(); closeMenu();
});

document.getElementById('btn-addCol').addEventListener('click', () => {
  columns.push('New');
  data.forEach(r => r.push(''));
  refresh(); closeMenu();
});

document.getElementById('btn-moveUp').addEventListener('click', () => {
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === 0) return;
  [data[activeRow - 1], data[activeRow]] = [data[activeRow], data[activeRow - 1]];
  refresh(); closeMenu();
});

document.getElementById('btn-moveDown').addEventListener('click', () => {
  const { activeRow, activeType } = UIState;
  if (activeType !== 'row' || activeRow === null || activeRow === data.length - 1) return;
  [data[activeRow + 1], data[activeRow]] = [data[activeRow], data[activeRow + 1]];
  refresh(); closeMenu();
});

document.getElementById('btn-moveLeft').addEventListener('click', () => {
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === 0) return;
  [columns[activeCol - 1], columns[activeCol]] = [columns[activeCol], columns[activeCol - 1]];
  data.forEach(r => [r[activeCol - 1], r[activeCol]] = [r[activeCol], r[activeCol - 1]]);
  refresh(); closeMenu();
});

document.getElementById('btn-moveRight').addEventListener('click', () => {
  const { activeCol, activeType } = UIState;
  if (activeType !== 'col' || activeCol === null || activeCol === columns.length - 1) return;
  [columns[activeCol + 1], columns[activeCol]] = [columns[activeCol], columns[activeCol + 1]];
  data.forEach(r => [r[activeCol + 1], r[activeCol]] = [r[activeCol], r[activeCol + 1]]);
  refresh(); closeMenu();
});

document.getElementById('btn-delRow').addEventListener('click', () => {
  if (UIState.activeRow !== null) data.splice(UIState.activeRow, 1);
  refresh(); closeMenu();
});

document.getElementById('btn-delCol').addEventListener('click', () => {
  if (UIState.activeCol !== null) {
    columns.splice(UIState.activeCol, 1);
    data.forEach(r => r.splice(UIState.activeCol, 1));
  }
  refresh(); closeMenu();
});

// Kick off
refresh();