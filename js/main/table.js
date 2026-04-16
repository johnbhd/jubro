import { startPress, cancelPress, showMenu } from './ui.js';

export const Table = {
  render: (columns, data) => {
    const headerRow = document.getElementById('headerRow');
    const tbody = document.getElementById('tableBody');
    headerRow.innerHTML = '';
    tbody.innerHTML = '';

    columns.forEach((col, colIndex) => {
      const th = document.createElement('th');
      th.className = 'px-4 py-3 cursor-pointer select-none bg-gray-50 border-b';
      
      const input = document.createElement('input');
      input.value = col;
      input.className = 'bg-transparent outline-none text-center font-medium w-full pointer-events-none';
      input.addEventListener('change', (e) => columns[colIndex] = e.target.value);
      
      th.appendChild(input);

      // Events
      th.addEventListener('mousedown', (e) => startPress(e, null, colIndex, 'col'));
      th.addEventListener('mouseup', cancelPress);
      th.addEventListener('mouseleave', cancelPress);
      th.addEventListener('contextmenu', (e) => showMenu(e, null, colIndex, 'col'));
      
      // Allow editing on double click
      th.addEventListener('dblclick', () => input.classList.remove('pointer-events-none'));
      input.addEventListener('blur', () => input.classList.add('pointer-events-none'));

      headerRow.appendChild(th);
    });

    data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'border-t hover:bg-gray-50';
      
      row.forEach((cell, colIndex) => {
        const td = document.createElement('td');
        td.className = 'px-4 py-3 select-none';
        
        const input = document.createElement('input');
        input.value = cell;
        input.className = 'w-full bg-transparent outline-none text-center pointer-events-none';
        input.addEventListener('change', (e) => data[rowIndex][colIndex] = e.target.value);
        
        td.appendChild(input);

        td.addEventListener('mousedown', (e) => startPress(e, rowIndex, colIndex, 'row'));
        td.addEventListener('mouseup', cancelPress);
        td.addEventListener('mouseleave', cancelPress);
        td.addEventListener('contextmenu', (e) => showMenu(e, rowIndex, colIndex, 'row'));

        // Enable typing on double click
        td.addEventListener('dblclick', () => {
            input.classList.remove('pointer-events-none');
            input.focus();
        });
        input.addEventListener('blur', () => input.classList.add('pointer-events-none'));

        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
};