import { DEFAULT_HIDDEN_LIST_FIELDS, LIST_VIEW_SETTINGS_KEY } from './constants.js';

export const listSettingsMethods = {
  loadListViewSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIST_VIEW_SETTINGS_KEY) || '{}');
      const hiddenFields = Array.isArray(parsed.hiddenFields)
        ? parsed.hiddenFields
        : DEFAULT_HIDDEN_LIST_FIELDS;
      const hiddenColumns = Array.isArray(parsed.hiddenColumns)
        ? parsed.hiddenColumns.map(Number).filter(Number.isInteger)
        : [];

      return { hiddenFields, hiddenColumns };
    } catch (err) {
      return { hiddenFields: [...DEFAULT_HIDDEN_LIST_FIELDS], hiddenColumns: [] };
    }
  },

  saveListViewSettings(settings) {
    localStorage.setItem(LIST_VIEW_SETTINGS_KEY, JSON.stringify(settings));
  },

  isListColumnVisible(tracker, columnIndex) {
    if (!tracker || columnIndex < 0) return false;

    const settings = this.loadListViewSettings();
    const fieldKey = this.getListColumnFieldKey(tracker, columnIndex);

    return !settings.hiddenColumns.includes(columnIndex)
      && !settings.hiddenFields.includes(fieldKey);
  },

  setListColumnVisibility(columnIndex, isVisible) {
    const tracker = this.getTracker();
    const settings = this.loadListViewSettings();
    const fieldKey = this.getListColumnFieldKey(tracker, columnIndex);

    settings.hiddenColumns = settings.hiddenColumns.filter((index) => index !== columnIndex);
    settings.hiddenFields = settings.hiddenFields.filter((key) => key !== fieldKey);

    if (!isVisible) {
      settings.hiddenColumns.push(columnIndex);
    }

    this.saveListViewSettings(settings);
    this.renderListView(tracker);
    this.applySearchFilter();
  },

  resetListViewSettings() {
    this.saveListViewSettings({ hiddenFields: [...DEFAULT_HIDDEN_LIST_FIELDS], hiddenColumns: [] });
    this.renderListSettingsToggles();
    this.renderListView(this.getTracker());
    this.applySearchFilter();
  },

  getListSettingsMode() {
    return this.listSettingsMode || 'default';
  },

  setListSettingsMode(mode) {
    this.listSettingsMode = this.getListSettingsMode() === mode ? 'default' : mode;
    this.renderListSettingsToggles();
  },

  ensureListViewSettingsButton() {
    if (!this.listSortSelect || document.getElementById('btnListViewSettings')) return;

    const button = document.createElement('button');
    button.id = 'btnListViewSettings';
    button.type = 'button';
    button.className = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-600 hover:bg-white';
    button.setAttribute('aria-label', 'View settings');
    button.innerHTML = '<i class="fa-solid fa-sliders text-xs"></i>';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleListSettingsPopup(button);
    });

    this.listSortSelect.insertAdjacentElement('afterend', button);
  },

  ensureListSettingsPopup() {
    if (document.getElementById('listSettingsPopup')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="listSettingsPopup" class="hidden fixed inset-0 z-[65] items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-4 text-gray-100 shadow-xl sm:p-5">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-semibold">Customize Fields</h2>
              <p class="mt-1 text-xs text-gray-400">These fields are shown across the whole list view.</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button id="btnListSettingsAdd" type="button" class="list-settings-action inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-500/15 hover:text-blue-300" aria-label="Add field">
                <i class="fa-solid fa-plus text-xs"></i>
              </button>
              <button id="btnListSettingsEdit" type="button" class="list-settings-action inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-500/15 hover:text-blue-300" aria-label="Edit field labels">
                <i class="fa-solid fa-pencil text-xs"></i>
              </button>
              <button id="btnListSettingsDelete" type="button" class="list-settings-action inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/15 hover:text-red-300" aria-label="Delete fields">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
              <button id="btnCloseListSettings" type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Close view settings">
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
          <div id="listSettingsToggles" class="max-h-72 space-y-2 overflow-y-auto pr-1"></div>
          <form id="listInlineAddFieldForm" class="mt-4 hidden gap-2">
            <label for="listInlineAddFieldName" class="sr-only">Add field</label>
            <input id="listInlineAddFieldName" type="text" class="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" placeholder="Add field" />
            <label for="listInlineAddFieldType" class="sr-only">Field type</label>
            <select id="listInlineAddFieldType" class="rounded-lg border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white outline-none focus:border-blue-400">
              <option value="text">Text</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
            </select>
            <button type="submit" class="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">
              Add
            </button>
          </form>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button id="btnListSettingsAddBottom" type="button" class="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/15">
              <i class="fa-solid fa-plus mr-1 text-xs"></i>
              Add Field
            </button>
            <button id="btnResetListSettings" type="button" class="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-100 hover:bg-gray-800">
              Reset to Default
            </button>
          </div>
          </div>
      </div>
    `);

    document.getElementById('btnListSettingsAdd')?.addEventListener('click', () => this.showInlineAddField());
    document.getElementById('btnListSettingsAddBottom')?.addEventListener('click', () => this.showInlineAddField());
    document.getElementById('btnListSettingsEdit')?.addEventListener('click', () => this.setListSettingsMode('edit'));
    document.getElementById('btnListSettingsDelete')?.addEventListener('click', () => this.setListSettingsMode('delete'));
    document.getElementById('btnCloseListSettings')?.addEventListener('click', () => this.closeListSettingsPopup());
    document.getElementById('btnResetListSettings')?.addEventListener('click', () => this.resetListViewSettings());
    document.getElementById('listInlineAddFieldForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.addListFieldFromInlineForm();
    });
    document.addEventListener('click', (event) => {
      const popup = document.getElementById('listSettingsPopup');
      const button = document.getElementById('btnListViewSettings');

      if (!popup || popup.classList.contains('hidden')) return;
      if (popup.contains(event.target) || button?.contains(event.target)) return;

      this.closeListSettingsPopup();
    });
  },

  updateListSettingsModeButtons() {
    const mode = this.getListSettingsMode();
    const editButton = document.getElementById('btnListSettingsEdit');
    const deleteButton = document.getElementById('btnListSettingsDelete');

    editButton?.classList.toggle('bg-blue-600', mode === 'edit');
    editButton?.classList.toggle('text-white', mode === 'edit');
    deleteButton?.classList.toggle('bg-red-600', mode === 'delete');
    deleteButton?.classList.toggle('text-white', mode === 'delete');
  },

  renderListSettingsToggles() {
    const container = document.getElementById('listSettingsToggles');
    if (!container) return;

    const tracker = this.getTracker();
    const settings = this.loadListViewSettings();
    const mode = this.getListSettingsMode();

    this.updateListSettingsModeButtons();

    if (!tracker || !Array.isArray(tracker.columns) || tracker.columns.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">No columns yet.</p>';
      return;
    }

    const note = mode === 'edit'
      ? '<p class="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">You\'re editing field labels. Changes will be reflected across the list.</p>'
      : mode === 'delete'
        ? '<p class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">Delete mode is active. Deleting a field removes it from all jobs in this tracker.</p>'
        : '';

    container.innerHTML = note + tracker.columns.map((column, index) => {
      const fieldKey = this.getListColumnFieldKey(tracker, index);
      const checked = !settings.hiddenColumns.includes(index) && !settings.hiddenFields.includes(fieldKey)
        ? 'checked'
        : '';
      const label = this.getColumnName(column) || `Column ${index + 1}`;
      const type = typeof column === 'object' && column.type ? column.type : 'text';

      return `
        <div class="list-settings-field-row flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-3" draggable="true" data-column-index="${index}">
          <button type="button" class="list-settings-drag-handle cursor-grab text-gray-500 hover:text-gray-200" aria-label="Drag field">
            <i class="fa-solid fa-grip-vertical text-xs"></i>
          </button>
          <div class="min-w-0 flex-1">
            ${mode === 'edit'
              ? `<input type="text" class="list-settings-label-input h-8 w-full rounded-lg border border-gray-700 bg-gray-950 px-2 text-sm text-white outline-none focus:border-blue-400" data-column-index="${index}" value="${this.escapeHtml(label)}" />`
              : `<span class="block truncate text-sm text-gray-100">${this.escapeHtml(label)}</span>`
            }
          </div>
          <label class="sr-only" for="list-settings-field-type-${index}">Field type for ${this.escapeHtml(label)}</label>
          <select id="list-settings-field-type-${index}" class="list-settings-type h-8 shrink-0 rounded-lg border border-gray-700 bg-gray-950 px-2 text-xs text-white outline-none focus:border-blue-400" data-column-index="${index}" aria-label="Field type for ${this.escapeHtml(label)}">
            <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
            <option value="checkbox" ${type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
            <option value="date" ${type === 'date' ? 'selected' : ''}>Date</option>
            <option value="select" ${type === 'select' ? 'selected' : ''}>Select</option>
          </select>
          <input type="checkbox" class="list-settings-toggle h-5 w-5 shrink-0" data-column-index="${index}" ${checked} aria-label="Show ${this.escapeHtml(label)}" />
          <button type="button" class="${mode === 'delete' ? 'inline-flex' : 'hidden'} list-settings-delete-field h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/15 hover:text-red-200" data-column-index="${index}" aria-label="Delete ${this.escapeHtml(label)}">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.list-settings-toggle').forEach((toggle) => {
      toggle.addEventListener('change', () => {
        this.setListColumnVisibility(Number(toggle.dataset.columnIndex), toggle.checked);
      });
    });

    container.querySelectorAll('.list-settings-type').forEach((select) => {
      select.addEventListener('change', () => {
        this.setListFieldType(Number(select.dataset.columnIndex), select.value);
      });
    });

    container.querySelectorAll('.list-settings-label-input').forEach((input) => {
      input.addEventListener('change', () => {
        this.renameListField(Number(input.dataset.columnIndex), input.value);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.blur();
        }
      });
    });

    container.querySelectorAll('.list-settings-delete-field').forEach((button) => {
      button.addEventListener('click', () => {
        this.confirmDeleteListField(Number(button.dataset.columnIndex));
      });
    });

    container.querySelectorAll('.list-settings-field-row').forEach((row) => {
      row.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.columnIndex);
      });
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        this.reorderListField(
          Number(event.dataTransfer.getData('text/plain')),
          Number(row.dataset.columnIndex)
        );
      });
    });
  },

  refreshListSettingsAfterSchemaChange() {
    this.refresh();
    this.renderListSettingsToggles();
  },

  renameListField(columnIndex, name) {
    const tracker = this.getTracker();
    const label = String(name || '').trim();

    if (!tracker || !Array.isArray(tracker.columns) || !label) {
      this.renderListSettingsToggles();
      return;
    }

    const column = tracker.columns[columnIndex];
    if (typeof column === 'object') {
      tracker.columns[columnIndex] = { ...column, name: label };
    } else {
      tracker.columns[columnIndex] = label;
    }

    this.refreshListSettingsAfterSchemaChange();
  },

  createListFieldCell(type) {
    return {
      value: type === 'checkbox' ? false : '',
      type
    };
  },

  setListFieldType(columnIndex, type) {
    const tracker = this.getTracker();
    const allowedTypes = ['text', 'checkbox', 'date', 'select'];

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;
    if (!Number.isInteger(columnIndex) || !allowedTypes.includes(type)) return;

    const currentColumn = tracker.columns[columnIndex];
    const name = this.getColumnName(currentColumn) || `Column ${columnIndex + 1}`;
    const existingOptions = Array.isArray(currentColumn?.options) ? currentColumn.options : [];

    tracker.columns[columnIndex] = {
      name,
      type,
      ...(type === 'select'
        ? {
            options: existingOptions.length
              ? existingOptions
              : [{ label: 'Option 1', color: '#cccccc' }]
          }
        : {})
    };

    tracker.rows.forEach((row) => {
      if (!Array.isArray(row)) return;

      const oldCell = row[columnIndex];
      const value = type === 'checkbox'
        ? false
        : (typeof oldCell === 'object' ? oldCell.value : oldCell) || '';

      row[columnIndex] = { value, type };
    });

    this.refreshListSettingsAfterSchemaChange();
  },

  showInlineAddField() {
    const form = document.getElementById('listInlineAddFieldForm');
    const nameInput = document.getElementById('listInlineAddFieldName');

    form?.classList.remove('hidden');
    form?.classList.add('flex');
    nameInput?.focus();
  },

  hideInlineAddField() {
    const form = document.getElementById('listInlineAddFieldForm');

    form?.classList.add('hidden');
    form?.classList.remove('flex');
  },

  addListFieldFromInlineForm() {
    const tracker = this.getTracker();
    const input = document.getElementById('listInlineAddFieldName');
    const typeInput = document.getElementById('listInlineAddFieldType');
    const name = input?.value.trim();
    const type = ['text', 'checkbox', 'date', 'select'].includes(typeInput?.value)
      ? typeInput.value
      : 'text';

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows) || !name) return;

    tracker.columns.push({
      name,
      type,
      ...(type === 'select' ? { options: [{ label: 'Option 1', color: '#6b7280' }] } : {})
    });
    tracker.rows.forEach((row) => {
      row.push(this.createListFieldCell(type));
    });

    if (input) input.value = '';
    if (typeInput) typeInput.value = 'text';
    this.hideInlineAddField();
    this.refreshListSettingsAfterSchemaChange();
  },

  confirmDeleteListField(columnIndex) {
    const tracker = this.getTracker();
    const label = this.getColumnName(tracker?.columns?.[columnIndex]) || `Column ${columnIndex + 1}`;

    if (!tracker || !Array.isArray(tracker.columns)) return;
    if (!window.confirm(`Are you sure you want to delete the "${label}" field? This will remove this field from all jobs.`)) return;

    this.deleteListField(columnIndex);
  },

  deleteListField(columnIndex) {
    const tracker = this.getTracker();
    const settings = this.loadListViewSettings();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= tracker.columns.length) return;

    tracker.columns.splice(columnIndex, 1);
    tracker.rows.forEach((row) => {
      if (Array.isArray(row)) row.splice(columnIndex, 1);
    });
    settings.hiddenColumns = settings.hiddenColumns
      .filter((index) => index !== columnIndex)
      .map((index) => (index > columnIndex ? index - 1 : index));
    this.saveListViewSettings(settings);
    this.refreshListSettingsAfterSchemaChange();
  },

  reorderListField(fromIndex, toIndex) {
    const tracker = this.getTracker();
    const settings = this.loadListViewSettings();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;
    if (fromIndex === toIndex) return;

    const originalIndexes = tracker.columns.map((_, index) => index);
    const movedToIndex = this.moveArrayItem(tracker.columns, fromIndex, toIndex);
    if (movedToIndex === false) return;
    this.moveArrayItem(originalIndexes, fromIndex, toIndex);

    tracker.rows.forEach((row) => {
      if (!Array.isArray(row) || fromIndex >= row.length) return;

      const [cell] = row.splice(fromIndex, 1);
      row.splice(movedToIndex, 0, cell);
    });

    settings.hiddenColumns = settings.hiddenColumns
      .map((oldIndex) => originalIndexes.indexOf(oldIndex))
      .filter((index) => index >= 0);
    this.saveListViewSettings(settings);
    this.refreshListSettingsAfterSchemaChange();
  },

  toggleListSettingsPopup(anchor) {
    this.ensureListSettingsPopup();
    this.renderListSettingsToggles();

    const popup = document.getElementById('listSettingsPopup');
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
      popup.classList.remove('hidden');
      popup.classList.add('flex');
    } else {
      this.closeListSettingsPopup();
    }
  },

  closeListSettingsPopup() {
    const popup = document.getElementById('listSettingsPopup');

    popup?.classList.add('hidden');
    popup?.classList.remove('flex');
  }
};
