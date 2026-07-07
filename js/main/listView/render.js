import { clearActiveTarget, setActiveTarget, showMenu } from '../ui.js';
import { getLinkFavicon } from '../favicon.js';

export const listRenderMethods = {
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
  }
};
