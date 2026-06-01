import { clearActiveTarget, closeMenu, setActiveTarget, showMenu } from './ui.js';
import { getLinkFavicon, getPlatformFavicon } from './favicon.js';
import { BOARD_PAGE_SIZE, BOARD_VIEW_KEY } from './constants.js';

const LIST_VIEW_SETTINGS_KEY = 'jubro_list_view_settings';
const DEFAULT_HIDDEN_LIST_FIELDS = ['email'];

export const trackerListViewMethods = {
getListColumnIndexes(tracker) {
    return {
      company: this.getColumnIndexByNames(tracker, ['company'], 0),
      position: this.getColumnIndexByNames(tracker, ['position', 'role', 'job title'], 1),
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['website', 'link', 'url', 'job link'], 5),
      email: this.getColumnIndexByNames(tracker, ['email'], -1),
      location: this.getColumnIndexByNames(tracker, ['location'], -1)
    };
  },

getListRowText(row) {
    return row
      .map((cell) => this.getCellDisplay(cell))
      .join(' ')
      .toLowerCase();
  },

getListSelectColumns() {
    return this.getSelectColumns();
  },

getActiveListFilterValues() {
    return Object.values(this.activeListFilters).filter(Boolean);
  },

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

getListColumnFieldKey(tracker, columnIndex) {
    const indexes = this.getListColumnIndexes(tracker);
    const columnName = this.normalizeText(this.getColumnName(tracker?.columns?.[columnIndex]));

    if (columnIndex === indexes.company || columnName === 'company') return 'company';
    if (columnIndex === indexes.position || ['position', 'role', 'job title'].includes(columnName)) return 'position';
    if (columnIndex === indexes.platform || ['platform', 'source'].includes(columnName)) return 'platform';
    if (columnIndex === indexes.status || columnName === 'status') return 'status';
    if (columnIndex === indexes.date || ['date', 'date applied'].includes(columnName)) return 'date';
    if (columnIndex === indexes.link || ['website', 'link', 'url', 'job link'].includes(columnName)) return 'website';
    if (columnIndex === indexes.email || columnName === 'email') return 'email';
    if (columnIndex === indexes.location || columnName === 'location') return 'location';

    return `column-${columnIndex}`;
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

isUsefulListValue(value) {
    const normalized = this.normalizeText(value);

    return Boolean(normalized) && normalized !== '-' && normalized !== 'n/a' && normalized !== 'na';
  },

getFirstRowLink(row) {
    const cell = row.find((item) => this.isHttpLink(this.getCellValue(item)));

    return this.getCellValue(cell) || '';
  },

pruneListFilters() {
    const validOptionsByIndex = new Map(
      this.getListSelectColumns().map(({ column, index }) => [
        String(index),
        new Set(this.getDashboardOptions(column).map((option) => option.label))
      ])
    );

    Object.keys(this.activeListFilters).forEach((index) => {
      const validOptions = validOptionsByIndex.get(index);

      if (!validOptions || !validOptions.has(this.activeListFilters[index])) {
        delete this.activeListFilters[index];
      }
    });
  },

getFaviconHtml(favicon) {
    if (!favicon?.url) {
      return '<span class="favicon-holder"><i class="fa-solid fa-globe text-[11px] text-gray-500"></i></span>';
    }

    return `
      <span class="favicon-holder">
        <img
          src="${this.escapeHtml(favicon.url)}"
          alt=""
          class="h-5 w-5 rounded"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.replaceWith(Object.assign(document.createElement('i'), { className: 'fa-solid fa-globe text-[11px] text-gray-500' }))"
        />
      </span>
    `;
  },

getListBadgeHtml(column, value) {
    if (!this.isUsefulListValue(value)) return '';

    const safeValue = this.escapeHtml(value);
    const color = this.getOptionColor(column, value, '#6b7280');
    const textColor = this.getContrastColor(color);
    const columnName = this.normalizeText(this.getColumnName(column));
    const platformIcon = ['platform', 'source'].includes(columnName)
      ? this.getFaviconHtml(getPlatformFavicon(value))
      : '';

    return `
      <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style="background-color: ${color}; color: ${textColor};">
        ${platformIcon}
        ${safeValue}
      </span>
    `;
  },

renderListSelectBadges(tracker, row) {
    return this.getListSelectColumns().map(({ column, index }) => (
      this.getListBadgeHtml(column, this.getCellDisplay(row[index]))
    )).join('');
  },

renderListBadgesForCard(tracker, row, statusIndex) {
    const selectColumns = this.getListSelectColumns();
    const statusColumn = selectColumns.find(({ index }) => index === statusIndex);
    const otherBadges = selectColumns
      .filter(({ index }) => index !== statusIndex)
      .filter(({ column, index }) => {
        const name = this.normalizeText(this.getColumnName(column));
        return !['platform', 'source'].includes(name) || this.isListColumnVisible(tracker, index);
      })
      .filter(({ index }) => this.isListColumnVisible(tracker, index))
      .map(({ column, index }) => this.getListBadgeHtml(column, this.getCellDisplay(row[index])))
      .join('');
    const statusBadge = statusColumn && this.isListColumnVisible(tracker, statusColumn.index)
      ? this.getListBadgeHtml(statusColumn.column, this.getCellDisplay(row[statusColumn.index]))
      : '';

    return {
      otherBadges,
      statusBadge
    };
  },

ensureListEditModal() {
    if (document.getElementById('listEditModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="listEditModal" class="hidden fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-4">
        <div class="mx-auto my-6 w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-xl">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">Edit Job Application</h2>
              <p class="text-sm text-gray-400">Update this list item.</p>
            </div>
            <button id="btnCloseListEditModal" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Close edit modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="listEditForm" class="space-y-4">
            <div id="listEditFields" class="grid grid-cols-1 gap-4 sm:grid-cols-2"></div>
            <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button id="btnCancelListEdit" type="button" class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-100 hover:bg-gray-800">Cancel</button>
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
          return `<option value="${this.escapeHtml(option.label)}" style="background-color: #1f2937; color: #ffffff;" ${selected}>${this.escapeHtml(option.label)}</option>`;
        })
      ].join('');

      return `
        <label class="block">
          <span class="text-sm font-medium text-gray-200">${this.escapeHtml(field.label)}</span>
          <select
            class="mt-1 h-10 w-full rounded-lg border border-gray-700 !bg-gray-800 px-3 text-sm !text-white outline-none focus:border-gray-400"
            style="background-color: #1f2937; color: #ffffff; color-scheme: dark;"
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
        <span class="text-sm font-medium text-gray-200">${this.escapeHtml(field.label)}</span>
        <input
          type="${inputType}"
          class="mt-1 h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm text-white outline-none focus:border-gray-400"
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
  },

rowMatchesListFilters(row, tracker) {
    const listQuery = this.normalizeText(this.listSearchInput?.value);

    if (listQuery && !this.getListRowText(row).includes(listQuery)) {
      return false;
    }

    for (const [columnIndex, filterValue] of Object.entries(this.activeListFilters)) {
      if (!filterValue) continue;

      if (this.normalizeText(this.getCellValue(row?.[Number(columnIndex)])) !== this.normalizeText(filterValue)) {
        return false;
      }
    }

    return true;
  },

getStatusBadgeClass(status) {
    const normalized = this.normalizeText(status);

    if (normalized === 'applied') return 'bg-blue-100 text-blue-700';
    if (normalized === 'interview') return 'bg-green-100 text-green-700';
    if (normalized === 'rejected') return 'bg-red-100 text-red-700';

    return 'bg-gray-100 text-gray-700';
  },

getPlatformDotClass(platform) {
    const normalized = this.normalizeText(platform);

    if (normalized === 'linkedin') return 'bg-blue-600';
    if (normalized === 'indeed') return 'bg-indigo-600';
    if (normalized === 'jobstreet') return 'bg-sky-600';
    if (normalized === 'company website') return 'bg-emerald-600';

    return 'bg-gray-400';
  },

updateListStats(tracker) {
    if (!this.listThisMonthCount || !this.listTotalCount) return;

    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const dateIndex = this.getDateColumnIndex(tracker);
    const now = new Date();
    const thisMonthCount = rows.filter((row) => {
      const dateValue = this.getCellValue(row?.[dateIndex]);
      const date = new Date(`${dateValue || ''}T00:00:00`);

      return !Number.isNaN(date.getTime())
        && date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth();
    }).length;

    this.listThisMonthCount.textContent = String(thisMonthCount);
    this.listTotalCount.textContent = String(rows.length);
  },

countColumnValue(rows, columnIndex, value) {
    if (!value) return rows.length;

    return rows.filter((row) => (
      this.normalizeText(this.getCellValue(row?.[columnIndex])) === this.normalizeText(value)
    )).length;
  },

createListFilterChip(column, columnIndex, value, count) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'list-filter-chip';
    chip.dataset.columnIndex = String(columnIndex);
    chip.dataset.filterValue = value;

    const optionColor = value
      ? this.getOptionColor(column, value)
      : '#111827';
    chip.style.setProperty('--chip-color', optionColor);
    chip.style.setProperty('--chip-text-color', this.getContrastColor(optionColor));

    chip.append(document.createTextNode(value || 'All'));

    const countBadge = document.createElement('span');
    countBadge.className = 'list-filter-count';
    countBadge.textContent = String(count);
    chip.appendChild(countBadge);

    return chip;
  },

renderListFilterSections(tracker) {
    if (!this.listFilterSections) return;

    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const selectColumns = this.getListSelectColumns();
    this.listFilterSections.innerHTML = '';
    this.pruneListFilters();

    if (selectColumns.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-400';
      empty.textContent = 'No data exists.';
      this.listFilterSections.appendChild(empty);
      return;
    }

    selectColumns.forEach(({ column, index }) => {
      const options = this.getDashboardOptions(column);
      const section = document.createElement('div');
      const title = document.createElement('p');
      const chips = document.createElement('div');

      title.className = 'text-xs font-medium uppercase text-gray-400';
      title.textContent = this.getColumnName(column) || `Column ${index + 1}`;
      chips.className = 'mt-3 flex flex-wrap gap-2';

      chips.appendChild(this.createListFilterChip(column, index, '', rows.length));

      options.forEach((option) => {
        chips.appendChild(
          this.createListFilterChip(
            column,
            index,
            option.label,
            this.countColumnValue(rows, index, option.label)
          )
        );
      });

      if (options.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-sm text-gray-400';
        empty.textContent = 'No options yet.';
        chips.appendChild(empty);
      }

      section.appendChild(title);
      section.appendChild(chips);
      this.listFilterSections.appendChild(section);
    });
  },

getSortedListRows(tracker) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const directionValue = this.listSortSelect?.value || 'date-desc';

    if (directionValue === 'manual') {
      return rows.map((row, rowIndex) => ({ row, rowIndex }));
    }

    const dateIndex = this.getDateColumnIndex(tracker);
    const direction = directionValue === 'date-asc' ? 1 : -1;

    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .sort((a, b) => {
        if (dateIndex < 0) return a.rowIndex - b.rowIndex;

        return (this.getDateSortValue(a.row, dateIndex) - this.getDateSortValue(b.row, dateIndex)) * direction;
      });
  },

renderListAdditionalDetails(tracker, row, indexes) {
    const selectColumnIndexes = new Set(this.getListSelectColumns().map(({ index }) => index));
    const reservedIndexes = new Set([
      indexes.company,
      indexes.position,
      indexes.date,
      indexes.link,
      indexes.email,
      indexes.location,
      ...selectColumnIndexes
    ].filter((index) => index >= 0));

    return tracker.columns
      .map((column, index) => {
        if (reservedIndexes.has(index) || !this.isListColumnVisible(tracker, index)) return '';

        const value = this.getCellDisplay(row[index]);
        if (!this.isUsefulListValue(value)) return '';

        const label = this.getColumnName(column) || `Column ${index + 1}`;

        return `
          <span class="text-xs text-gray-500">
            <span class="font-medium text-gray-400">${this.escapeHtml(label)}:</span>
            ${this.escapeHtml(value)}
          </span>
        `;
      })
      .filter(Boolean)
      .join('');
  },

setListManualSort() {
    if (this.listSortSelect) {
      this.listSortSelect.value = 'manual';
    }
  },

reorderListRow(fromIndex, toIndex) {
    this.setListManualSort();
    this.reorderRow(fromIndex, toIndex);
  },

moveListRow(rowIndex, direction) {
    const orderedRows = this.getSortedListRows(this.getTracker());
    const currentDisplayIndex = orderedRows.findIndex((item) => item.rowIndex === rowIndex);
    const target = orderedRows[currentDisplayIndex + direction];

    if (!target) return;

    this.reorderListRow(rowIndex, target.rowIndex);
  },

renderListView(tracker) {
    if (!this.listCards) return;

    this.ensureListViewSettingsButton();
    this.ensureListSettingsPopup();
    this.ensureListEditModal();
    this.listCards.innerHTML = '';
    this.updateListStats(tracker);
    this.renderListFilterSections(tracker);

    if (!tracker || !Array.isArray(tracker.rows) || tracker.rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400';
      empty.textContent = 'No rows yet.';
      this.listCards.appendChild(empty);
      return;
    }

    const indexes = this.getListColumnIndexes(tracker);

    this.getSortedListRows(tracker).forEach(({ row, rowIndex }) => {
      const article = document.createElement('article');
      article.className = 'list-view-row rounded-md border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow';
      article.dataset.rowIndex = String(rowIndex);
      article.addEventListener('pointerenter', () => setActiveTarget(rowIndex, null, 'row'));
      article.addEventListener('click', () => setActiveTarget(rowIndex, null, 'row'));
      article.addEventListener('pointerleave', () => clearActiveTarget(rowIndex, null, 'row'));
      article.addEventListener('contextmenu', (event) => showMenu(event, rowIndex, null, 'row'));

      const dateApplied = this.getCellDisplay(row[indexes.date]);
      const position = this.getCellDisplay(row[indexes.position]);
      const company = this.getCellDisplay(row[indexes.company]);
      const link = this.getFirstRowLink(row);
      const email = indexes.email >= 0 ? this.getCellValue(row[indexes.email]) : '';
      const location = indexes.location >= 0 ? this.getCellValue(row[indexes.location]) : '';
      const safeDateApplied = this.escapeHtml(dateApplied);
      const safePosition = this.escapeHtml(position);
      const safeCompany = this.escapeHtml(company);
      const safeLink = this.escapeHtml(link || '#');
      const linkFavicon = getLinkFavicon(link);
      const safeHostname = this.escapeHtml(linkFavicon.hostname);
      const { otherBadges, statusBadge } = this.renderListBadgesForCard(tracker, row, indexes.status);
      const shouldShowPosition = this.isListColumnVisible(tracker, indexes.position) && this.isUsefulListValue(position);
      const shouldShowCompany = this.isListColumnVisible(tracker, indexes.company) && this.isUsefulListValue(company);
      const titleText = shouldShowPosition
        ? safePosition
        : shouldShowCompany
          ? safeCompany
          : 'Job Application';
      const shouldShowDate = this.isListColumnVisible(tracker, indexes.date) && this.isUsefulListValue(dateApplied);
      const shouldShowWebsite = this.isListColumnVisible(tracker, indexes.link) && this.isUsefulListValue(link);
      const extraDetails = [
        this.isListColumnVisible(tracker, indexes.email) && this.isUsefulListValue(email)
          ? `<span class="text-xs text-gray-500"><i class="fa-solid fa-envelope mr-1 text-[10px] text-gray-400"></i>${this.escapeHtml(email)}</span>`
          : '',
        this.isListColumnVisible(tracker, indexes.location) && this.isUsefulListValue(location)
          ? `<span class="text-xs text-gray-500"><i class="fa-solid fa-location-dot mr-1 text-[10px] text-gray-400"></i>${this.escapeHtml(location)}</span>`
          : '',
        this.renderListAdditionalDetails(tracker, row, indexes)
      ].filter(Boolean).join('');

      article.innerHTML = `
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            ${shouldShowDate ? `<p class="text-xs font-medium text-gray-400">${safeDateApplied}</p>` : ''}
            <h3 class="mt-1 truncate text-lg font-semibold text-gray-900">${titleText}</h3>
            ${shouldShowCompany && titleText !== safeCompany ? `<p class="mt-1 truncate text-sm text-gray-500">${safeCompany}</p>` : ''}
            ${extraDetails ? `<div class="mt-2 flex flex-wrap gap-3">${extraDetails}</div>` : ''}
          </div>
          <div class="flex flex-wrap items-center gap-3">
            ${shouldShowWebsite ? `<a class="inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-gray-100 px-3 text-xs text-gray-500 hover:bg-gray-50" href="${safeLink}" target="_blank" rel="noopener" aria-label="Open job link">
              ${this.getFaviconHtml(linkFavicon)}
              <span class="truncate">${safeHostname || 'Open link'}</span>
            </a>` : ''}
            ${otherBadges}
            ${statusBadge}
            <button type="button" class="btn-list-move-up inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Move job up">
              <i class="fa-solid fa-arrow-up text-xs"></i>
            </button>
            <button type="button" class="btn-list-move-down inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Move job down">
              <i class="fa-solid fa-arrow-down text-xs"></i>
            </button>

            <button type="button" class="btn-list-edit inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="Edit job">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" class="btn-list-delete inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-red-500 hover:bg-red-50" aria-label="Delete job">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `;

      const orderedRows = this.getSortedListRows(tracker);
      const currentDisplayIndex = orderedRows.findIndex((item) => item.rowIndex === rowIndex);
      const moveUpButton = article.querySelector('.btn-list-move-up');
      const moveDownButton = article.querySelector('.btn-list-move-down');

      if (moveUpButton) {
        moveUpButton.disabled = currentDisplayIndex <= 0;
        moveUpButton.addEventListener('click', () => {
          this.moveListRow(rowIndex, -1);
        });
      }

      if (moveDownButton) {
        moveDownButton.disabled = currentDisplayIndex === -1 || currentDisplayIndex >= orderedRows.length - 1;
        moveDownButton.addEventListener('click', () => {
          this.moveListRow(rowIndex, 1);
        });
      }

      article.querySelector('.btn-list-edit')?.addEventListener('click', () => {
        this.openListEditModal(rowIndex);
      });

      article.querySelector('.btn-list-delete')?.addEventListener('click', () => {
        this.deleteRowAt(rowIndex);
      });

      this.listCards.appendChild(article);
    });
  },

updateBoardView() {
    const isListView = this.viewSelect?.value === 'list';

    this.tableView?.classList.toggle('hidden', isListView);
    this.listView?.classList.toggle('hidden', !isListView);
    this.updateBoardViewToggle();
  },

updateBoardViewToggle() {
    const currentView = this.viewSelect?.value || 'table';

    document.querySelectorAll('[data-board-view-button]').forEach((button) => {
      const isActive = button.dataset.boardViewButton === currentView;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  },

saveBoardViewPreference() {
    if (!this.viewSelect) return;

    localStorage.setItem(BOARD_VIEW_KEY, this.viewSelect.value);
  },

restoreBoardViewPreference() {
    if (!this.viewSelect) return;

    const savedView = localStorage.getItem(BOARD_VIEW_KEY);
    if (savedView === 'list' || savedView === 'table') {
      this.viewSelect.value = savedView;
    }

    this.updateBoardViewToggle();
  },

showTableRow(rowIndex) {
    if (this.viewSelect) {
      this.viewSelect.value = 'table';
      this.saveBoardViewPreference();
    }

    this.currentPage = Math.floor(rowIndex / BOARD_PAGE_SIZE) + 1;
    this.updateBoardView();
    this.applySearchFilter();

    const rowElement = document.querySelector(`#tableBody tr[data-row-index="${rowIndex}"]`);
    rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

deleteRowAt(rowIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;
    if (rowIndex < 0 || rowIndex >= tracker.rows.length) return;

    tracker.rows.splice(rowIndex, 1);
    this.refresh();
    closeMenu();
  },

updateListFilterChipStyles() {
    document.querySelectorAll('.list-filter-chip').forEach((chip) => {
      const columnIndex = chip.dataset.columnIndex;
      const value = chip.dataset.filterValue || '';
      const isActive = value === ''
        ? !this.activeListFilters[columnIndex]
        : this.activeListFilters[columnIndex] === value;

      chip.classList.toggle('is-active', isActive);
    });
  }
};
