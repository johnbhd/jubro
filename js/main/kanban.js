import { normalizeCellValue } from '../services/trackerData.js';
import { getSelectOptionColor, STATUS_COLORS } from '../services/statusColors.js';
import { createApplicationDragHandle, createKanbanDrag } from './kanbanDrag.js';
import { createCompanyFaviconElement } from './favicon.js';
import { getSafeHttpUrl } from './trackerUtils.js';

function formatActionDate(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return '';
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return trimmed;
}

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
  return getSelectOptionColor(option, { status: true });
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

function getStatusOptions(columns) {
  return columns.filter((column) => column.value !== null);
}

export function closeKanbanCardMenus(container) {
  if (!container?.querySelectorAll) return;

  container.querySelectorAll('[data-kanban-card-menu]').forEach((menu) => {
    menu.classList.add('hidden');
    menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
  });
}

function createKanbanCardAction(label, iconClass, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `kanban-card-menu-action flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${className}`;
  button.setAttribute('role', 'menuitem');

  const icon = document.createElement('i');
  icon.className = `fa-solid ${iconClass} w-4 text-xs`;

  const text = document.createElement('span');
  text.textContent = label;

  button.append(icon, text);
  button.addEventListener('click', handler);

  return button;
}

function createKanbanCardMenu(app, rowIndex, cardLabel) {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative shrink-0';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'kanban-card-menu-toggle inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400';
  toggle.dataset.kanbanCardMenuToggle = 'true';
  toggle.setAttribute('aria-label', `More options for ${cardLabel}`);
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.title = 'More options';

  const toggleIcon = document.createElement('i');
  toggleIcon.className = 'fa-solid fa-ellipsis-vertical';
  toggle.appendChild(toggleIcon);

  const menu = document.createElement('div');
  menu.className = 'kanban-card-menu hidden absolute right-0 top-9 z-20 min-w-[8rem] rounded-lg border border-gray-200 bg-white p-1 shadow-lg';
  menu.dataset.kanbanCardMenu = 'true';
  menu.setAttribute('role', 'menu');

  const closeMenu = () => {
    closeKanbanCardMenus(app.kanbanColumns);
  };

  const editButton = createKanbanCardAction(
    'Edit',
    'fa-pen',
    'text-gray-700 hover:bg-gray-100',
    (event) => {
      event.stopPropagation();
      closeMenu();
      app.openListEditModal(rowIndex);
    },
  );
  const deleteButton = createKanbanCardAction(
    'Delete',
    'fa-trash',
    'text-red-600 hover:bg-red-50',
    (event) => {
      event.stopPropagation();
      closeMenu();
      app.deleteRowAt(rowIndex);
    },
  );

  menu.append(editButton, deleteButton);
  for (const [label, direction, icon] of [
    ['Move up', -1, 'fa-arrow-up'],
    ['Move down', 1, 'fa-arrow-down'],
  ]) {
    const moveButton = createKanbanCardAction(
      label,
      icon,
      'text-gray-700 hover:bg-gray-100',
      (event) => {
        event.stopPropagation();
        closeMenu();
        const row = app.getTracker().rows[rowIndex];
        if (app.moveApplicationByDirection(rowIndex, direction)) {
          app.showToast('Application order updated.');
          const nextIndex = app.getTracker().rows.indexOf(row);
          app.kanbanColumns.querySelector(`[data-row-index="${nextIndex}"] [data-kanban-card-menu-toggle]`)?.focus();
        }
      },
    );
    moveButton.dataset.applicationMoveDirection = String(direction);
    menu.appendChild(moveButton);
  }
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();

    const shouldOpen = menu.classList.contains('hidden');

    closeKanbanCardMenus(app.kanbanColumns);

    if (shouldOpen) {
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  wrapper.append(toggle, menu);
  return wrapper;
}

export const kanbanMethods = {
  renderKanban(tracker) {
    if (!this.kanbanColumns) return;

    this.kanbanDrag?.destroy();
    this.kanbanDrag = null;
    this.kanbanColumns.replaceChildren();

    if (!tracker || !Array.isArray(tracker.rows)) return;

    const statusColumn = getKanbanStatusColumn(tracker);
    const { groups } = groupKanbanRows(tracker);

    if (tracker.rows.length === 0 && createConfiguredColumns(statusColumn?.column).length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm';

      const heading = document.createElement('h2');
      heading.className = 'kanban-empty-state-title text-lg font-semibold text-gray-900';
      heading.textContent = 'Your job pipeline is empty.';

      const description = document.createElement('p');
      description.className = 'mt-2 text-sm text-gray-500';
      description.textContent = 'Add your first application to start tracking your search.';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'primary-action-button mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500';
      addButton.dataset.kanbanAddApplication = 'true';
      addButton.textContent = 'Add Application';

      emptyState.append(heading, description, addButton);
      this.kanbanColumns.appendChild(emptyState);
      return;
    }

    const statusOptions = getStatusOptions(groups);
    this.kanbanDrag = tracker.rows.length > 0 ? createKanbanDrag(this, tracker) : null;

    groups.forEach((group) => {
      const column = document.createElement('section');
      column.className = 'kanban-column flex min-w-[17rem] max-w-[21rem] flex-1 flex-col rounded-2xl bg-gray-100';
      column.dataset.kanbanStatus = group.value === null ? '' : group.value;
      const color = group.value === ''
        ? STATUS_COLORS[this.kanbanFallbackColor] || STATUS_COLORS.slate
        : group.color;
      column.style.borderTop = `3px solid ${color}`;
      column.style.setProperty('--status-accent', color);

      const header = document.createElement('div');
      header.className = 'kanban-column-header flex items-center justify-between gap-3';

      const heading = document.createElement('h2');
      heading.className = 'kanban-column-title min-w-0 truncate text-sm font-semibold text-gray-900';
      heading.textContent = group.label;

      const count = document.createElement('span');
      count.className = 'kanban-column-count shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500';
      count.textContent = String(group.rowIndexes.length);

      const dot = document.createElement('span');
      dot.className = 'kanban-status-dot';
      dot.setAttribute('aria-hidden', 'true');
      header.append(dot, heading, count);

      const optionIndex = statusColumn?.column.options?.findIndex((option) => (
        getOptionLabel(option) === group.value
      ));

      if ((optionIndex >= 0 || group.value === '') && typeof this.createKanbanStatusMenu === 'function') {
        header.appendChild(this.createKanbanStatusMenu(group.value === '' ? null : optionIndex));
      }
      column.appendChild(header);

      const cards = document.createElement('div');
      cards.className = 'kanban-card-list';

      if (tracker.rows.length === 0 && group === groups[0]) {
        const guide = document.createElement('article');
        guide.className = 'kanban-guide-card';
        guide.draggable = false;
        guide.setAttribute('aria-label', 'Example application. Not saved application data.');
        guide.style.borderLeftColor = color;
        guide.style.setProperty('--card-status-accent', color);
        appendText(guide, 'kanban-guide-badge', 'EXAMPLE');

        const guideHeader = document.createElement('div');
        guideHeader.className = 'flex min-w-0 items-start gap-3';
        const guideIcon = document.createElement('span');
        guideIcon.className = 'kanban-guide-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400 select-none';
        guideIcon.innerHTML = '<i class="fa-solid fa-briefcase text-xs"></i>';
        const guideMainInfo = document.createElement('div');
        guideMainInfo.className = 'min-w-0 flex-1';
        appendText(guideMainInfo, 'kanban-guide-company block truncate text-sm font-semibold text-gray-900', 'Company Name');
        appendText(guideMainInfo, 'kanban-guide-position mt-0.5 block truncate text-xs text-gray-500', 'Position Role');
        guideHeader.append(guideIcon, guideMainInfo);
        guide.appendChild(guideHeader);

        appendText(guide, 'kanban-guide-details', 'Application Date · Platform');

        const guideNextAction = document.createElement('div');
        guideNextAction.className = 'kanban-card-next-action rounded-lg bg-gray-50 p-2 text-xs border border-gray-100';
        appendText(guideNextAction, 'kanban-next-action-label block text-[11px] font-semibold uppercase tracking-wider text-gray-400', 'Next Action');
        appendText(guideNextAction, 'kanban-next-action-text mt-0.5 block font-medium text-gray-800', 'Follow up with recruiter');
        appendText(guideNextAction, 'kanban-next-action-date mt-0.5 block text-xs text-gray-500', 'Next Action Date');
        guide.appendChild(guideNextAction);

        appendText(guide, 'kanban-guide-details', 'Status');
        appendText(guide, 'kanban-guide-position', group.label);
        const explanation = document.createElement('p');
        explanation.className = 'kanban-guide-explanation';
        explanation.textContent = 'This is an example. Add your first application to start tracking your job search.';
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'primary-action-button kanban-guide-add';
        add.dataset.kanbanAddApplication = 'true';
        add.textContent = '+ Add Application';
        cards.append(guide, explanation, add);
      } else if (group.rowIndexes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'kanban-column-empty rounded-xl border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500';
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
        const link = indexes.link >= 0 ? this.getCellValue(row?.[indexes.link]) : '';
        const employmentType = indexes.employmentType >= 0 ? this.getCellDisplay(row?.[indexes.employmentType]) : '-';
        const workSetup = indexes.workSetup >= 0 ? this.getCellDisplay(row?.[indexes.workSetup]) : '-';
        const nextAction = indexes.nextAction >= 0 ? this.getCellDisplay(row?.[indexes.nextAction]) : '-';
        const nextActionDate = indexes.nextActionDate >= 0 ? this.getCellDisplay(row?.[indexes.nextActionDate]) : '-';
        const card = document.createElement('article');

        card.className = 'kanban-card rounded-xl border border-gray-200 bg-white p-4 shadow-sm';
        card.dataset.rowIndex = String(rowIndex);
        card.draggable = false;
        card.style.borderLeftColor = color;
        card.style.setProperty('--card-status-accent', color);
        this.kanbanDrag?.attachCard(card, rowIndex);

        const cardLabel = company === '-' ? 'application' : company;

        const headerRow = document.createElement('div');
        headerRow.className = 'flex min-w-0 items-start justify-between gap-2';

        const mainInfo = document.createElement('div');
        mainInfo.className = 'min-w-0 flex-1';

        const faviconEl = createCompanyFaviconElement(link, company === '-' ? '' : company);
        const safeJobUrl = typeof this.getSafeHttpUrl === 'function' ? this.getSafeHttpUrl(link) : getSafeHttpUrl(link);

        if (safeJobUrl) {
          const companyLink = document.createElement('a');
          companyLink.className = 'kanban-card-company-link group flex min-w-0 items-center gap-3 text-gray-900 dark:text-gray-100';
          companyLink.href = safeJobUrl;
          companyLink.target = '_blank';
          companyLink.rel = 'noopener noreferrer';
          companyLink.setAttribute('aria-label', `Open ${company === '-' ? 'application' : company} job posting`);
          companyLink.addEventListener('click', (event) => event.stopPropagation());
          companyLink.addEventListener('pointerdown', (event) => event.stopPropagation());

          companyLink.appendChild(faviconEl);

          const companySpan = document.createElement('span');
          companySpan.className = 'kanban-card-company-name block truncate text-sm font-semibold';
          companySpan.textContent = company === '-' ? 'Untitled company' : company;
          companyLink.appendChild(companySpan);

          mainInfo.appendChild(companyLink);
        } else {
          const companyHeader = document.createElement('div');
          companyHeader.className = 'flex min-w-0 items-center gap-3';
          companyHeader.appendChild(faviconEl);

          const companySpan = document.createElement('span');
          companySpan.className = 'kanban-card-company-name block truncate text-sm font-semibold text-gray-900 dark:text-gray-100';
          companySpan.textContent = company === '-' ? 'Untitled company' : company;
          companyHeader.appendChild(companySpan);

          mainInfo.appendChild(companyHeader);
        }

        const positionEl = document.createElement('div');
        positionEl.className = 'kanban-card-position mt-0.5 block truncate text-xs text-gray-500 pl-12';
        positionEl.textContent = position === '-' ? 'Untitled position' : position;
        mainInfo.appendChild(positionEl);

        headerRow.appendChild(mainInfo);

        const actions = document.createElement('div');
        actions.className = 'flex shrink-0 items-center -mr-1.5 -mt-1';
        actions.appendChild(createApplicationDragHandle(document, cardLabel));
        actions.appendChild(createKanbanCardMenu(this, rowIndex, cardLabel));
        headerRow.appendChild(actions);

        card.appendChild(headerRow);

        // 3. Application Date + Platform
        const meta = document.createElement('div');
        meta.className = 'kanban-card-meta mt-2.5 text-xs text-gray-500';

        const metadata = [date, platform].filter((value) => value !== '-');

        metadata.forEach((value, index) => {
          if (index > 0) {
            appendText(meta, 'kanban-card-meta-separator', '·');
          }

          appendText(meta, '', value);
        });

        if (metadata.length > 0) card.appendChild(meta);

        // 4. Employment Type + Work Setup pills
        const hasEmploymentType = employmentType && employmentType !== '-';
        const hasWorkSetup = workSetup && workSetup !== '-';
        const isEmploymentTypeVisible = indexes.employmentType >= 0
          && (!this.isListColumnVisible || this.isListColumnVisible(tracker, indexes.employmentType));
        const isWorkSetupVisible = indexes.workSetup >= 0
          && (!this.isListColumnVisible || this.isListColumnVisible(tracker, indexes.workSetup));

        const showEmploymentType = hasEmploymentType && isEmploymentTypeVisible;
        const showWorkSetup = hasWorkSetup && isWorkSetupVisible;

        if (showEmploymentType || showWorkSetup) {
          const pills = document.createElement('div');
          pills.className = 'kanban-card-pills mt-3 flex flex-wrap items-center gap-1.5';

          if (showEmploymentType) {
            const pill = document.createElement('span');
            pill.className = 'kanban-pill kanban-pill-employment';

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-briefcase text-[10px] opacity-75';
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.textContent = employmentType;

            pill.append(icon, text);
            pills.appendChild(pill);
          }

          if (showWorkSetup) {
            const pill = document.createElement('span');
            const normalized = String(workSetup).trim().toLowerCase().replace(/[^a-z]/g, '');
            let pillClass = 'kanban-pill-worksetup-default';
            if (normalized === 'remote') pillClass = 'kanban-pill-remote';
            else if (normalized === 'hybrid') pillClass = 'kanban-pill-hybrid';
            else if (normalized === 'onsite' || normalized === 'office') pillClass = 'kanban-pill-onsite';

            pill.className = `kanban-pill ${pillClass}`;

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-location-dot text-[10px] opacity-75';
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.textContent = workSetup;

            pill.append(icon, text);
            pills.appendChild(pill);
          }

          card.appendChild(pills);
        }

        // 5. Next Action + Next Action Date
        const hasNextAction = nextAction !== '-';
        const hasNextActionDate = nextActionDate !== '-';
        if (hasNextAction || hasNextActionDate) {
          const nextActionWrapper = document.createElement('div');
          nextActionWrapper.className = 'kanban-card-next-action mt-3 rounded-lg bg-gray-50 p-3 text-xs border border-gray-100';

          const nextActionHeader = document.createElement('div');
          nextActionHeader.className = 'kanban-next-action-label text-[10px] font-semibold uppercase tracking-wider text-gray-400';
          nextActionHeader.textContent = 'Next Action';
          nextActionWrapper.appendChild(nextActionHeader);

          if (hasNextAction) {
            const textEl = document.createElement('div');
            textEl.className = 'kanban-next-action-text mt-1.5 text-xs font-medium text-gray-800 break-words leading-snug';
            textEl.textContent = nextAction;
            nextActionWrapper.appendChild(textEl);
          }

          if (hasNextActionDate) {
            const formattedActionDate = formatActionDate(nextActionDate);
            if (formattedActionDate) {
              const dateEl = document.createElement('div');
              dateEl.className = `kanban-next-action-date ${hasNextAction ? 'mt-1' : 'mt-1.5'} text-[11px] text-gray-500 font-normal`;
              dateEl.textContent = formattedActionDate;
              nextActionWrapper.appendChild(dateEl);
            }
          }

          card.appendChild(nextActionWrapper);
        }

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
      this.kanbanDrag?.attachColumn(column, group.value);

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

    let saved;

    try {
      saved = this.save();
    } catch (failure) {
      this.reloadStateFromStorage();
      throw failure;
    }
    if (saved === false) {
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
