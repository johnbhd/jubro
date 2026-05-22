import { startPress, cancelPress, showMenu, setActiveTarget, clearActiveTarget } from './ui.js';
import { createFaviconElement, getLinkFavicon, getPlatformFavicon } from './favicon.js';

let activeDropdown = null;

function getContrastColor(hex) {
  if (!hex) return '#000000';
  const c = hex.replace('#', '');
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

function getColumnName(column) {
  return typeof column === 'object' ? column.name : column;
}

function getCellValue(cell) {
  return typeof cell === 'object' ? cell.value : cell;
}

function getColumnIndexByNames(columns, names) {
  const wantedNames = names.map((name) => String(name).trim().toLowerCase());

  return columns.findIndex((column) => (
    wantedNames.includes(String(getColumnName(column) || '').trim().toLowerCase())
  ));
}

function blurOnEnter(input) {
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.target.tagName === 'TEXTAREA') return;

    e.preventDefault();
    input.blur();
  });
}

function dispatchRowReorder(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

  document.dispatchEvent(new CustomEvent('table:row-reorder', {
    detail: {
      fromIndex,
      toIndex
    }
  }));
}

function dispatchColumnReorder(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

  document.dispatchEvent(new CustomEvent('table:col-reorder', {
    detail: {
      fromIndex,
      toIndex
    }
  }));
}

