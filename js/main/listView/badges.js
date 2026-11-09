import { getPlatformFavicon } from '../favicon.js';

export const listBadgeMethods = {
  createFaviconElement(favicon) {
    const holder = document.createElement('span');
    holder.className = 'favicon-holder';

    const fallback = () => {
      holder.replaceChildren();
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-globe text-[11px] text-gray-300';
      holder.appendChild(icon);
    };

    if (!favicon?.url || !this.getSafeHttpUrl(favicon.url)) {
      fallback();
      return holder;
    }

    const image = document.createElement('img');
    image.src = favicon.url;
    image.alt = '';
    image.className = 'h-4 w-4 rounded-full object-contain';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', fallback);
    holder.appendChild(image);

    return holder;
  },

  createListBadgeElement(column, value) {
    if (!this.isUsefulListValue(value)) return null;

    const color = this.getOptionColor(column, value, '#6b7280');
    const textColor = this.getContrastColor(color);
    const columnName = this.normalizeText(this.getColumnName(column));
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold';
    badge.style.backgroundColor = color;
    badge.style.color = textColor;

    if (columnName === 'status') {
      badge.className += ' list-status-badge';
      badge.style.setProperty('--badge-accent', color);
    }

    if (['platform', 'source'].includes(columnName)) {
      const favicon = getPlatformFavicon(value);
      const icon = this.createFaviconElement(favicon);

      if (favicon.hostname === 'onlinejobs.ph') {
        icon.className += ' favicon-holder-onlinejobs';
      }

      badge.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = value;
    badge.appendChild(label);

    return badge;
  },

  renderListSelectBadges(tracker, row) {
    return this.getListSelectColumns()
      .map(({ column, index }) => this.createListBadgeElement(column, this.getCellDisplay(row[index])))
      .filter(Boolean);
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
      .map(({ column, index }) => this.createListBadgeElement(column, this.getCellDisplay(row[index])))
      .filter(Boolean);
    const statusBadge = statusColumn && this.isListColumnVisible(tracker, statusColumn.index)
      ? this.createListBadgeElement(statusColumn.column, this.getCellDisplay(row[statusColumn.index]))
      : null;

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
