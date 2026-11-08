import { getSelectOptionColor } from '../services/statusColors.js';

export function getSafeHttpUrl(value) {
  const source = String(value ?? '').trim();

  if (!source) return null;

  try {
    let normalized = source;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(source)) {
      const hostPart = source.split('/')[0].split('?')[0].split('#')[0];
      if (hostPart.includes('.') && !/\s/.test(hostPart)) {
        normalized = `https://${source}`;
      }
    }

    const url = new URL(normalized);

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

    const status = String(column.name || '').trim().toLowerCase() === 'status';

    return column.options.map((option) => ({
      label: typeof option === 'string' ? option : option?.label || 'Option',
      color: getSelectOptionColor(option, { status }),
    }));
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
