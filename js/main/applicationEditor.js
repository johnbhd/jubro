import { normalizeCellValue } from '../services/trackerData.js';

export const applicationEditorMethods = {
  ensureApplicationEditModal() {
    if (document.getElementById('applicationEditModal')) {
      return;
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div id="applicationEditModal" class="hidden fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-4">
        <div class="application-edit-dialog mx-auto my-6 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">Edit Job Application</h2>
              <p class="text-sm text-gray-500">Update this application.</p>
            </div>
            <button id="btnCloseApplicationEditModal" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close edit modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="applicationEditForm" class="space-y-4">
            <div id="applicationEditFields" class="grid grid-cols-1 gap-4 sm:grid-cols-2"></div>
            <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button id="btnCancelApplicationEdit" type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button id="btnSaveApplicationEdit" type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `);

    document.getElementById('btnCloseApplicationEditModal')?.addEventListener(
      'click',
      () => this.closeApplicationEditModal(),
    );
    document.getElementById('btnCancelApplicationEdit')?.addEventListener(
      'click',
      () => this.closeApplicationEditModal(),
    );
    document.getElementById('applicationEditModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'applicationEditModal') {
        this.closeApplicationEditModal();
      }
    });
    document.getElementById('applicationEditForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.saveApplicationEditModal();
    });
  },

  getApplicationEditFields(tracker) {
    if (!tracker || !Array.isArray(tracker.columns)) {
      return [];
    }

    return tracker.columns.map((column, index) => ({
      key: String(index),
      label: this.getColumnName(column) || `Column ${index + 1}`,
      index,
      column,
    }));
  },

  getApplicationEditFieldType(tracker, field) {
    const column = tracker?.columns?.[field.index];

    return typeof column === 'object' && column.type ? column.type : 'text';
  },

  createApplicationEditInput(field, row) {
    const tracker = this.getTracker();
    const column = tracker?.columns?.[field.index];
    const type = this.getApplicationEditFieldType(tracker, field);
    const value = this.getCellValue(row?.[field.index]);
    const label = document.createElement('label');
    const labelText = document.createElement('span');

    label.className = 'block';
    labelText.className = 'text-sm font-medium text-gray-700';
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const input = type === 'select'
      ? document.createElement('select')
      : document.createElement('input');

    input.className = 'application-edit-control mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400';
    input.dataset.fieldKey = field.key;

    if (type === 'select') {
      const options = Array.isArray(column?.options) ? column.options : [];

      options.forEach((option) => {
        const optionElement = document.createElement('option');
        const optionLabel = typeof option === 'object' ? option.label : option;

        optionElement.value = String(optionLabel ?? '');
        optionElement.textContent = String(optionLabel ?? '');
        input.appendChild(optionElement);
      });

      if (value && !options.some((option) => String(typeof option === 'object' ? option.label : option) === String(value))) {
        const currentOption = document.createElement('option');
        currentOption.value = String(value);
        currentOption.textContent = String(value);
        input.appendChild(currentOption);
      }

      input.value = value === null || value === undefined ? '' : String(value);
    } else {
      input.type = type === 'date' ? 'date' : type === 'checkbox' ? 'checkbox' : 'text';

      if (type === 'checkbox') {
        input.classList.add('h-5', 'w-5');
        input.checked = value === true;
      } else {
        input.value = value === null || value === undefined ? '' : String(value);
      }
    }

    label.appendChild(input);
    return label;
  },

  openApplicationEditModal(rowIndex) {
    const tracker = this.getTracker();
    const row = tracker?.rows?.[rowIndex];
    const fieldsContainer = document.getElementById('applicationEditFields');

    if (!tracker || !row || !fieldsContainer) {
      return;
    }

    this.activeApplicationEditRowIndex = rowIndex;
    fieldsContainer.replaceChildren();

    this.getApplicationEditFields(tracker).forEach((field) => {
      fieldsContainer.appendChild(this.createApplicationEditInput(field, row));
    });

    document.getElementById('applicationEditModal')?.classList.remove('hidden');
  },

  closeApplicationEditModal() {
    this.activeApplicationEditRowIndex = null;
    document.getElementById('applicationEditModal')?.classList.add('hidden');
  },

  saveApplicationEditModal() {
    const tracker = this.getTracker();
    const rowIndex = this.activeApplicationEditRowIndex;
    const row = tracker?.rows?.[rowIndex];

    if (!tracker || !row) {
      return;
    }

    const fieldsByKey = new Map(
      this.getApplicationEditFields(tracker).map((field) => [field.key, field]),
    );

    document.querySelectorAll('#applicationEditFields [data-field-key]').forEach((input) => {
      const field = fieldsByKey.get(input.dataset.fieldKey);

      if (!field) {
        return;
      }

      const type = this.getApplicationEditFieldType(tracker, field);
      const rawValue = type === 'checkbox' ? input.checked : input.value;

      row[field.index] = {
        value: normalizeCellValue(type, rawValue),
        type,
      };
    });

    if (this.save() === false) {
      return;
    }

    this.closeApplicationEditModal();
    this.refresh({ persist: false });
  },
};
