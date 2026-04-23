import { startPress, cancelPress, showMenu } from './ui.js';

let activeDropdown = null;

export const Table = {
  render: (columns, data) => {
    const headerRow = document.getElementById('headerRow');
    const tbody = document.getElementById('tableBody');
    headerRow.innerHTML = '';
    tbody.innerHTML = '';

    const closeDropdown = () => {
      if (activeDropdown) {
        activeDropdown.classList.add('hidden');
        activeDropdown = null;
      }
    };

    document.addEventListener('click', () => closeDropdown(), { once: true });

    columns.forEach((col, colIndex) => {
      const th = document.createElement('th');
      th.className = 'px-4 py-3 cursor-pointer select-none bg-gray-50 border-b';

      const input = document.createElement('input');
      input.value = typeof col === 'object' ? col.name : col;
      input.className = 'bg-transparent outline-none text-center font-medium w-full pointer-events-none';

      input.addEventListener('change', (e) => {
        if (typeof col === 'object') col.name = e.target.value;
        else columns[colIndex] = e.target.value;
        document.dispatchEvent(new Event('table:update'));
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

        const cellData = typeof cell === 'object' ? cell : { value: cell, type: 'text' };

        let isSelect = false;
        const input = document.createElement('input');
        input.className = 'w-full bg-transparent outline-none text-center';

        if (cellData.type === 'checkbox') {
          input.type = 'checkbox';
          input.checked = cellData.value === true;
        } 
        else if (cellData.type === 'date') {
          const wrapper = document.createElement('div');
          wrapper.className = 'w-full flex justify-center';
        
          input.type = 'date';
          input.value = cellData.value || '';
          input.className =
            'bg-transparent outline-none text-sm w-[110px] text-center';
        
          wrapper.appendChild(input);
          td.appendChild(wrapper);
        }
        else if (cellData.type === 'select') {
  isSelect = true;

  const column =
    typeof columns[colIndex] === 'object'
      ? columns[colIndex]
      : { name: columns[colIndex], type: 'text' };

  if (!column.options) column.options = [];

  const wrapper = document.createElement('div');
  wrapper.className = 'relative';

  const display = document.createElement('div');
  display.textContent = cellData.value || 'Select';
  display.className = 'cursor-pointer text-center';

  const dropdown = document.createElement('div');
  dropdown.className = 'fixed bg-white border rounded shadow z-[9999] hidden';

  const addContainer = document.createElement('div');
  addContainer.className = 'flex flex-col gap-2 p-2 border-b';

  const addInput = document.createElement('input');
  addInput.placeholder = 'Add option';
  addInput.className = 'w-full px-2 py-1 text-sm outline-none border rounded';

  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'w-full py-1 bg-blue-500 text-white text-sm rounded';

  addContainer.appendChild(addInput);
  addContainer.appendChild(addBtn);
  dropdown.appendChild(addContainer);

  const renderOptions = () => {
    dropdown.querySelectorAll('.opt').forEach(el => el.remove());

    column.options.forEach(opt => {
      const optEl = document.createElement('div');
      optEl.textContent = opt;
      optEl.className = 'opt px-2 py-1 hover:bg-gray-100 cursor-pointer';

      optEl.addEventListener('click', (e) => {
        e.stopPropagation();

        data[rowIndex][colIndex] = {
          value: opt,
          type: 'select'
        };

        display.textContent = opt;

        document.dispatchEvent(new Event('table:update'));
        closeDropdown();
      });

      dropdown.appendChild(optEl);
    });
  };

  renderOptions();

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const val = addInput.value.trim();
    if (!val) return;

    if (!column.options) column.options = [];
    
    if (!column.options.includes(val)) {
      column.options = [...column.options, val];
    }

    addInput.value = '';

    renderOptions();
    document.dispatchEvent(new Event('table:update'));
  });

  display.addEventListener('click', (e) => {
    e.stopPropagation();

    const rect = display.getBoundingClientRect();

    dropdown.style.top = rect.bottom + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';

    if (activeDropdown && activeDropdown !== dropdown) {
      activeDropdown.classList.add('hidden');
    }

    dropdown.classList.toggle('hidden');
    activeDropdown = dropdown;
  });

  document.body.appendChild(dropdown);

  wrapper.appendChild(display);
  td.appendChild(wrapper);
} 
        else {
          input.type = 'text';
          input.value = cellData.value || '';
          input.classList.add('pointer-events-none');
          
          const isLink = typeof cellData.value === 'string' && /^https?:\/\//.test(cellData.value);
          
          if (isLink) {
            input.classList.add('text-blue-500');
          } else {
            input.classList.remove('text-blue-500');
          }
          if (isLink && !input.dataset.linkBound) {
            input.dataset.linkBound = "true";
            input.style.cursor = 'pointer';
        
            input.addEventListener('click', (e) => {
              e.stopPropagation();
              window.open(cellData.value, '_blank');
            });
          }
          
            input.addEventListener('change', (e) => {
              data[rowIndex][colIndex] = {
                value: e.target.value,
                type: 'text'
              };
              document.dispatchEvent(new Event('table:update'));
            });
          
            td.addEventListener('dblclick', () => {
              input.classList.remove('pointer-events-none');
              input.focus();
            });
          
            input.addEventListener('blur', () => {
              input.classList.add('pointer-events-none');
            });
          
            td.appendChild(input);
        }

        if (!isSelect) {
          input.addEventListener('change', (e) => {
            data[rowIndex][colIndex] = cellData.type === 'checkbox'
              ? { value: e.target.checked, type: 'checkbox' }
              : { value: e.target.value, type: cellData.type };

            document.dispatchEvent(new Event('table:update'));
          });

          td.appendChild(input);
        }

        if (!isSelect) {
          td.addEventListener('mousedown', (e) => startPress(e, rowIndex, colIndex, 'row'));
          td.addEventListener('mouseup', cancelPress);
          td.addEventListener('mouseleave', cancelPress);
        }

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