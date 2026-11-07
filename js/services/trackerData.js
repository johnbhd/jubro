import { isStatusColorKey } from './statusColors.js';

export const FIELD_TYPES = Object.freeze([
  'text',
  'date',
  'select',
  'checkbox',
]);

const FIELD_TYPE_SET = new Set(FIELD_TYPES);
const DEFAULT_OPTION_COLOR = '#6b7280';
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class TrackerDataValidationError extends Error {
  constructor(message, userMessage = message) {
    super(message);
    this.name = 'TrackerDataValidationError';
    this.userMessage = userMessage;
  }
}

function fail(message, userMessage) {
  throw new TrackerDataValidationError(message, userMessage);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function emptyValueForType(type) {
  return type === 'checkbox' ? false : '';
}

function normalizeOption(option, { strict }) {
  if (typeof option === 'string') {
    if (!option.trim()) {
      fail('Select option labels must not be empty.', 'A select option is missing its label.');
    }

    return {
      label: option,
    };
  }

  if (!isPlainObject(option) || typeof option.label !== 'string' || !option.label.trim()) {
    fail('Select options must contain a non-empty label.', 'A select option is invalid.');
  }

  if (option.color === undefined) return { label: option.label };

  const color = option.color;

  if (!isStatusColorKey(color) && !(typeof color === 'string' && HEX_COLOR_PATTERN.test(color))) {
    if (strict) {
      fail('Select option colors must be a supported color key or a legacy six-digit hexadecimal color.', 'A select option color is invalid.');
    }

    return {
      label: option.label,
      color: DEFAULT_OPTION_COLOR,
    };
  }

  return {
    label: option.label,
    color,
  };
}

export function normalizeCellValue(type, value, { strict = false } = {}) {
  if (!FIELD_TYPE_SET.has(type)) {
    fail(`Unsupported cell type: ${String(type)}.`);
  }

  if (type === 'checkbox') {
    if (value === null || value === undefined) return false;

    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }

    if (!strict) return value;

    fail('Checkbox values must be Boolean values.', 'A checkbox value is invalid.');
  }

  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    if (type === 'date' && value && !isValidDate(value)) {
      if (strict) {
        fail('Date values must use YYYY-MM-DD.', 'A date value is invalid.');
      }

      return value;
    }

    return value;
  }

  if (!strict) return value;

  fail(`${type} values must be strings.`, `A ${type} value is invalid.`);
}

function normalizeColumn(column, { strict = false } = {}) {
  if (typeof column !== 'object' || column === null) {
    if (typeof column === 'string' || typeof column === 'number' || typeof column === 'boolean') {
      return {
        name: String(column || 'New'),
        type: 'text',
      };
    }

    fail('Each column must be an object or a legacy primitive column name.', 'A tracker column is invalid.');
  }

  if (Array.isArray(column)) {
    fail('Each column must be an object.', 'A tracker column is invalid.');
  }

  if (typeof column.name !== 'string') {
    fail('Each column must have a text name.', 'A tracker column name is invalid.');
  }

  const type = column.type === undefined ? 'text' : column.type;

  if (!FIELD_TYPE_SET.has(type)) {
    fail(`Unsupported column type: ${String(type)}.`, 'This backup contains an unsupported column type.');
  }

  const normalized = {
    name: column.name,
    type,
  };

  if (type === 'select') {
    if (column.options !== undefined && !Array.isArray(column.options)) {
      fail('Select column options must be an array.', 'A select column has invalid options.');
    }

    normalized.options = (column.options || []).map((option) => normalizeOption(option, { strict }));
  } else if (column.options !== undefined && strict) {
    fail('Only select columns may contain options.', 'A non-select column contains invalid options.');
  }

  return normalized;
}

function normalizeCell(cell, columnType, { strict = false } = {}) {
  let value = cell;
  let declaredType;

  if (isPlainObject(cell)) {
    if (!Object.prototype.hasOwnProperty.call(cell, 'value')) {
      fail('Each cell object must contain a value.', 'A tracker cell is invalid.');
    }

    value = cell.value;
    declaredType = cell.type;
  }

  if (declaredType !== undefined && !FIELD_TYPE_SET.has(declaredType)) {
    fail(`Unsupported cell type: ${String(declaredType)}.`, 'This backup contains an unsupported cell type.');
  }

  return {
    value: normalizeCellValue(columnType, value, { strict }),
    type: columnType,
  };
}

