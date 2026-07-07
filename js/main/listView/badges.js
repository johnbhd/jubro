import { getPlatformFavicon } from '../favicon.js';

export const listBadgeMethods = {
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
  }
};
