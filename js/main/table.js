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
      input.value = typeof col === 'object' ? col.name : col;
      input.className = 'bg-transparent outline-none text-center font-medium w-full pointer-events-none';

      input.addEventListener('change', (e) => {
        if (typeof col === 'object') {
          col.name = e.target.value;
        } else {
          columns[colIndex] = e.target.value;
        }
      });

      th.appendChild(input);

      th.addEventListener('mousedown', (e) => startPress(e, null, colIndex, 'col'));
      th.addEventListener('mouseup', cancelPress);
      th.addEventListener('mouseleave', cancelPress);
      th.addEventListener('contextmenu', (e) => showMenu(e, null, colIndex, 'col'));

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

        const cellData = typeof cell === 'object'
          ? cell
          : { value: cell, type: 'text' };

        const input = document.createElement('input');
        input.className = 'w-full bg-transparent outline-none text-center';

        if (cellData.type === 'checkbox') {
          input.type = 'checkbox';
          input.checked = cellData.value === true;
        } else if (cellData.type === 'date') {
          input.type = 'date';
          input.value = cellData.value || '';
        } else {
          input.type = 'text';
          input.value = cellData.value || '';
          input.classList.add('pointer-events-none');
        }

        input.addEventListener('change', (e) => {
          if (cellData.type === 'checkbox') {
            data[rowIndex][colIndex] = {
              value: e.target.checked,
              type: 'checkbox'
            };
          } else {
            data[rowIndex][colIndex] = {
              value: e.target.value,
              type: cellData.type
            };
          }
        });

        td.appendChild(input);

        td.addEventListener('mousedown', (e) => startPress(e, rowIndex, colIndex, 'row'));
        td.addEventListener('mouseup', cancelPress);
        td.addEventListener('mouseleave', cancelPress);
        td.addEventListener('contextmenu', (e) => showMenu(e, rowIndex, colIndex, 'row'));

        if (cellData.type !== 'checkbox') {
          td.addEventListener('dblclick', () => {
            input.classList.remove('pointer-events-none');
            input.focus();
          });
          input.addEventListener('blur', () => input.classList.add('pointer-events-none'));
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }
};