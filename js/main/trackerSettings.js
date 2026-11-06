const FIELD_TYPES = ['text', 'checkbox', 'date', 'select'];

export const trackerSettingsMethods = {
  ensureTrackerSettingsPopup() {
    if (document.getElementById('trackerSettingsPopup')) {
      return;
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="trackerSettingsPopup" class="hidden fixed inset-0 z-[65] items-center justify-center bg-black/50 p-4">
        <div class="tracker-settings-dialog w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-xl sm:p-5">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">Customize Fields</h2>
              <p class="mt-1 text-xs text-gray-500">Changes apply to every application in this tracker.</p>
            </div>
            <button id="btnCloseTrackerSettings" type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close field settings">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
          <div id="trackerSettingsFields" class="max-h-[55vh] space-y-2 overflow-y-auto pr-1"></div>
          <form id="trackerAddFieldForm" class="mt-4 hidden gap-2">
            <label for="trackerAddFieldName" class="sr-only">Field name</label>
            <input id="trackerAddFieldName" type="text" class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" placeholder="Field name" />
            <label for="trackerAddFieldType" class="sr-only">Field type</label>
            <select id="trackerAddFieldType" class="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900">
              <option value="text">Text</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
            </select>
            <button type="submit" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">Add</button>
          </form>
          <div class="mt-4 flex flex-wrap justify-end gap-2">
            <button id="btnTrackerAddField" type="button" class="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-700 hover:bg-blue-500/15">Add Field</button>
            <button id="btnTrackerResetFields" type="button" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Close</button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('btnCloseTrackerSettings')?.addEventListener(
      'click',
      () => this.closeTrackerSettings(),
    );
    document.getElementById('btnTrackerResetFields')?.addEventListener(
      'click',
      () => this.closeTrackerSettings(),
    );
    document.getElementById('btnTrackerAddField')?.addEventListener(
      'click',
      () => this.toggleTrackerAddField(),
    );
    document.getElementById('trackerAddFieldForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.addTrackerField();
    });
    document.getElementById('trackerSettingsPopup')?.addEventListener('click', (event) => {
      if (event.target.id === 'trackerSettingsPopup') {
        this.closeTrackerSettings();
      }
    });
  },

  toggleTrackerSettings() {
    this.ensureTrackerSettingsPopup();
    const popup = document.getElementById('trackerSettingsPopup');

    if (!popup) {
      return;
    }

    if (popup.classList.contains('hidden')) {
      this.renderTrackerSettings();
      popup.classList.remove('hidden');
      popup.classList.add('flex');
    } else {
      this.closeTrackerSettings();
    }
  },

  closeTrackerSettings() {
    const popup = document.getElementById('trackerSettingsPopup');

    popup?.classList.add('hidden');
    popup?.classList.remove('flex');
  },

  renderTrackerSettings() {
    const container = document.getElementById('trackerSettingsFields');
    const tracker = this.getTracker();

    if (!container) {
      return;
    }

    container.replaceChildren();

    if (!tracker || !Array.isArray(tracker.columns) || tracker.columns.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'No fields yet.';
      container.appendChild(empty);
      return;
    }

    tracker.columns.forEach((column, index) => {
      const row = document.createElement('div');
      const name = document.createElement('input');
      const type = document.createElement('select');
      const deleteButton = document.createElement('button');

      row.className = 'tracker-settings-field-row flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2';
      row.draggable = true;
      row.dataset.columnIndex = String(index);

      name.type = 'text';
      name.value = this.getColumnName(column) || `Column ${index + 1}`;
      name.className = 'min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900';
      name.setAttribute('aria-label', `Field ${index + 1} name`);
      name.addEventListener('change', () => this.renameTrackerField(index, name.value));

      FIELD_TYPES.forEach((fieldType) => {
        const option = document.createElement('option');

        option.value = fieldType;
        option.textContent = fieldType[0].toUpperCase() + fieldType.slice(1);
        option.selected = (column?.type || 'text') === fieldType;
        type.appendChild(option);
      });
      type.className = 'rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900';
      type.setAttribute('aria-label', `Field ${index + 1} type`);
      type.addEventListener('change', () => this.setTrackerFieldType(index, type.value));

      deleteButton.type = 'button';
      deleteButton.className = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50';
      deleteButton.setAttribute('aria-label', `Delete ${name.value}`);
      deleteButton.innerHTML = '<i class="fa-solid fa-trash text-xs"></i>';
      deleteButton.addEventListener('click', () => this.deleteTrackerField(index));

      row.append(name, type, deleteButton);
      row.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.columnIndex);
      });
      row.addEventListener('dragover', (event) => event.preventDefault());
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        this.reorderTrackerField(
          Number(event.dataTransfer.getData('text/plain')),
          index,
        );
      });

      container.appendChild(row);
    });
  },

  toggleTrackerAddField() {
    const form = document.getElementById('trackerAddFieldForm');
    const input = document.getElementById('trackerAddFieldName');

    form?.classList.toggle('hidden');
    form?.classList.toggle('flex');

    if (!form?.classList.contains('hidden')) {
      input?.focus();
    }
  },

  addTrackerField() {
    const tracker = this.getTracker();
    const input = document.getElementById('trackerAddFieldName');
    const typeInput = document.getElementById('trackerAddFieldType');
    const name = input?.value.trim();
    const type = FIELD_TYPES.includes(typeInput?.value) ? typeInput.value : 'text';

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows) || !name) {
      return;
    }

    tracker.columns.push({
      name,
      type,
      ...(type === 'select' ? { options: [{ label: 'Option 1', color: '#6b7280' }] } : {}),
    });
    tracker.rows.forEach((row) => {
      row.push({ value: type === 'checkbox' ? false : '', type });
    });

    input.value = '';
    this.refresh();
    this.renderTrackerSettings();
  },

  renameTrackerField(columnIndex, name) {
    const tracker = this.getTracker();
    const label = String(name || '').trim();

    if (!tracker || !tracker.columns?.[columnIndex] || !label) {
      this.renderTrackerSettings();
      return;
    }

    const column = tracker.columns[columnIndex];
    tracker.columns[columnIndex] = typeof column === 'object'
      ? { ...column, name: label }
      : { name: label, type: 'text' };
    this.refresh();
    this.renderTrackerSettings();
  },

  setTrackerFieldType(columnIndex, type) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) {
      return;
    }

    if (!Number.isInteger(columnIndex) || !FIELD_TYPES.includes(type)) {
      return;
    }

    const currentColumn = tracker.columns[columnIndex];
    const name = this.getColumnName(currentColumn) || `Column ${columnIndex + 1}`;
    const existingOptions = Array.isArray(currentColumn?.options) ? currentColumn.options : [];

    tracker.columns[columnIndex] = {
      name,
      type,
      ...(type === 'select'
        ? { options: existingOptions.length ? existingOptions : [{ label: 'Option 1', color: '#6b7280' }] }
        : {}),
    };
    tracker.rows.forEach((row) => {
      const oldValue = this.getCellValue(row[columnIndex]);
      row[columnIndex] = {
        value: type === 'checkbox' ? false : normalizeValueForField(type, oldValue),
        type,
      };
    });

    this.refresh();
    this.renderTrackerSettings();
  },

  deleteTrackerField(columnIndex) {
    const tracker = this.getTracker();
    const label = this.getColumnName(tracker?.columns?.[columnIndex]) || `Column ${columnIndex + 1}`;

    if (!tracker || !Array.isArray(tracker.columns) || tracker.columns.length <= 1) {
      return;
    }

    if (!window.confirm(`Delete the "${label}" field from all applications?`)) {
      return;
    }

    tracker.columns.splice(columnIndex, 1);
    tracker.rows.forEach((row) => row.splice(columnIndex, 1));
    this.refresh();
    this.renderTrackerSettings();
  },

  reorderTrackerField(fromIndex, toIndex) {
    const tracker = this.getTracker();

    if (!tracker || fromIndex === toIndex || !Array.isArray(tracker.columns)) {
      return;
    }

    const movedToIndex = this.moveArrayItem(tracker.columns, fromIndex, toIndex);

    if (movedToIndex === false) {
      return;
    }

    tracker.rows.forEach((row) => {
      const [cell] = row.splice(fromIndex, 1);
      row.splice(movedToIndex, 0, cell);
    });
    this.refresh();
    this.renderTrackerSettings();
  },
};

function normalizeValueForField(type, value) {
  if (type === 'date' || type === 'select' || type === 'text') {
    return value === null || value === undefined ? '' : String(value);
  }

  return value;
}
