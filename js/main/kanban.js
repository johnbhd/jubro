import { normalizeCellValue } from '../services/trackerData.js';

const DEFAULT_COLUMN_COLOR = '#6b7280';

function getColumnName(column) {
  return typeof column === 'object' ? column.name : column;
}

function getCellValue(cell) {
  return typeof cell === 'object' ? cell.value : cell;
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getOptionColor(option) {
  const color = typeof option === 'object' ? option.color : '';

  return /^#[0-9a-f]{6}$/i.test(color || '')
    ? color
    : DEFAULT_COLUMN_COLOR;
}

function getOptionLabel(option) {
  const label = typeof option === 'object' ? option.label : option;

  return String(label ?? '').trim();
}

function getRowStatus(row, statusIndex) {
  return String(getCellValue(row?.[statusIndex]) ?? '').trim();
}

function createConfiguredColumns(column) {
  if (!Array.isArray(column?.options)) return [];

  const seen = new Set();

  return column.options.reduce((columns, option) => {
    const label = getOptionLabel(option);
    const normalized = normalizeStatus(label);

    if (!label || seen.has(normalized)) return columns;

    seen.add(normalized);
    columns.push({
      value: label,
      label,
      color: getOptionColor(option),
    });

    return columns;
  }, []);
}

export function getKanbanStatusColumn(tracker) {
  if (!Array.isArray(tracker?.columns)) return null;

  const index = tracker.columns.findIndex((column) => (
    typeof column === 'object'
      && column?.type === 'select'
      && normalizeStatus(getColumnName(column)) === 'status'
  ));

  if (index === -1) return null;

  return {
    index,
    column: tracker.columns[index],
  };
}

export function getKanbanColumns(tracker) {
  const statusColumn = getKanbanStatusColumn(tracker);

  if (!statusColumn) {
    return [{
      value: null,
      label: 'Applications',
      color: DEFAULT_COLUMN_COLOR,
    }];
  }

  const columns = createConfiguredColumns(statusColumn.column);
  const knownStatuses = new Set(columns.map((column) => normalizeStatus(column.value)));
  let hasBlankStatus = false;

  (tracker.rows || []).forEach((row) => {
    const status = getRowStatus(row, statusColumn.index);
    const normalized = normalizeStatus(status);

    if (!normalized) {
      hasBlankStatus = true;
      return;
    }

    if (knownStatuses.has(normalized)) return;

    knownStatuses.add(normalized);
    columns.push({
      value: status,
      label: status,
      color: DEFAULT_COLUMN_COLOR,
    });
  });

  if (hasBlankStatus) {
    columns.push({
      value: '',
      label: 'No status',
      color: DEFAULT_COLUMN_COLOR,
    });
  }

  return columns;
}

export function groupKanbanRows(tracker) {
  const statusColumn = getKanbanStatusColumn(tracker);
  const columns = getKanbanColumns(tracker);
  const groups = columns.map((column) => ({
    ...column,
    rowIndexes: [],
  }));

  (tracker?.rows || []).forEach((row, rowIndex) => {
    const status = statusColumn
      ? getRowStatus(row, statusColumn.index)
      : null;
    const normalized = normalizeStatus(status);
    const group = groups.find((item) => normalizeStatus(item.value) === normalized);

    group?.rowIndexes.push(rowIndex);
  });

  return {
    columns,
    groups,
  };
}

function appendText(parent, className, value) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = value;
  parent.appendChild(element);
  return element;
}

function getPointerFineSupport() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: fine)').matches;
}

function getStatusOptions(columns) {
  return columns.filter((column) => column.value !== null);
}

