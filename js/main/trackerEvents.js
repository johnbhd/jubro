import { closeMenu } from './ui.js';
import { closeKanbanCardMenus } from './kanban.js';
import { Storage } from '../storage/storage.js';

export function syncSortSelectWidth(sortSelect) {
  if (!sortSelect) return;
  const widths = {
    'date-desc': '86px',
    'date-asc': '82px',
    '': '84px',
    'select-text': '106px',
  };
  sortSelect.style.width = widths[sortSelect.value] || '96px';
}

export const trackerEventMethods = {
initEvents() {
    const btnImport = document.getElementById('btnImport');
    const btnExport = document.getElementById('btnExport');
    const btnDashboard = document.getElementById('btnDashboard');
    const btnCustomFields = document.getElementById('btnCustomFields');
    const btnAddApplication = document.getElementById('btnAddApplication');
    const btnCloseDashboard = document.getElementById('btnCloseDashboard');
    const btnOpenSearch = document.getElementById('btnOpenSearch');
    const btnCloseSearch = document.getElementById('btnCloseSearch');
    const btnPaginationPrev = document.getElementById('btnPaginationPrev');
    const btnPaginationNext = document.getElementById('btnPaginationNext');
    const sortSelect = document.getElementById('sortSelect');
    const boardViewSelect = document.getElementById('boardViewSelect');
    const listSearchInput = document.getElementById('listSearchInput');
    const listSortSelect = document.getElementById('listSortSelect');
    const listFilterSections = document.getElementById('listFilterSections');
    const btnListAddJob = document.getElementById('btnListAddJob');
    const selectTextSortSelect = document.getElementById('selectTextSortSelect');
    const selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    const btnClearSelectFilter = document.getElementById('btnClearSelectFilter');

    // Sorting remains available, but does not compete with primary navigation.
    
    // close menus properly
    document.addEventListener('click', (e) => {
      if (!e.target?.closest?.('[data-kanban-card-menu], [data-kanban-card-menu-toggle]')) {
        closeKanbanCardMenus(this.kanbanColumns);
      }
    });
    
    // TEMP actions
    btnExport?.addEventListener('click', () => {
      const tracker = this.state.data[this.state.active];

      if (!tracker) return;

      this.jsonService.export(tracker, `${tracker.title}.json`);

    });

    btnImport?.addEventListener('click', async () => {
      try {
        const importContext = this.captureJobSearchContext();
        const data = await this.jsonService.import();

        if (!data) return;

        this.assertJobSearchContext(importContext);
        const trackerKey = importContext.key;

        if (trackerKey !== this.getActiveTrackerKey()) {
          throw new Error('Your Job Search changed. Reopen Import.');
        }

        if (!trackerKey) return;

        const confirmed = window.confirm(
          'Replace this Job Search with the imported data?'
        );

        if (!confirmed) return;

        const nextState = this.cloneValue(this.state);
        nextState.active = trackerKey;
        nextState.data[trackerKey] = {
          ...nextState.data[trackerKey],
          id: trackerKey,
          columns: this.cloneValue(data.columns),
          rows: this.cloneValue(data.rows)
        };

        if (!Storage.replace(nextState, this.state.revision)) {
          window.alert('Your data changed in another tab. Reload before importing.');
          return;
        }

        this.state = nextState;
        await this.syncLocalStateToFirebase();
        this.refresh({ persist: false });
        document.getElementById('boardTopNavDropdown')?.classList.add('hidden');
      } catch (error) {
        console.error('Jubro tracker import failed:', error);
        window.alert(error.userMessage || 'This file is not a valid Jubro Job Search file.');
      }
    });

    btnDashboard?.addEventListener('click', () => {
      this.openDashboard();
    });

    document.getElementById('overviewInsightsLink')?.addEventListener('click', () => {
      this.closeDashboard();
    });

    btnCustomFields?.addEventListener('click', () => {
      this.toggleCustomizeFields();
    });

    btnOpenSearch?.addEventListener('click', () => {
      this.openMobileSearch();
    });

    const keepSearchOpen = () => {
      this.searchWrapper.classList.add('is-open');
      btnOpenSearch?.setAttribute('aria-expanded', 'true');
    };
    this.searchWrapper?.addEventListener('focusin', keepSearchOpen);
    this.searchWrapper?.addEventListener('pointerdown', keepSearchOpen);

    btnCloseSearch?.addEventListener('click', () => {
      this.closeMobileSearch();
    });

    this.dashboardAddButton?.addEventListener('click', () => {
      this.closeDashboard();
      this.openAddApplication();
    });

    this.dashboardRangeSelect?.addEventListener('change', () => {
      this.updateDashboardRangeVisibility();
      this.renderDashboard();
    });

    this.dashboardDateFrom?.addEventListener('change', () => {
      this.renderDashboard();
    });

    this.dashboardDateTo?.addEventListener('change', () => {
      this.renderDashboard();
    });

    btnCloseDashboard?.addEventListener('click', () => {
      this.closeDashboard();
    });

    this.dashboardModal?.addEventListener('click', (e) => {
      if (e.target === this.dashboardModal) {
        this.closeDashboard();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) {
        return;
      }
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        this.focusSearchShortcut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'c' && !this.isEditableTarget(e.target)) {
        if (this.copyHoveredTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'v' && !this.isEditableTarget(e.target)) {
        if (this.pasteHoveredTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !this.isEditableTarget(e.target)) {
        if (this.deleteHoveredTarget()) {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        this.closeMobileSearch();
        this.closeDashboard();
        this.closeCustomizeFields?.();
        closeKanbanCardMenus(this.kanbanColumns);
      }
    });
    
    this.titleInput?.addEventListener('input', (e) => {
      const tracker = this.getTracker();

      if (!tracker) return;

      tracker.title = e.target.value;

      if (this.save({ sync: false }) === false) return;

      this.scheduleTitleSync();
    });

    this.titleInput?.addEventListener('blur', () => {
      this.flushScheduledTitleSync();
    });

    this.titleInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      this.titleInput.blur();
    });

    this.searchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    boardViewSelect?.addEventListener('change', () => {
      this.setBoardView(boardViewSelect.value);
    });

    document.querySelectorAll('[data-board-view-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.boardViewButton;

        this.setBoardView(view);
      });
    });

    listSearchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    listSortSelect?.addEventListener('change', () => {
      this.saveListSortPreference();
      this.resetPagination();
      this.renderListView(this.getTracker());
      this.applySearchFilter();
    });

    const addApplication = () => {
      this.openAddApplication();
    };

    btnAddApplication?.addEventListener('click', addApplication);
    btnListAddJob?.addEventListener('click', addApplication);

    document.getElementById('kanbanView')?.addEventListener('click', (event) => {
      if (!event.target.closest('[data-kanban-add-application]')) return;

      addApplication();
    });

    listFilterSections?.addEventListener('click', (e) => {
      const chip = e.target.closest('.list-filter-chip');
      if (!chip) return;

      const columnIndex = chip.dataset.columnIndex;
      const value = chip.dataset.filterValue || '';

      if (columnIndex === undefined) return;

      if (value === '' || this.activeListFilters[columnIndex] === value) {
        delete this.activeListFilters[columnIndex];
      } else {
        this.activeListFilters[columnIndex] = value;
      }

      this.resetPagination();
      this.updateListFilterChipStyles();
      this.applySearchFilter();
    });

    syncSortSelectWidth(sortSelect);

    sortSelect?.addEventListener('change', () => {
      syncSortSelectWidth(sortSelect);
      this.resetPagination();
      this.updateSelectTextSortVisibility();
      this.refresh({ persist: false });
    });

    selectTextSortSelect?.addEventListener('change', () => {
      if (this.selectValueFilterSelect) {
        this.selectValueFilterSelect.value = '';
      }
      this.renderSelectValueFilterOptions();
      this.resetPagination();
      this.refresh({ persist: false });
    });

    selectValueFilterSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.refresh({ persist: false });
    });

    btnPaginationPrev?.addEventListener('click', () => {
      this.changePage(-1);
    });

    btnPaginationNext?.addEventListener('click', () => {
      this.changePage(1);
    });

    window.matchMedia('(max-width: 639px)').addEventListener('change', () => {
      this.applySearchFilter();
    });

    btnClearSelectFilter?.addEventListener('click', () => {
      this.clearSelectFilter();
    });

    this.appBody.addEventListener('click', (e) => {
      const menu = document.getElementById('contextMenu');
      if (!menu) return;
    
      if (!menu.contains(e.target)) {
        closeMenu();
      }
    });
    this.boardWorkspace.addEventListener('click', (e) => e.stopPropagation());

    const buttonActions = {
      "btn-addRow": (e) => {
        e.preventDefault();
        this.openAddApplication();
      },
      "btn-copyRow": (e) => {
        e.preventDefault();
        this.copyRow();
      },
      "btn-moveUp": (e) => {
        e.preventDefault();
        this.moveUp();
      },
      "btn-moveDown": (e) => {
        e.preventDefault();
        this.moveDown();
      },
      "btn-delRow": (e) => {
        e.preventDefault();
        this.deleteRow();
      },
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => action(e));
    });
  },

  syncSortSelectWidth(sortSelect = this.sortSelect) {
    syncSortSelectWidth(sortSelect);
  }
};
