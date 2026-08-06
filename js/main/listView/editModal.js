export const listEditMethods = {
  ensureListEditModal() {
    if (document.getElementById('listEditModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="listEditModal" class="hidden fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-4">
        <div class="list-edit-dialog mx-auto my-6 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">Edit Job Application</h2>
              <p class="text-sm text-gray-500">Update this list item.</p>
            </div>
            <button id="btnCloseListEditModal" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close edit modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="listEditForm" class="space-y-4">
            <div id="listEditFields" class="grid grid-cols-1 gap-4 sm:grid-cols-2"></div>
            <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button id="btnCancelListEdit" type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button id="btnSaveListEdit" type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('btnCloseListEditModal')?.addEventListener('click', () => this.closeListEditModal());
    document.getElementById('btnCancelListEdit')?.addEventListener('click', () => this.closeListEditModal());
    document.getElementById('listEditModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'listEditModal') this.closeListEditModal();
    });
    document.getElementById('listEditForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveListEditModal();
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.list-edit-select-trigger, .list-edit-select-dropdown')) return;
      this.closeListEditSelectDropdowns();
    });
  },

  getListEditFields(tracker) {
    if (!tracker || !Array.isArray(tracker.columns)) return [];

    return tracker.columns.map((column, index) => ({
      key: String(index),
      label: this.getColumnName(column) || `Column ${index + 1}`,
      index,
      column
    }));
  },

  getListEditColumn(tracker, field) {
    return Number.isInteger(field.index) && field.index >= 0 ? tracker?.columns?.[field.index] : null;
  },

  getListEditFieldType(tracker, field) {
    const column = this.getListEditColumn(tracker, field);

    if (typeof column === 'object' && column.type) return column.type;

    return 'text';
  },

  ensureListEditColumn(tracker, field) {
    return Number.isInteger(field.index) ? field.index : -1;
  },

  createListEditInput(field, row) {
    const tracker = this.getTracker();
    const value = field.index >= 0 ? this.getCellValue(row[field.index]) : '';
    const type = this.getListEditFieldType(tracker, field);

    if (type === 'select') {
      const column = this.getListEditColumn(tracker, field);
      const options = this.getDashboardOptions(column);
      const selected = options.find((option) => option.label === value);
      const selectedColor = selected?.color || '';
      const selectedTextColor = selectedColor ? this.getContrastColor(selectedColor) : '';

      return `
        <div class="block">
          <span class="text-sm font-medium text-gray-700">${this.escapeHtml(field.label)}</span>
          <input type="hidden" data-field-key="${this.escapeHtml(field.key)}" value="${this.escapeHtml(value || '')}" />
          <button
            type="button"
            class="list-edit-select-trigger list-edit-control mt-1 flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
            data-column-index="${field.index}"
            ${selectedColor ? `style="background-color: ${selectedColor}; color: ${selectedTextColor}; border-color: ${selectedColor};"` : ''}
          >
            <span class="truncate">${this.escapeHtml(selected?.label || 'Select')}</span>
            <i class="fa-solid fa-chevron-down ml-3 text-xs"></i>
          </button>
        </div>
      `;
    }

    const inputType = type === 'date' ? 'date' : 'text';

    return `
      <label class="block">
        <span class="text-sm font-medium text-gray-700">${this.escapeHtml(field.label)}</span>
        <input
          type="${inputType}"
          class="list-edit-control mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
          data-field-key="${this.escapeHtml(field.key)}"
          value="${this.escapeHtml(value || '')}"
        />
      </label>
    `;
  },

  openListEditModal(rowIndex) {
    const tracker = this.getTracker();
    const row = tracker?.rows?.[rowIndex];
    const fieldsContainer = document.getElementById('listEditFields');

    if (!tracker || !row || !fieldsContainer) return;

    this.activeListEditRowIndex = rowIndex;
    this.removeListEditSelectDropdowns();
    fieldsContainer.innerHTML = this.getListEditFields(tracker)
      .map((field) => this.createListEditInput(field, row))
      .join('');
    this.setupListEditSelectFields(tracker);

    document.getElementById('listEditModal')?.classList.remove('hidden');
  },

  placeListEditSelectDropdown(dropdown, trigger) {
    const viewportPadding = 8;
    const gap = 4;
    const triggerRect = trigger.getBoundingClientRect();

    dropdown.style.width = `${triggerRect.width}px`;
    dropdown.style.left = `${viewportPadding}px`;
    dropdown.style.top = `${viewportPadding}px`;

    const dropdownRect = dropdown.getBoundingClientRect();
    const maxLeft = window.innerWidth - dropdownRect.width - viewportPadding;
    const maxTop = window.innerHeight - dropdownRect.height - viewportPadding;
    const left = Math.max(viewportPadding, Math.min(triggerRect.left, maxLeft));
    const preferredTop = triggerRect.bottom + gap;
    const fallbackTop = triggerRect.top - dropdownRect.height - gap;
    const top = preferredTop <= maxTop
      ? preferredTop
      : Math.max(viewportPadding, Math.min(fallbackTop, maxTop));

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  },

  closeListEditSelectDropdowns() {
    document.querySelectorAll('.list-edit-select-dropdown').forEach((dropdown) => {
      dropdown.classList.add('hidden');
    });
    this.activeListEditDropdown = null;
  },

  removeListEditSelectDropdowns() {
    document.querySelectorAll('.list-edit-select-dropdown').forEach((dropdown) => dropdown.remove());
    this.activeListEditDropdown = null;
  },

  setupListEditSelectFields(tracker) {
    document.querySelectorAll('#listEditFields .list-edit-select-trigger').forEach((trigger) => {
      const columnIndex = Number(trigger.dataset.columnIndex);
      const column = tracker.columns[columnIndex];
      const valueInput = trigger.parentElement?.querySelector('[data-field-key]');

      if (!column || !valueInput) return;
      if (!Array.isArray(column.options)) column.options = [];
      column.options = column.options.map((option) => (
        typeof option === 'string'
          ? { label: option, color: '#6b7280' }
          : { ...option, color: option.color || '#6b7280' }
      ));

      const dropdown = document.createElement('div');
      dropdown.className = 'list-edit-select-dropdown fixed z-[90] hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl';

      const addForm = document.createElement('form');
      addForm.className = 'list-edit-select-add flex gap-2 border-b border-gray-200 p-2';

      const addInput = document.createElement('input');
      addInput.type = 'text';
      addInput.placeholder = 'Add option';
      addInput.className = 'list-edit-select-add-input min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400';

      const addButton = document.createElement('button');
      addButton.type = 'submit';
      addButton.textContent = '+';
      addButton.className = 'cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500';
      addButton.setAttribute('aria-label', 'Add option');

      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'list-edit-select-options max-h-52 overflow-y-auto py-1';

      addForm.append(addInput, addButton);
      dropdown.append(addForm, optionsContainer);
      document.body.appendChild(dropdown);

      const updateTrigger = () => {
        const selected = column.options.find((option) => option.label === valueInput.value);
        const text = trigger.querySelector('span');

        if (text) text.textContent = selected?.label || 'Select';
        trigger.style.backgroundColor = selected?.color || '';
        trigger.style.color = selected ? this.getContrastColor(selected.color) : '';
        trigger.style.borderColor = selected?.color || '';
      };

      const renderOptions = () => {
        optionsContainer.innerHTML = '';

        column.options.forEach((option, optionIndex) => {
          const optionRow = document.createElement('div');
          optionRow.className = 'list-edit-select-option flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50';

          const label = document.createElement('button');
          label.type = 'button';
          label.textContent = option.label;
          label.className = 'min-w-0 flex-1 cursor-pointer truncate text-left text-gray-900';

          const colorInput = document.createElement('input');
          colorInput.type = 'color';
          colorInput.value = option.color || '#6b7280';
          colorInput.className = 'h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0';
          colorInput.setAttribute('aria-label', `Color for ${option.label}`);

          const deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-red-500 hover:bg-red-50';
          deleteButton.setAttribute('aria-label', `Delete ${option.label}`);
          deleteButton.innerHTML = '<i class="fa-solid fa-trash text-xs"></i>';

          label.addEventListener('click', (event) => {
            event.stopPropagation();
            valueInput.value = option.label;
            updateTrigger();
            this.closeListEditSelectDropdowns();
          });

          colorInput.addEventListener('input', (event) => {
            event.stopPropagation();
            option.color = colorInput.value;
            updateTrigger();
            this.save();
          });

          deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const deletedLabel = option.label;

            column.options.splice(optionIndex, 1);
            tracker.rows.forEach((trackerRow) => {
              if (this.getCellValue(trackerRow[columnIndex]) === deletedLabel) {
                trackerRow[columnIndex] = { value: '', type: 'select' };
              }
            });
            if (valueInput.value === deletedLabel) valueInput.value = '';
            updateTrigger();
            renderOptions();
            this.save();
          });

          optionRow.append(label, colorInput, deleteButton);
          optionsContainer.appendChild(optionRow);
        });
      };

      addForm.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const label = addInput.value.trim();

        if (!label || column.options.some((option) => option.label === label)) return;

        column.options.push({ label, color: '#6b7280' });
        addInput.value = '';
        renderOptions();
        this.save();
      });

      dropdown.addEventListener('click', (event) => event.stopPropagation());

      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const shouldOpen = dropdown.classList.contains('hidden');

        this.closeListEditSelectDropdowns();
        if (!shouldOpen) return;

        dropdown.classList.remove('hidden');
        this.placeListEditSelectDropdown(dropdown, trigger);
        this.activeListEditDropdown = dropdown;
      });

      renderOptions();
      updateTrigger();
    });
  },

  closeListEditModal() {
    this.activeListEditRowIndex = null;
    this.removeListEditSelectDropdowns();
    document.getElementById('listEditModal')?.classList.add('hidden');
  },

  saveListEditModal() {
    const tracker = this.getTracker();
    const rowIndex = this.activeListEditRowIndex;
    const row = tracker?.rows?.[rowIndex];

    if (!tracker || !row) return;

    const fieldsByKey = new Map(this.getListEditFields(tracker).map((field) => [field.key, field]));

    document.querySelectorAll('#listEditFields [data-field-key]').forEach((input) => {
      const field = fieldsByKey.get(input.dataset.fieldKey);
      if (!field) return;

      const columnIndex = this.ensureListEditColumn(tracker, field);
      if (columnIndex < 0) return;

      const columnType = this.getListEditFieldType(tracker, {
        ...field,
        index: columnIndex
      });

      row[columnIndex] = {
        value: input.value.trim(),
        type: columnType
      };
    });

    this.save();
    this.closeListEditModal();
    this.renderListView(tracker);
    this.applySearchFilter();
  }
};