export const kanbanMethods = {
  renderKanban(tracker) {
    if (!this.kanbanColumns) return;

    this.kanbanColumns.replaceChildren();

    if (!tracker || !Array.isArray(tracker.rows)) return;

    const statusColumn = getKanbanStatusColumn(tracker);
    const { groups } = groupKanbanRows(tracker);

    if (tracker.rows.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm';

      const heading = document.createElement('h2');
      heading.className = 'text-lg font-semibold text-gray-900';
      heading.textContent = 'Your job pipeline is empty.';

      const description = document.createElement('p');
      description.className = 'mt-2 text-sm text-gray-500';
      description.textContent = 'Add your first application to start tracking your search.';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900';
      addButton.dataset.kanbanAddApplication = 'true';
      addButton.textContent = 'Add Application';

      emptyState.append(heading, description, addButton);
      this.kanbanColumns.appendChild(emptyState);
      return;
    }

    const statusOptions = getStatusOptions(groups);
    const canDrag = getPointerFineSupport();

    groups.forEach((group) => {
      const column = document.createElement('section');
      column.className = 'kanban-column flex min-w-[17rem] max-w-[21rem] flex-1 flex-col rounded-2xl bg-gray-100 p-3';
      column.dataset.kanbanStatus = group.value === null ? '' : group.value;
      column.style.borderTop = `3px solid ${group.color}`;

      const header = document.createElement('div');
      header.className = 'mb-3 flex items-center justify-between gap-3';

      const heading = document.createElement('h2');
      heading.className = 'min-w-0 truncate text-sm font-semibold text-gray-900';
      heading.textContent = group.label;

      const count = document.createElement('span');
      count.className = 'shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500';
      count.textContent = String(group.rowIndexes.length);

      header.append(heading, count);
      column.appendChild(header);

      const cards = document.createElement('div');
      cards.className = 'kanban-card-list';

      if (group.rowIndexes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'rounded-xl border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500';
        empty.textContent = 'No applications here yet.';
        cards.appendChild(empty);
      }

      group.rowIndexes.forEach((rowIndex) => {
        const row = tracker.rows[rowIndex];
        const indexes = typeof this.getListColumnIndexes === 'function'
          ? this.getListColumnIndexes(tracker)
          : {};
        const company = this.getCellDisplay(row?.[indexes.company]);
        const position = this.getCellDisplay(row?.[indexes.position]);
        const date = this.getCellDisplay(row?.[indexes.date]);
        const platform = this.getCellDisplay(row?.[indexes.platform]);
        const card = document.createElement('article');

        card.className = 'kanban-card rounded-xl border border-gray-200 bg-white p-4 shadow-sm';
        card.dataset.rowIndex = String(rowIndex);
        card.draggable = canDrag && group.value !== null;

        if (card.draggable) {
          card.addEventListener('dragstart', (event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(rowIndex));
            card.classList.add('opacity-50');
          });

          card.addEventListener('dragend', () => {
            card.classList.remove('opacity-50');
          });
        }

        appendText(card, 'block truncate text-sm font-semibold text-gray-900', company === '-' ? 'Untitled company' : company);
        appendText(card, 'mt-1 block truncate text-sm text-gray-600', position === '-' ? 'Untitled position' : position);

        const meta = document.createElement('div');
        meta.className = 'kanban-card-meta mt-3 text-xs text-gray-500';

        const metadata = [date, platform].filter((value) => value !== '-');

        metadata.forEach((value, index) => {
          if (index > 0) {
            appendText(meta, 'kanban-card-meta-separator', '·');
          }

          appendText(meta, '', value);
        });

        if (metadata.length > 0) card.appendChild(meta);

        if (statusColumn) {
          const label = document.createElement('label');
          label.className = 'mt-4 block text-xs font-medium text-gray-500';
          label.textContent = 'Status';

          const statusSelect = document.createElement('select');
          statusSelect.className = 'mt-1 h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200';
          statusSelect.setAttribute('aria-label', `Change status for ${company === '-' ? 'application' : company}`);

          statusOptions.forEach((option) => {
            const selectOption = document.createElement('option');
            selectOption.value = option.value;
            selectOption.textContent = option.label;
            statusSelect.appendChild(selectOption);
          });

          const currentStatus = getRowStatus(row, statusColumn.index);
          if (currentStatus && !statusOptions.some((option) => normalizeStatus(option.value) === normalizeStatus(currentStatus))) {
            const currentOption = document.createElement('option');
            currentOption.value = currentStatus;
            currentOption.textContent = currentStatus;
            statusSelect.appendChild(currentOption);
          }

          statusSelect.value = statusOptions.find((option) => (
            normalizeStatus(option.value) === normalizeStatus(currentStatus)
          ))?.value || currentStatus;
          statusSelect.addEventListener('change', () => {
            this.moveKanbanRow(rowIndex, statusSelect.value);
          });

          label.appendChild(statusSelect);
          card.appendChild(label);
        }

        cards.appendChild(card);
      });

      column.appendChild(cards);
      column.addEventListener('dragover', (event) => {
        if (group.value !== null) event.preventDefault();
      });
      column.addEventListener('drop', (event) => {
        event.preventDefault();

        if (group.value === null) return;

        const rowIndex = Number(event.dataTransfer?.getData('text/plain'));
        this.moveKanbanRow(rowIndex, group.value);
      });

      this.kanbanColumns.appendChild(column);
    });
  },

  moveKanbanRow(rowIndex, statusValue) {
    const tracker = this.getTracker();
    const statusColumn = statusColumnForTracker(tracker);
    const row = tracker?.rows?.[rowIndex];

    if (!statusColumn || !Array.isArray(row)) return false;

    const allowedStatuses = getStatusOptions(getKanbanColumns(tracker));
    const nextStatus = normalizeCellValue('select', statusValue);
    const isAllowed = allowedStatuses.some((option) => (
      normalizeStatus(option.value) === normalizeStatus(nextStatus)
    ));

    if (!isAllowed) return false;

    const currentStatus = getRowStatus(row, statusColumn.index);

    if (normalizeStatus(currentStatus) === normalizeStatus(nextStatus)) return true;

    row[statusColumn.index] = {
      value: nextStatus,
      type: 'select',
    };

    if (this.save() === false) {
      this.reloadStateFromStorage();
      return false;
    }

    this.refresh({ persist: false });
    return true;
  },
};

function statusColumnForTracker(tracker) {
  return getKanbanStatusColumn(tracker);
}
