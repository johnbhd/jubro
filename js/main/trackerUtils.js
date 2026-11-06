export function getSafeHttpUrl(value) {
  const source = String(value ?? '').trim();

  if (!source) return null;

  try {
    const url = new URL(source);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export const trackerUtilityMethods = {
getColumnName(column) {
    return typeof column === 'object' ? column.name : column;
  },

getCellValue(cell) {
    return typeof cell === 'object' ? cell.value : cell;
  },

getCellDisplay(cell) {
    const value = this.getCellValue(cell);

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value || '').trim() || '-';
  },

normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  },

getColumnIndexByNames(tracker, names, fallbackIndex = -1) {
    if (!tracker || !Array.isArray(tracker.columns)) return fallbackIndex;

    const wantedNames = names.map((name) => this.normalizeText(name));
    const index = tracker.columns.findIndex((column) => (
      wantedNames.includes(this.normalizeText(this.getColumnName(column)))
    ));

    return index >= 0 ? index : fallbackIndex;
  },

  getTrackerColumnIndexes(tracker) {
    return {
      company: this.getColumnIndexByNames(tracker, ['company'], 0),
      position: this.getColumnIndexByNames(tracker, ['position', 'role', 'job title'], 1),
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['website', 'link', 'url', 'job link'], 5),
      email: this.getColumnIndexByNames(tracker, ['email'], -1),
      location: this.getColumnIndexByNames(tracker, ['location'], -1),
    };
  },

  cloneValue(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  },

isHttpLink(value) {
    return Boolean(getSafeHttpUrl(value));
  },

  getSafeHttpUrl(value) {
    return getSafeHttpUrl(value);
  },

escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  },

getDashboardOptions(column) {
    if (!column || !Array.isArray(column.options)) return [];

    return column.options.map((option) => {
      if (typeof option === 'string') {
        return {
          label: option,
          color: '#6b7280'
        };
      }

      return {
        label: option.label || 'Option',
        color: /^#[0-9a-f]{6}$/i.test(option.color || '')
          ? option.color
          : '#6b7280'
      };
    });
  },

getContrastColor(hex) {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return '#111827';

    const color = hex.replace('#', '');
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);
    const yiq = (red * 299 + green * 587 + blue * 114) / 1000;

    return yiq >= 128 ? '#111827' : '#ffffff';
  },

getOptionColor(column, value, fallback = '#6b7280') {
    const options = this.getDashboardOptions(column);
    const option = options.find((item) => this.normalizeText(item.label) === this.normalizeText(value));
    const color = option?.color || fallback;

    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }
};
