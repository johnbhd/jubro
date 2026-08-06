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
      const optionHtml = [
        '<option value="">Select</option>',
        ...options.map((option) => {
          const selected = option.label === value ? 'selected' : '';
          return `<option value="${this.escapeHtml(option.label)}" ${selected}>${this.escapeHtml(option.label)}</option>`;
        })
      ].join('');

      return `
        <label class="block">
          <span class="text-sm font-medium text-gray-700">${this.escapeHtml(field.label)}</span>
          <select
            class="list-edit-control mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-400"
            data-field-key="${this.escapeHtml(field.key)}"
          >
            ${optionHtml}
          </select>
        </label>
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
    fieldsContainer.innerHTML = this.getListEditFields(tracker)
      .map((field) => this.createListEditInput(field, row))
      .join('');

    document.getElementById('listEditModal')?.classList.remove('hidden');
  },

  closeListEditModal() {
    this.activeListEditRowIndex = null;
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
