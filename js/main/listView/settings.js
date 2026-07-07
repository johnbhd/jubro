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
      <div id="listSettingsPopup" class="hidden fixed inset-x-3 bottom-3 z-[65] rounded-2xl border border-gray-700 bg-gray-900 p-4 text-gray-100 shadow-xl sm:inset-x-auto sm:bottom-auto sm:w-72">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold">View Settings</h2>
          <button id="btnCloseListSettings" type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Close view settings">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
        <div id="listSettingsToggles" class="max-h-72 space-y-2 overflow-y-auto pr-1"></div>
        <button id="btnResetListSettings" type="button" class="mt-4 w-full rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-100 hover:bg-gray-800">
          Reset to Default
        </button>
      </div>
    `);

    document.getElementById('btnCloseListSettings')?.addEventListener('click', () => this.closeListSettingsPopup());
    document.getElementById('btnResetListSettings')?.addEventListener('click', () => this.resetListViewSettings());
    document.addEventListener('click', (event) => {
      const popup = document.getElementById('listSettingsPopup');
      const button = document.getElementById('btnListViewSettings');

      if (!popup || popup.classList.contains('hidden')) return;
      if (popup.contains(event.target) || button?.contains(event.target)) return;

      this.closeListSettingsPopup();
    });
  },

  renderListSettingsToggles() {
    const container = document.getElementById('listSettingsToggles');
    if (!container) return;

    const tracker = this.getTracker();
    const settings = this.loadListViewSettings();

    if (!tracker || !Array.isArray(tracker.columns) || tracker.columns.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">No columns yet.</p>';
      return;
    }

    container.innerHTML = tracker.columns.map((column, index) => {
      const fieldKey = this.getListColumnFieldKey(tracker, index);
      const checked = !settings.hiddenColumns.includes(index) && !settings.hiddenFields.includes(fieldKey)
        ? 'checked'
        : '';
      const label = this.getColumnName(column) || `Column ${index + 1}`;

      return `
        <label class="flex items-center justify-between gap-4 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-3">
          <span class="text-sm text-gray-100">${this.escapeHtml(label)}</span>
          <input type="checkbox" class="list-settings-toggle h-5 w-5" data-column-index="${index}" ${checked} />
        </label>
      `;
    }).join('');

    container.querySelectorAll('.list-settings-toggle').forEach((toggle) => {
      toggle.addEventListener('change', () => {
        this.setListColumnVisibility(Number(toggle.dataset.columnIndex), toggle.checked);
      });
    });
  },

  toggleListSettingsPopup(anchor) {
    this.ensureListSettingsPopup();
    this.renderListSettingsToggles();

    const popup = document.getElementById('listSettingsPopup');
    if (!popup) return;

    popup.classList.toggle('hidden');

    if (!popup.classList.contains('hidden') && window.matchMedia('(min-width: 640px)').matches) {
      const rect = anchor.getBoundingClientRect();
      popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 300))}px`;
      popup.style.top = `${rect.bottom + 8}px`;
    }
  },

  closeListSettingsPopup() {
    document.getElementById('listSettingsPopup')?.classList.add('hidden');
  }
};