export function normalizeImportedTracker(tracker, { fallbackId = null } = {}) {
  if (!isPlainObject(tracker)) {
    fail('Each tracker must be an object.', 'A tracker in this file is invalid.');
  }

  const sourceId = tracker.id === undefined || tracker.id === null
    ? fallbackId
    : tracker.id;

  if (typeof sourceId !== 'string' && typeof sourceId !== 'number') {
    fail('Tracker IDs must be text or numbers.', 'A tracker ID is invalid.');
  }

  const id = String(sourceId);

  if (!id) {
    fail('Tracker IDs must not be empty.', 'A tracker ID is missing.');
  }

  if (typeof tracker.title !== 'string') {
    fail('Tracker titles must be text.', 'A tracker title is invalid.');
  }

  if (!Array.isArray(tracker.columns)) {
    fail('Tracker columns must be an array.', 'Tracker columns are invalid.');
  }

  if (!Array.isArray(tracker.rows)) {
    fail('Tracker rows must be an array.', 'Tracker rows are invalid.');
  }

  const columns = tracker.columns.map((column) => normalizeColumn(column, { strict: true }));
  const rows = tracker.rows.map((row) => {
    if (!Array.isArray(row)) {
      fail('Each tracker row must be an array.', 'A tracker row is invalid.');
    }

    if (row.length > columns.length) {
      fail('A tracker row contains more cells than columns.', 'This file contains extra row data.');
    }

    return columns.map((column, index) => (
      index < row.length
        ? normalizeCell(row[index], column.type, { strict: true })
        : { value: emptyValueForType(column.type), type: column.type }
    ));
  });

  return {
    id,
    title: tracker.title,
    columns,
    rows,
  };
}

export function normalizeSingleTrackerImport(input) {
  if (!isPlainObject(input)) {
    fail('Single tracker import must be an object.', 'This file is not a valid Jubro tracker file.');
  }

  if (!Array.isArray(input.columns) || !Array.isArray(input.rows)) {
    fail('Single tracker imports require columns and rows arrays.', 'This file is not a valid Jubro tracker file.');
  }

  const tracker = normalizeImportedTracker({
    id: 'imported-tracker',
    title: 'Imported Tracker',
    columns: input.columns,
    rows: input.rows,
  });

  return {
    columns: tracker.columns,
    rows: tracker.rows,
  };
}

export function normalizeFullBackupImport(input) {
  if (!isPlainObject(input) || input.app !== 'Jubro' || input.version !== 1) {
    fail('Unsupported Jubro backup marker or version.', 'This Jubro backup version is not supported.');
  }

  if (!Array.isArray(input.trackers)) {
    fail('Full backup trackers must be an array.', 'This file is not a valid Jubro backup.');
  }

  const data = Object.create(null);
  const sourceIds = new Map();

  input.trackers.forEach((sourceTracker, index) => {
    const tracker = normalizeImportedTracker(sourceTracker, {
      fallbackId: `imported_${index + 1}`,
    });
    const count = sourceIds.get(tracker.id) || 0;
    const trackerId = count === 0 ? tracker.id : `${tracker.id}_${count + 1}`;

    sourceIds.set(tracker.id, count + 1);
    data[trackerId] = {
      ...tracker,
      id: trackerId,
    };
  });

  if (input.active !== null && input.active !== undefined
    && typeof input.active !== 'string' && typeof input.active !== 'number') {
    fail('The active tracker reference must be text or null.', 'The active tracker reference is invalid.');
  }

  const requestedActive = input.active === null || input.active === undefined
    ? null
    : String(input.active);

  return {
    active: requestedActive && data[requestedActive]
      ? requestedActive
      : Object.keys(data)[0] || null,
    data,
  };
}

export function normalizeLegacyWorkspaceState(state) {
  if (!isPlainObject(state) || !isPlainObject(state.data)) return state;

  const data = { ...state.data };

  Object.entries(data).forEach(([trackerId, tracker]) => {
    if (!isPlainObject(tracker) || !Array.isArray(tracker.columns) || !Array.isArray(tracker.rows)) return;

    const columns = tracker.columns;

    const rows = tracker.rows.map((row) => {
      if (!Array.isArray(row)) return row;

      return row.map((cell, index) => {
        const column = columns[index];
        const type = isPlainObject(column) ? column.type : 'text';

        if (type !== 'checkbox') return cell;

        if (!isPlainObject(cell)) {
          if (cell === 'true' || cell === 'false' || typeof cell === 'boolean' || cell === null) {
            return {
              value: normalizeCellValue('checkbox', cell),
              type: 'checkbox',
            };
          }

          return cell;
        }

        if (cell.value === 'true' || cell.value === 'false') {
          return {
            ...cell,
            value: cell.value === 'true',
            type: 'checkbox',
          };
        }

        return cell;
      });
    });

    data[trackerId] = {
      ...tracker,
      rows,
    };
  });

  return {
    ...state,
    data,
  };
}
