import { clearActiveTarget, setActiveTarget, showMenu } from '../ui.js';
import { getLinkFavicon } from '../favicon.js';

export const listRenderMethods = {
  getListAdditionalDetails(tracker, row, indexes) {
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
        if (reservedIndexes.has(index) || !this.isListColumnVisible(tracker, index)) return null;

        const value = this.getCellDisplay(row[index]);
        if (!this.isUsefulListValue(value)) return null;

        const label = this.getColumnName(column) || `Column ${index + 1}`;

        return { label, value };
      })
      .filter(Boolean)
  },

  renderListAdditionalDetails(tracker, row, indexes) {
    return this.getListAdditionalDetails(tracker, row, indexes)
      .map(({ label, value }) => `
        <span class="text-xs text-gray-500">
          <span class="font-medium text-gray-400">${this.escapeHtml(label)}:</span>
          ${this.escapeHtml(value)}
        </span>
      `)
      .join('');
  },

  ensureListInfoModal() {
    if (document.getElementById('listInfoModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="listInfoModal" class="hidden fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-4">
        <div class="list-info-dialog mx-auto my-6 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">Extra Info</h2>
            <button id="btnCloseListInfoModal" type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Close info modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div id="listInfoFields" class="max-h-[60vh] space-y-4 overflow-y-auto pr-1"></div>
        </div>
      </div>
    `);

    document.getElementById('btnCloseListInfoModal')?.addEventListener('click', () => this.closeListInfoModal());
    document.getElementById('listInfoModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'listInfoModal') this.closeListInfoModal();
    });
  },

  renderListInfoValue(value) {
    if (this.isHttpLink(value)) {
      const safeValue = this.escapeHtml(value);

      return `
        <a href="${safeValue}" target="_blank" rel="noopener" class="break-words text-blue-600 hover:text-blue-700">
          ${safeValue}
        </a>
      `;
    }

    return `<span class="break-words text-gray-900">${this.escapeHtml(value)}</span>`;
  },

  openListInfoModal(rowIndex) {
    const tracker = this.getTracker();
    const row = tracker?.rows?.[rowIndex];

    if (!tracker || !row) return;

    this.ensureListInfoModal();

    const fields = document.getElementById('listInfoFields');
    const indexes = this.getListColumnIndexes(tracker);
    const details = this.getListAdditionalDetails(tracker, row, indexes);

    if (!fields || details.length === 0) return;

    fields.innerHTML = details.map(({ label, value }) => `
      <div class="list-info-field rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-medium uppercase text-gray-500">${this.escapeHtml(label)}</p>
        <div class="mt-2 text-sm leading-6">${this.renderListInfoValue(value)}</div>
      </div>
    `).join('');

    document.getElementById('listInfoModal')?.classList.remove('hidden');
  },

  closeListInfoModal() {
    document.getElementById('listInfoModal')?.classList.add('hidden');
  },

  renderListView(tracker) {
    if (!this.listCards) return;

    this.ensureListViewSettingsButton();
    this.ensureListSettingsPopup();
    this.ensureListEditModal();
    this.ensureListInfoModal();
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
      const additionalDetails = this.getListAdditionalDetails(tracker, row, indexes);
      const extraDetails = [
        this.isListColumnVisible(tracker, indexes.email) && this.isUsefulListValue(email)
          ? `<span class="text-xs text-gray-500"><i class="fa-solid fa-envelope mr-1 text-[10px] text-gray-400"></i>${this.escapeHtml(email)}</span>`
          : '',
        this.isListColumnVisible(tracker, indexes.location) && this.isUsefulListValue(location)
          ? `<span class="text-xs text-gray-500"><i class="fa-solid fa-location-dot mr-1 text-[10px] text-gray-400"></i>${this.escapeHtml(location)}</span>`
          : ''
      ].filter(Boolean).join('');

      article.innerHTML = `
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="min-w-0 flex-1">
            ${shouldShowDate ? `<p class="text-xs font-medium text-gray-400">${safeDateApplied}</p>` : ''}
            <h3 class="mt-1 truncate text-lg font-semibold text-gray-900">${titleText}</h3>
            <div class="flex gap-5 mt-2 items-center">
              ${shouldShowCompany && titleText !== safeCompany ? `<p class="truncate text-sm text-gray-500">${safeCompany}</p>` : ''}
              ${extraDetails ? `<div class="flex flex-wrap items-center gap-3">${extraDetails}</div>` : ''}  
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 xl:justify-end">
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
            <button type="button" class="btn-list-duplicate inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="Duplicate job">
              <i class="fa-solid fa-copy text-xs"></i>
            </button>
            ${additionalDetails.length ? `<button type="button" class="btn-list-info inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="View extra info">
              <i class="fa-solid fa-circle-info text-xs"></i>
            </button>` : ''}
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

      article.querySelector('.btn-list-duplicate')?.addEventListener('click', () => {
        const sourceRow = tracker.rows[rowIndex];

        if (!sourceRow) return;

        tracker.rows.splice(rowIndex + 1, 0, sourceRow.map((cell) => ({ ...cell })));
        this.refresh();
      });

      article.querySelector('.btn-list-info')?.addEventListener('click', () => {
        this.openListInfoModal(rowIndex);
      });

      article.querySelector('.btn-list-delete')?.addEventListener('click', () => {
        this.deleteRowAt(rowIndex);
      });

      this.listCards.appendChild(article);
    });
  }
};
