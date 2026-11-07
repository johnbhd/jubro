export const STATUS_COLORS = Object.freeze({
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  slate: '#64748b',
});

export function isStatusColorKey(color) {
  return typeof color === 'string' && Object.hasOwn(STATUS_COLORS, color);
}

export function getDefaultStatusColorKey(label) {
  const name = String(label ?? '').trim().toLowerCase();
  const common = {
    applied: 'blue',
    screening: 'cyan',
    interview: 'green',
    offer: 'purple',
    rejected: 'red',
  };

  if (Object.hasOwn(common, name)) return common[name];

  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }

  const keys = Object.keys(STATUS_COLORS);
  return keys[hash % keys.length];
}

export function getSelectOptionColor(option, { status = false } = {}) {
  const color = option && typeof option === 'object' ? option.color : undefined;

  if (isStatusColorKey(color)) return STATUS_COLORS[color];
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) return color;

  const label = typeof option === 'string' ? option : option?.label;
  return status ? STATUS_COLORS[getDefaultStatusColorKey(label)] : '#6b7280';
}
