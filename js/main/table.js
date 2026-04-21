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

        let isSelect = false;
        let input = document.createElement('input');
        input.className = 'w-full bg-transparent outline-none text-center';

        if (cellData.type === 'checkbox') {
          input.type = 'checkbox';
          input.checked = cellData.value === true;
        } else if (cellData.type === 'date') {
          input.type = 'date';
          input.value = cellData.value || '';
        } else if (cellData.type === 'select') {
          isSelect = true;

          if (!cellData.options) {
            cellData.options = [];
          }

          const wrapper = document.createElement('div');
          wrapper.className = 'relative';

          const display = document.createElement('div');
          display.textContent = cellData.value || 'Select';
          display.className = 'cursor-pointer';

          const dropdown = document.createElement('div');
          dropdown.className = 'absolute left-0 top-full mt-1 w-full bg-white border rounded shadow hidden z-50';

          const addContainer = document.createElement('div');
          addContainer.className = 'flex items-center gap-1 p-1 border-b';

          const addInput = document.createElement('input');
          addInput.placeholder = 'Add option';
          addInput.className = 'flex-1 px-2 py-1 text-sm outline-none';

          const addBtn = document.createElement('button');
          addBtn.textContent = '+';
          addBtn.className = 'px-2 text-blue-500';

          addContainer.appendChild(addInput);
          addContainer.appendChild(addBtn);
          dropdown.appendChild(addContainer);

          const renderOptions = () => {
            dropdown.querySelectorAll('.opt').forEach(el => el.remove());

            cellData.options.forEach(opt => {
              const optEl = document.createElement('div');
              optEl.textContent = opt;
              optEl.className = 'opt px-2 py-1 hover:bg-gray-100 cursor-pointer';

              optEl.addEventListener('click', (e) => {
                e.stopPropagation();
                cellData.value = opt;
                display.textContent = opt;
                dropdown.classList.add('hidden');
              });

              dropdown.appendChild(optEl);
            });
          };

          renderOptions();

          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const val = addInput.value.trim();
            if (!val) return;

            if (!cellData.options.includes(val)) {
              cellData.options.push(val);
            }

            addInput.value = '';
            renderOptions();
          });

          display.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
          });

          document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
          });

          wrapper.appendChild(display);
          wrapper.appendChild(dropdown);
          td.appendChild(wrapper);
        } else {
          input.type = 'text';
          input.value = cellData.value || '';
          input.classList.add('pointer-events-none');
        }

        if (!isSelect) {
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
        }

        td.addEventListener('mousedown', (e) => startPress(e, rowIndex, colIndex, 'row'));
        td.addEventListener('mouseup', cancelPress);
        td.addEventListener('mouseleave', cancelPress);
        td.addEventListener('contextmenu', (e) => showMenu(e, rowIndex, colIndex, 'row'));

        if (!isSelect && cellData.type !== 'checkbox') {
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