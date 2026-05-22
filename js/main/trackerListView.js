import { closeMenu } from './ui.js';
import { getLinkFavicon, getPlatformFavicon } from './favicon.js';
import { BOARD_PAGE_SIZE, BOARD_VIEW_KEY } from './constants.js';

export const trackerListViewMethods = {
getListColumnIndexes(tracker) {
    return {
      company: this.getColumnIndexByNames(tracker, ['company'], 0),
      position: this.getColumnIndexByNames(tracker, ['position', 'role', 'job title'], 1),
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['link', 'url', 'job link'], 5)
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

renderListSelectBadges(tracker, row) {
    return this.getListSelectColumns().map(({ column, index }) => {
      const value = this.getCellDisplay(row[index]);
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
    }).join('');
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
    const dateIndex = this.getDateColumnIndex(tracker);
    const direction = this.listSortSelect?.value === 'date-asc' ? 1 : -1;

    return rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .sort((a, b) => {
        if (dateIndex < 0) return a.rowIndex - b.rowIndex;

        return (this.getDateSortValue(a.row, dateIndex) - this.getDateSortValue(b.row, dateIndex)) * direction;
      });
  },

renderListView(tracker) {
    if (!this.listCards) return;

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

      const dateApplied = this.getCellDisplay(row[indexes.date]);
      const position = this.getCellDisplay(row[indexes.position]);
      const company = this.getCellDisplay(row[indexes.company]);
      const link = this.getFirstRowLink(row);
      const safeDateApplied = this.escapeHtml(dateApplied);
      const safePosition = this.escapeHtml(position);
      const safeCompany = this.escapeHtml(company);
      const safeLink = this.escapeHtml(link || '#');
      const linkFavicon = getLinkFavicon(link);
      const safeHostname = this.escapeHtml(linkFavicon.hostname);
      const selectBadges = this.renderListSelectBadges(tracker, row);

      article.innerHTML = `
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-gray-400">${safeDateApplied}</p>
            <h3 class="mt-1 truncate text-lg font-semibold text-gray-900">${safePosition}</h3>
            <p class="mt-1 truncate text-sm text-gray-500">${safeCompany}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <a class="inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-gray-100 px-3 text-xs text-gray-500 hover:bg-gray-50" href="${safeLink}" target="_blank" rel="noopener" aria-label="Open job link">
              ${this.getFaviconHtml(linkFavicon)}
              <span class="truncate">${safeHostname || 'Open link'}</span>
            </a>
            ${selectBadges}
            <button type="button" class="btn-list-edit inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="Edit job">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button type="button" class="btn-list-delete inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-red-500 hover:bg-red-50" aria-label="Delete job">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `;

      const linkElement = article.querySelector('a');
      if (!link || !/^https?:\/\//.test(String(link))) {
        linkElement?.classList.add('pointer-events-none', 'opacity-40');
        linkElement?.removeAttribute('href');
      }

      article.querySelector('.btn-list-edit')?.addEventListener('click', () => {
        this.showTableRow(rowIndex);
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
