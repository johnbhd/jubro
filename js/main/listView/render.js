import { clearActiveTarget, setActiveTarget, showMenu } from '../ui.js';
import { getLinkFavicon } from '../favicon.js';
import { createApplicationDragHandle, createListDrag } from '../kanbanDrag.js';

export const listRenderMethods = {
  createIcon(iconName) {
    const icon = document.createElement('i');
    icon.className = `fa-solid ${iconName} mr-1 text-[10px] text-gray-400`;
    return icon;
  },

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
    const safeUrl = this.getSafeHttpUrl(value);

    if (safeUrl) {
      const link = document.createElement('a');
      link.href = safeUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'break-words text-blue-600 hover:text-blue-700';
      link.textContent = value;
      return link;
    }

    const text = document.createElement('span');
    text.className = 'break-words text-gray-900';
    text.textContent = value;
    return text;
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

    fields.replaceChildren();

    details.forEach(({ label, value }) => {
      const field = document.createElement('div');
      field.className = 'list-info-field rounded-lg border border-gray-200 bg-gray-50 p-3';

      const labelElement = document.createElement('p');
      labelElement.className = 'text-xs font-medium uppercase text-gray-500';
      labelElement.textContent = label;

      const valueElement = document.createElement('div');
      valueElement.className = 'mt-2 text-sm leading-6';
      valueElement.appendChild(this.renderListInfoValue(value));

      field.append(labelElement, valueElement);
      fields.appendChild(field);
    });

    document.getElementById('listInfoModal')?.classList.remove('hidden');
  },

  closeListInfoModal() {
    document.getElementById('listInfoModal')?.classList.add('hidden');
  },

  renderListView(tracker) {
    if (!this.listCards) return;

    this.listDrag?.destroy();
    this.listDrag = null;
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
    this.listDrag = createListDrag(this, tracker);
    const hintText = this.listSortSelect?.value === 'manual'
      ? ''
      : 'Choose Manual to reorder.';
    if (hintText) {
      const hint = document.createElement('p');
      hint.className = 'application-order-hint';
      hint.textContent = hintText;
      this.listCards.appendChild(hint);
    }

    this.getSortedListRows(tracker).forEach(({ row, rowIndex }) => {
      const article = document.createElement('article');
      article.className = 'list-view-row rounded-md border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow';
      article.dataset.rowIndex = String(rowIndex);
      this.listDrag?.attachCard(article, rowIndex);
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
      const { otherBadges, statusBadge } = this.renderListBadgesForCard(tracker, row, indexes.status);
      const shouldShowPosition = this.isListColumnVisible(tracker, indexes.position) && this.isUsefulListValue(position);
      const shouldShowCompany = this.isListColumnVisible(tracker, indexes.company) && this.isUsefulListValue(company);
      const titleText = shouldShowPosition
        ? position
        : shouldShowCompany
          ? company
          : 'Job Application';
      const shouldShowDate = this.isListColumnVisible(tracker, indexes.date) && this.isUsefulListValue(dateApplied);
      const additionalDetails = this.getListAdditionalDetails(tracker, row, indexes);

      article.innerHTML = `
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="min-w-0 flex-1">
            <p class="list-card-date text-xs font-medium text-gray-400"></p>
            <h3 class="list-card-title mt-1 truncate text-lg font-semibold text-gray-900"></h3>
            <div class="flex gap-5 mt-2 items-center">
              <p class="list-card-company truncate text-sm text-gray-500"></p>
              <div class="list-card-extra flex flex-wrap items-center gap-3"></div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 xl:justify-end">
            <a class="list-card-link inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-lg border border-gray-100 px-3 text-xs text-gray-500 hover:bg-gray-50" target="_blank" rel="noopener noreferrer" aria-label="Open job link"></a>
            <span class="list-card-invalid-link max-w-[14rem] truncate text-xs text-gray-500"></span>
            <div class="list-card-badges flex flex-wrap items-center gap-3"></div>
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
            <button type="button" class="btn-list-info inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-50" aria-label="View extra info">
              <i class="fa-solid fa-circle-info text-xs"></i>
            </button>
            <button type="button" class="btn-list-delete inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-red-500 hover:bg-red-50" aria-label="Delete job">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `;

      const dateElement = article.querySelector('.list-card-date');
      const titleElement = article.querySelector('.list-card-title');
      const companyElement = article.querySelector('.list-card-company');
      const extraElement = article.querySelector('.list-card-extra');
      const linkElement = article.querySelector('.list-card-link');
      const invalidLinkElement = article.querySelector('.list-card-invalid-link');
      const badgesElement = article.querySelector('.list-card-badges');
      const infoButton = article.querySelector('.btn-list-info');
      const safeLink = this.getSafeHttpUrl(link);

      if (this.listDrag) {
        article.querySelector('.btn-list-move-up').before(createApplicationDragHandle(document, titleText));
      }

      dateElement.hidden = !shouldShowDate;
      dateElement.textContent = dateApplied;
      titleElement.textContent = titleText;
      companyElement.hidden = !(shouldShowCompany && titleText !== company);
      companyElement.textContent = company;
      infoButton.hidden = additionalDetails.length === 0;

      if (this.isListColumnVisible(tracker, indexes.email) && this.isUsefulListValue(email)) {
        const emailElement = document.createElement('span');
        emailElement.className = 'text-xs text-gray-500';
        emailElement.append(this.createIcon('fa-envelope'), document.createTextNode(email));
        extraElement.appendChild(emailElement);
      }

      if (this.isListColumnVisible(tracker, indexes.location) && this.isUsefulListValue(location)) {
        const locationElement = document.createElement('span');
        locationElement.className = 'text-xs text-gray-500';
        locationElement.append(this.createIcon('fa-location-dot'), document.createTextNode(location));
        extraElement.appendChild(locationElement);
      }

      const shouldShowWebsite = this.isListColumnVisible(tracker, indexes.link)
        && this.isUsefulListValue(link)
        && Boolean(safeLink);

      if (shouldShowWebsite) {
        linkElement.href = safeLink;
        const linkFavicon = getLinkFavicon(safeLink);
        linkElement.appendChild(this.createFaviconElement(linkFavicon));
        const hostname = document.createElement('span');
        hostname.className = 'truncate';
        hostname.textContent = linkFavicon.hostname || 'Open link';
        linkElement.appendChild(hostname);
      } else {
        linkElement.remove();
        invalidLinkElement.hidden = !(
          this.isListColumnVisible(tracker, indexes.link)
          && this.isUsefulListValue(link)
          && !safeLink
        );
        invalidLinkElement.textContent = link;
      }

      otherBadges.forEach((badge) => badgesElement.appendChild(badge));
      if (statusBadge) badgesElement.appendChild(statusBadge);

      const orderedRows = this.getSortedListRows(tracker);
      const currentDisplayIndex = orderedRows.findIndex((item) => item.rowIndex === rowIndex);
      const moveUpButton = article.querySelector('.btn-list-move-up');
      const moveDownButton = article.querySelector('.btn-list-move-down');

      if (moveUpButton) {
        moveUpButton.dataset.applicationMoveDirection = '-1';
        moveUpButton.disabled = currentDisplayIndex <= 0;
        moveUpButton.addEventListener('click', () => {
          this.moveListRow(rowIndex, -1);
        });
      }

      if (moveDownButton) {
        moveDownButton.dataset.applicationMoveDirection = '1';
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