function placeDropdown(dropdown, anchor) {
  const viewportPadding = 8;
  const rect = anchor.getBoundingClientRect();

  dropdown.style.left = `${viewportPadding}px`;
  dropdown.style.top = `${viewportPadding}px`;

  const dropdownRect = dropdown.getBoundingClientRect();
  const maxLeft = window.innerWidth - dropdownRect.width - viewportPadding;
  const maxTop = window.innerHeight - dropdownRect.height - viewportPadding;
  const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
  const preferredTop = rect.bottom + viewportPadding;
  const fallbackTop = rect.top - dropdownRect.height - viewportPadding;
  const top = preferredTop <= maxTop
    ? preferredTop
    : Math.max(viewportPadding, Math.min(fallbackTop, maxTop));

  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${top}px`;
}

export const Table = {
  render: (columns, data) => {
    const headerRow = document.getElementById('headerRow');
    const tbody = document.getElementById('tableBody');
    const canUseNativeDrag = window.matchMedia('(pointer: fine)').matches;
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
      th.className = `px-4 py-3 select-none bg-gray-50 border-b whitespace-nowrap ${canUseNativeDrag ? 'cursor-grab active:cursor-grabbing' : ''}`;
      th.draggable = canUseNativeDrag;
      th.dataset.colIndex = String(colIndex);

      if (canUseNativeDrag) {
        th.addEventListener('dragstart', (e) => {
          closeDropdown();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(colIndex));
          th.classList.add('opacity-50');
        });

        th.addEventListener('dragend', () => {
          th.classList.remove('opacity-50');
          headerRow.querySelectorAll('th').forEach((headerCell) => {
            headerCell.classList.remove('border-l-2', 'border-black');
          });
        });

        th.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          th.classList.add('border-l-2', 'border-black');
        });

        th.addEventListener('dragleave', () => {
          th.classList.remove('border-l-2', 'border-black');
        });

        th.addEventListener('drop', (e) => {
          e.preventDefault();
          th.classList.remove('border-l-2', 'border-black');

          const fromIndex = Number(e.dataTransfer.getData('text/plain'));
          const toIndex = Number(th.dataset.colIndex);
          dispatchColumnReorder(fromIndex, toIndex);
        });
      }

      const input = document.createElement('input');
      input.value = typeof col === 'object' ? col.name : col;
      input.className = 'bg-transparent outline-none text-center font-medium w-full pointer-events-none';
      blurOnEnter(input);

      input.addEventListener('change', (e) => {
        if (typeof col === 'object') col.name = e.target.value;
        else columns[colIndex] = e.target.value;
        document.dispatchEvent(new Event('table:update'));
      });

      th.appendChild(input);

      th.addEventListener('pointerdown', (e) => {
        setActiveTarget(null, colIndex, 'col');
        startPress(e, null, colIndex, 'col');
      });
      th.addEventListener('pointerenter', () => setActiveTarget(null, colIndex, 'col'));
      th.addEventListener('click', () => setActiveTarget(null, colIndex, 'col'));
      th.addEventListener('pointerup', cancelPress);
      th.addEventListener('pointercancel', cancelPress);
      th.addEventListener('pointerleave', () => {
        cancelPress();
        clearActiveTarget(null, colIndex, 'col');
      });
      th.addEventListener('contextmenu', (e) => showMenu(e, null, colIndex, 'col'));

      th.addEventListener('dblclick', () => input.classList.remove('pointer-events-none'));
      input.addEventListener('blur', () => input.classList.add('pointer-events-none'));

      headerRow.appendChild(th);
    });

    data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = `border-t hover:bg-gray-50 ${canUseNativeDrag ? 'cursor-grab active:cursor-grabbing' : ''}`;
      tr.draggable = canUseNativeDrag;
      tr.dataset.rowIndex = String(rowIndex);
      tr.addEventListener('pointerenter', () => setActiveTarget(rowIndex, null, 'row'));
      tr.addEventListener('click', () => setActiveTarget(rowIndex, null, 'row'));
      tr.addEventListener('contextmenu', (e) => showMenu(e, rowIndex, null, 'row'));

      if (canUseNativeDrag) {
        tr.addEventListener('dragstart', (e) => {
          closeDropdown();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(rowIndex));
          tr.classList.add('opacity-50');
        });

        tr.addEventListener('dragend', () => {
          tr.classList.remove('opacity-50');
          tbody.querySelectorAll('tr').forEach((rowElement) => {
            rowElement.classList.remove('border-t-2', 'border-black');
          });
        });

        tr.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          tr.classList.add('border-t-2', 'border-black');
        });

        tr.addEventListener('dragleave', () => {
          tr.classList.remove('border-t-2', 'border-black');
        });

        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          tr.classList.remove('border-t-2', 'border-black');

          const fromIndex = Number(e.dataTransfer.getData('text/plain'));
          const toIndex = Number(tr.dataset.rowIndex);
          dispatchRowReorder(fromIndex, toIndex);
        });
      }

      row.forEach((cell, colIndex) => {
        const td = document.createElement('td');
        td.className = 'px-4 py-3 select-none whitespace-nowrap';
        td.addEventListener('pointerenter', () => setActiveTarget(rowIndex, colIndex, 'row'));
        td.addEventListener('click', () => setActiveTarget(rowIndex, colIndex, 'row'));
        td.addEventListener('pointerleave', () => clearActiveTarget(rowIndex, colIndex, 'row'));

        const cellData = typeof cell === 'object' ? cell : { value: cell, type: 'text' };

        let isSelect = false;
        const input = document.createElement('input');
        input.className = 'w-full bg-transparent outline-none text-center';
        input.classList.add('min-w-[120px]');

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
        
          if (typeof columns[colIndex] !== 'object') {
            columns[colIndex] = {
              name: columns[colIndex],
              type: 'select',
              options: []
            };
          }
        
          const column = columns[colIndex];
          if (!column.options) column.options = [];
          const isPlatformColumn = ['platform', 'source'].includes(
            String(getColumnName(column) || '').trim().toLowerCase()
          );
        
          const wrapper = document.createElement('div');
          wrapper.className = 'relative';
        
          const display = document.createElement('div');
          display.className = 'cursor-pointer text-center px-2 rounded border';
          display.classList.add('min-w-[120px]');
        
          const current = column.options.find(o => o.label === cellData.value);
        
        const renderDisplayContent = (labelText) => {
          display.innerHTML = '';

          if (isPlatformColumn && labelText !== 'Select') {
            display.appendChild(createFaviconElement(getPlatformFavicon(labelText)));
          }

          const text = document.createElement('span');
          text.className = 'truncate';
          text.textContent = labelText;
          display.appendChild(text);
        };

        renderDisplayContent(current?.label || 'Select');
        display.className = 'cursor-pointer inline-flex items-center justify-center gap-2 px-2 rounded';
        
        if (current) {
          display.style.backgroundColor = current.color;
          display.style.color = getContrastColor(current.color);
          display.style.border = 'none';
        } else {
          display.style.backgroundColor = 'transparent';
          display.style.color = '#000';
          display.style.border = '1px solid #e5e7eb';
        }
          const dropdown = document.createElement('div');
          dropdown.className = 'fixed bg-white border rounded shadow z-[9999] hidden min-w-[160px]';
        
          const addContainer = document.createElement('form');
          addContainer.className = 'flex flex-col gap-2 p-2 border-b';
        
          const addInput = document.createElement('input');
          addInput.placeholder = 'Add option';
          addInput.className = 'w-full px-2 py-1 text-sm outline-none border rounded';
        
          const addBtn = document.createElement('button');
          addBtn.type = 'submit';
          addBtn.textContent = '+';
          addBtn.className = 'w-full py-1 bg-blue-500 text-white text-sm rounded cursor-pointer';
        
          addContainer.appendChild(addInput);
          addContainer.appendChild(addBtn);
          dropdown.appendChild(addContainer);
        
          const renderOptions = () => {
            dropdown.querySelectorAll('.opt').forEach(el => el.remove());
        
            column.options.forEach((opt, optIndex) => {
              const optRow = document.createElement('div');
              optRow.className = 'opt flex items-center gap-2 px-2 py-1 hover:bg-gray-100';
        
              const label = document.createElement('span');
              label.textContent = opt.label;
              label.className = 'flex-1 truncate min-w-0 cursor-pointer';
        
              const colorInput = document.createElement('input');
              colorInput.type = 'color';
              colorInput.value = opt.color || '#cccccc';
              colorInput.className = 'w-5 h-5 p-0 border-none cursor-pointer';
        
              const deleteBtn = document.createElement('i');
              deleteBtn.className = 'fa-solid fa-trash text-red-500 text-sm cursor-pointer';
        
              label.addEventListener('click', (e) => {
                e.stopPropagation();
        
                data[rowIndex][colIndex] = {
                  value: opt.label,
                  type: 'select'
                };
        
                renderDisplayContent(opt.label);
                display.style.backgroundColor = opt.color;
                display.style.color = getContrastColor(opt.color);
        
                document.dispatchEvent(new Event('table:update'));
                closeDropdown();
              });
        
              colorInput.addEventListener('input', (e) => {
                opt.color = e.target.value;
        
                if (cellData.value === opt.label) {
                  display.style.backgroundColor = opt.color;
                  display.style.color = getContrastColor(opt.color);
                }
        
                document.dispatchEvent(new Event('table:update'));
              });
        
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
        
                column.options.splice(optIndex, 1);
        
                data.forEach(row => {
                  if (row[colIndex]?.value === opt.label) {
                    row[colIndex].value = '';
                  }
                });
        
                renderOptions();
                document.dispatchEvent(new Event('table:update'));
              });
        
              
              optRow.appendChild(label);
              optRow.appendChild(colorInput);
              optRow.appendChild(deleteBtn);
        
              dropdown.appendChild(optRow);
            });
          };
        
          renderOptions();
        
          const addOption = () => {
            const val = addInput.value.trim();
            if (!val) return;
        
            if (!column.options.find(o => o.label === val)) {
              column.options.push({
                label: val,
                color: '#cccccc'
              });
            }
        
            addInput.value = '';
        
            renderOptions();
            document.dispatchEvent(new Event('table:update'));
          };

          addContainer.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addOption();
          });

          addContainer.addEventListener('click', (e) => {
            e.stopPropagation();
          });
        
          display.addEventListener('click', (e) => {
            e.stopPropagation();
        
            if (activeDropdown && activeDropdown !== dropdown) {
              activeDropdown.classList.add('hidden');
            }
        
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
              placeDropdown(dropdown, display);
            }
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
          
          if (isLink) {
            const linkWrapper = document.createElement('div');
            linkWrapper.className = 'flex min-w-[180px] items-center justify-center gap-2';
            linkWrapper.appendChild(createFaviconElement(getLinkFavicon(cellData.value)));
            linkWrapper.appendChild(input);
            td.appendChild(linkWrapper);
          } else {
            td.appendChild(input);
          }
        }

        if (!isSelect) {
          blurOnEnter(input);

          input.addEventListener('change', (e) => {
            data[rowIndex][colIndex] = cellData.type === 'checkbox'
              ? { value: e.target.checked, type: 'checkbox' }
              : { value: e.target.value, type: cellData.type };

            document.dispatchEvent(new Event('table:update'));
          });

          if (!input.parentElement) {
            td.appendChild(input);
          }
        }

        if (!isSelect) {
          td.addEventListener('pointerdown', (e) => {
            setActiveTarget(rowIndex, colIndex, 'row');
            startPress(e, rowIndex, colIndex, 'row');
          });
          td.addEventListener('pointerup', cancelPress);
          td.addEventListener('pointercancel', cancelPress);
          td.addEventListener('pointerleave', cancelPress);
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
