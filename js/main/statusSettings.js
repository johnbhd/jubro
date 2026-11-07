import { getKanbanStatusColumn, closeKanbanCardMenus } from './kanban.js';
import { normalizeCellValue } from '../services/trackerData.js';
import {
  STATUS_COLORS,
  getDefaultStatusColorKey,
  getSelectOptionColor,
  isStatusColorKey,
} from '../services/statusColors.js';

function optionLabel(option) {
  return String(typeof option === 'string' ? option : option?.label ?? '').trim();
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}

function makeButton(label, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

export const statusSettingsMethods = {
  updateStatusOption(optionIndex, { label, color, direction } = {}) {
    const tracker = this.getTracker();
    const status = getKanbanStatusColumn(tracker);
    const options = status?.column.options;

    if (!Array.isArray(options) || !Number.isInteger(optionIndex)
      || optionIndex < 0 || optionIndex >= options.length) {
      throw new Error('This status no longer exists. Reopen its menu.');
    }

    const option = options[optionIndex];
    const oldLabel = optionLabel(option);
    const nextLabel = label === undefined ? oldLabel : String(label).trim();

    if (!nextLabel) throw new Error('Enter a status name.');
    if (options.some((item, index) => index !== optionIndex
      && normalized(optionLabel(item)) === normalized(nextLabel))) {
      throw new Error('A status with that name already exists.');
    }
    if (color !== undefined && !isStatusColorKey(color)) {
      throw new Error('Choose a color from the palette.');
    }

    if (direction !== undefined) {
      if (direction !== -1 && direction !== 1) return false;
      const target = optionIndex + direction;

      if (target < 0 || target >= options.length) return false;
      options.splice(optionIndex, 1);
      options.splice(target, 0, option);
    } else {
      const rename = nextLabel !== oldLabel;
      const recolor = color !== undefined && color !== option?.color;

      if (!rename && !recolor) return false;

      const updated = typeof option === 'string' ? { label: oldLabel } : { ...option };
      updated.label = nextLabel;

      // Preserve the visible fallback accent when a legacy status is renamed.
      if (rename && updated.color === undefined) {
        updated.color = getDefaultStatusColorKey(oldLabel);
      }
      if (color !== undefined) updated.color = color;
      options[optionIndex] = updated;

      if (rename) {
        tracker.rows.forEach((row) => {
          if (!Array.isArray(row)) return;
          const cell = row[status.index];
          const value = cell && typeof cell === 'object' ? cell.value : cell;

          if (normalized(value) !== normalized(oldLabel)) return;

          row[status.index] = {
            ...(cell && typeof cell === 'object' ? cell : {}),
            value: normalizeCellValue('select', nextLabel),
            type: 'select',
          };
        });
      }
    }

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

    if (nextLabel !== oldLabel) {
      if (normalized(this.activeListFilters?.[status.index]) === normalized(oldLabel)) {
        this.activeListFilters[status.index] = nextLabel;
      }
      if (Number(this.selectTextSortSelect?.value) === status.index
        && normalized(this.selectValueFilterSelect?.value) === normalized(oldLabel)) {
        // Update the existing option before assigning a value to the native select.
        Array.from(this.selectValueFilterSelect.options || []).forEach((item) => {
          if (normalized(item.value) === normalized(oldLabel)) {
            item.value = nextLabel;
            item.textContent = nextLabel;
          }
        });
        this.selectValueFilterSelect.value = nextLabel;
      }
    }

    this.refresh({ persist: false });
    return true;
  },

  focusStatusMenu(optionIndex) {
    this.kanbanColumns?.querySelector(`[data-status-option-index="${optionIndex}"]`)?.focus();
  },

  createKanbanStatusMenu(optionIndex) {
    const options = getKanbanStatusColumn(this.getTracker()).column.options;
    const fallback = optionIndex === null;
    const label = fallback ? 'No status' : optionLabel(options[optionIndex]);
    const wrapper = document.createElement('div');
    wrapper.className = 'kanban-status-menu-wrapper';

    const toggle = makeButton('⋮', 'kanban-status-menu-toggle');
    toggle.dataset.statusOptionIndex = String(optionIndex);
    toggle.setAttribute('aria-label', `Manage ${label} status`);
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'kanban-status-menu';
    menu.setAttribute('popover', 'auto');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', `Manage ${label} status`);

    const close = () => {
      menu.hidePopover();
      toggle.setAttribute('aria-expanded', 'false');
    };
    const actions = fallback ? [
      ['Change color', () => this.openStatusDialog(null, 'color')],
    ] : [
      ['Rename status', () => this.openStatusDialog(optionIndex, 'rename')],
      ['Change color', () => this.openStatusDialog(optionIndex, 'color')],
      ['Move left', () => this.updateStatusOption(optionIndex, { direction: -1 }), optionIndex === 0],
      ['Move right', () => this.updateStatusOption(optionIndex, { direction: 1 }), optionIndex === options.length - 1],
    ];

    actions.forEach(([text, action, disabled]) => {
      const button = makeButton(text, 'kanban-status-menu-action');
      button.setAttribute('role', 'menuitem');
      button.disabled = Boolean(disabled);
      button.addEventListener('click', () => {
        close();
        action();
        if (text.startsWith('Move')) {
          this.focusStatusMenu(optionIndex + (text === 'Move left' ? -1 : 1));
        }
      });
      menu.appendChild(button);
    });

    menu.addEventListener('toggle', () => {
      toggle.setAttribute('aria-expanded', String(menu.matches(':popover-open')));
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        toggle.focus();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
        const index = buttons.indexOf(document.activeElement);
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    });
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (menu.matches(':popover-open')) {
        close();
        return;
      }

      closeKanbanCardMenus(this.kanbanColumns);
      menu.showPopover();
      const rect = toggle.getBoundingClientRect();
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const top = rect.bottom + height + 8 <= window.innerHeight
        ? rect.bottom + 4
        : Math.max(8, rect.top - height - 4);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      toggle.setAttribute('aria-expanded', 'true');
      menu.querySelector('button:not(:disabled)')?.focus();
    });
    wrapper.append(toggle, menu);
    return wrapper;
  },

  openStatusDialog(optionIndex, mode) {
    const tracker = this.getTracker();
    const options = getKanbanStatusColumn(tracker)?.column.options;
    const fallback = optionIndex === null;
    const option = fallback
      ? { label: 'No status', color: this.kanbanFallbackColor || 'slate' }
      : options?.[optionIndex];
    if (option === undefined) return;

    const label = optionLabel(option);
    const dialog = document.createElement('dialog');
    dialog.className = 'list-edit-dialog status-dialog';
    dialog.setAttribute('aria-labelledby', 'statusDialogTitle');
    dialog.innerHTML = `
      <form novalidate>
        <h2 id="statusDialogTitle"></h2>
        <div class="status-dialog-fields"></div>
        <p class="status-dialog-error" role="alert"></p>
        <div class="status-dialog-actions">
          <button type="button" class="status-dialog-cancel">Cancel</button>
          <button type="submit" class="primary-action-button">Save</button>
        </div>
      </form>
    `;

    const fields = dialog.querySelector('.status-dialog-fields');
    const error = dialog.querySelector('.status-dialog-error');
    let input;
    let selectedColor = Object.keys(STATUS_COLORS).find((key) => (
      STATUS_COLORS[key].toLowerCase() === getSelectOptionColor(option, { status: true }).toLowerCase()
    ));

    dialog.querySelector('h2').textContent = mode === 'rename' ? 'Rename Status' : 'Change Column Color';

    if (mode === 'rename') {
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Name';
      input = document.createElement('input');
      input.className = 'list-edit-control';
      input.value = label;
      input.required = true;
      input.setAttribute('aria-describedby', 'statusDialogError');
      error.id = 'statusDialogError';
      nameLabel.appendChild(input);
      fields.appendChild(nameLabel);
    } else {
      const description = document.createElement('p');
      description.textContent = fallback
        ? 'Change the No status color for this session only. Application statuses stay blank.'
        : `This will update the color for "${label}".`;
      const palette = document.createElement('div');
      palette.className = 'status-color-palette';
      palette.setAttribute('role', 'group');
      palette.setAttribute('aria-label', 'Status color');

      Object.entries(STATUS_COLORS).forEach(([key, value]) => {
        const button = makeButton('', 'status-color-choice');
        button.setAttribute('aria-label', key[0].toUpperCase() + key.slice(1));
        button.setAttribute('aria-pressed', String(selectedColor === key));
        button.style.setProperty('--status-accent', value);
        button.textContent = selectedColor === key ? '✓' : '';
        button.addEventListener('click', () => {
          selectedColor = key;
          palette.querySelectorAll('button').forEach((choice) => {
            const selected = choice === button;
            choice.setAttribute('aria-pressed', String(selected));
            choice.textContent = selected ? '✓' : '';
          });
        });
        palette.appendChild(button);
      });
      fields.append(description, palette);
    }

    dialog.querySelector('.status-dialog-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      this.focusStatusMenu(optionIndex);
    });
    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        if (this.getTracker() !== tracker
          || getKanbanStatusColumn(tracker)?.column.options !== options
          || (!fallback && options[optionIndex] !== option)) {
          throw new Error('The tracker changed. Close this dialog and reopen the status menu.');
        }

        const changes = mode === 'rename' ? { label: input.value } : { color: selectedColor };
        if (mode === 'color' && selectedColor === undefined) {
          throw new Error('Choose a color from the palette.');
        }
        if (fallback) {
          if (!isStatusColorKey(selectedColor)) throw new Error('Choose a color from the palette.');
          this.kanbanFallbackColor = selectedColor;
          this.refresh({ persist: false });
          dialog.close();
          return;
        }
        const saved = this.updateStatusOption(optionIndex, changes);
        if (!saved && this.getTracker() !== tracker) {
          throw new Error('Your data changed. The saved tracker has been reloaded.');
        }
        dialog.close();
      } catch (failure) {
        error.textContent = failure.message;
        input?.setAttribute('aria-invalid', 'true');
        input?.focus();
      }
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    if (input) {
      input.focus();
      input.select();
    }
  },
};
