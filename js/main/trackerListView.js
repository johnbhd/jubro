import { getKanbanColumns } from './kanban.js';

function appendText(parent, className, value) {
  const element = document.createElement('span');

  element.className = className;
  element.textContent = value;
  parent.appendChild(element);

  return element;
}

function createActionButton(label, iconName, extraClass = '') {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = `inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 ${extraClass}`;
  button.setAttribute('aria-label', label);

  const icon = document.createElement('i');
  icon.className = `fa-solid ${iconName} text-xs`;
  button.appendChild(icon);

  return button;
}

function getCellValue(cell) {
  return typeof cell === 'object' ? cell?.value : cell;
}

function getColumnName(column) {
  return typeof column === 'object' ? column?.name : column;
}

function getColumnIndexes(app, tracker) {
  if (typeof app.getTrackerColumnIndexes === 'function') {
    return app.getTrackerColumnIndexes(tracker);
  }

  return {
    company: 0,
    position: 1,
    date: -1,
    platform: -1,
    status: -1,
    link: -1,
  };
}

function getStatusOptions(tracker) {
  return getKanbanColumns(tracker).filter((column) => column.value !== null);
}

export const trackerListViewMethods = {
  updateBoardView() {
    const currentView = this.viewSelect?.value || 'kanban';
    const isListView = currentView === 'list';

    this.kanbanView?.classList.toggle('hidden', isListView);
    this.listView?.classList.toggle('hidden', !isListView);
    this.updateBoardViewToggle();
  },

  updateBoardViewToggle() {
    const currentView = this.viewSelect?.value || 'kanban';

    document.querySelectorAll('[data-board-view-button]').forEach((button) => {
      const isActive = button.dataset.boardViewButton === currentView;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  },

  saveBoardViewPreference() {
    const view = this.viewSelect?.value || 'kanban';

    try {
      localStorage.setItem('jubro_board_view', view);
    } catch (error) {
      // View preference is optional; workspace data remains unaffected.
    }
  },

  restoreBoardViewPreference() {
    if (!this.viewSelect) {
      return;
    }

    let savedView = 'kanban';

    try {
      savedView = localStorage.getItem('jubro_board_view') === 'list'
        ? 'list'
        : 'kanban';
    } catch (error) {
      savedView = 'kanban';
    }

    this.viewSelect.value = savedView;
    this.saveBoardViewPreference();
    this.updateBoardViewToggle();
  },

  setBoardView(view) {
    if (!this.viewSelect || !['kanban', 'list'].includes(view)) {
      return;
    }

    this.viewSelect.value = view;
    this.saveBoardViewPreference();
    this.updateBoardView?.();
    this.applySearchFilter();
  },

  renderListView(tracker) {
    if (!this.listCards) {
      return;
    }

    this.listCards.replaceChildren();

    if (!tracker || !Array.isArray(tracker.rows) || tracker.rows.length === 0) {
      const empty = document.createElement('p');

      empty.className = 'rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500';
      empty.textContent = 'No applications yet.';
      this.listCards.appendChild(empty);
      return;
    }

    const indexes = getColumnIndexes(this, tracker);
    const statusOptions = getStatusOptions(tracker);
    const rowItems = typeof this.getRowsForBoardRender === 'function'
      ? this.getRowsForBoardRender(tracker)
      : tracker.rows.map((row, rowIndex) => ({ row, rowIndex }));

    rowItems.forEach(({ row, rowIndex }) => {
      const article = document.createElement('article');
      const company = this.getCellDisplay(row?.[indexes.company]);
      const position = this.getCellDisplay(row?.[indexes.position]);
      const date = this.getCellDisplay(row?.[indexes.date]);
      const platform = this.getCellDisplay(row?.[indexes.platform]);
      const status = indexes.status >= 0
        ? this.getCellDisplay(row?.[indexes.status])
        : '';

      article.className = 'list-view-row rounded-2xl border border-gray-200 bg-white p-4 shadow-sm';
      article.dataset.rowIndex = String(rowIndex);

      const content = document.createElement('div');
      content.className = 'min-w-0 flex-1';
      appendText(content, 'block truncate text-base font-semibold text-gray-900', company === '-' ? 'Untitled company' : company);
      appendText(content, 'mt-1 block truncate text-sm text-gray-600', position === '-' ? 'Untitled position' : position);

      const metadata = document.createElement('div');
      metadata.className = 'mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500';

      [date, platform].filter((value) => value !== '-').forEach((value, index) => {
        if (index > 0) {
          appendText(metadata, 'text-gray-400', '·');
        }

        appendText(metadata, '', value);
      });
      content.appendChild(metadata);

      const controls = document.createElement('div');
      controls.className = 'mt-4 flex flex-wrap items-center gap-2 lg:mt-0 lg:justify-end';

      if (indexes.status >= 0) {
        const statusLabel = document.createElement('label');
        const statusSelect = document.createElement('select');

        statusLabel.className = 'flex items-center gap-2 text-xs text-gray-500';
        statusLabel.textContent = 'Status';
        statusSelect.className = 'h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700';
        statusSelect.setAttribute('aria-label', `Change status for ${company === '-' ? 'application' : company}`);

        statusOptions.forEach((option) => {
          const optionElement = document.createElement('option');

          optionElement.value = option.value;
          optionElement.textContent = option.label;
          statusSelect.appendChild(optionElement);
        });

        statusSelect.value = status;
        statusSelect.addEventListener('change', () => {
          this.moveKanbanRow(rowIndex, statusSelect.value);
        });
        statusLabel.appendChild(statusSelect);
        controls.appendChild(statusLabel);
      }

      if (indexes.link >= 0) {
        const safeUrl = this.getSafeHttpUrl(this.getCellValue(row[indexes.link]));

        if (safeUrl) {
          const link = document.createElement('a');

          link.href = safeUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-xs text-gray-500 hover:bg-gray-50';
          link.textContent = 'Open link';
          controls.appendChild(link);
        }
      }

      const editButton = createActionButton('Edit application', 'fa-pen');
      editButton.addEventListener('click', () => this.openApplicationEditModal?.(rowIndex));

      const deleteButton = createActionButton('Delete application', 'fa-trash', 'text-red-500');
      deleteButton.addEventListener('click', () => {
        if (window.confirm('Delete this application?')) {
          this.deleteApplicationAt?.(rowIndex);
        }
      });

      controls.append(editButton, deleteButton);
      article.append(content, controls);
      this.listCards.appendChild(article);
    });
  },
};
