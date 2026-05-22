import { closeMenu } from './ui.js';

export const trackerEventMethods = {
initEvents() {
    const btnMenu = document.getElementById('btnMenu');
    const dropdown = document.getElementById('navDropdown');
    const btnImport = document.getElementById('btnImport');
    const btnExport = document.getElementById('btnExport');
    const btnDashboard = document.getElementById('btnDashboard');
    const btnCloseDashboard = document.getElementById('btnCloseDashboard');
    const btnOpenSearch = document.getElementById('btnOpenSearch');
    const btnCloseSearch = document.getElementById('btnCloseSearch');
    const btnPaginationPrev = document.getElementById('btnPaginationPrev');
    const btnPaginationNext = document.getElementById('btnPaginationNext');
    const tableSortSelect = document.getElementById('tableSortSelect');
    const boardViewSelect = document.getElementById('boardViewSelect');
    const listSearchInput = document.getElementById('listSearchInput');
    const listSortSelect = document.getElementById('listSortSelect');
    const listFilterSections = document.getElementById('listFilterSections');
    const btnListAddJob = document.getElementById('btnListAddJob');
    const selectTextSortSelect = document.getElementById('selectTextSortSelect');
    const selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    const btnClearSelectFilter = document.getElementById('btnClearSelectFilter');
    
    document.getElementById('btn-type-checkbox')?.addEventListener('click', () => {
      this.setColumnType('checkbox');
    });
    
    document.getElementById('btn-type-date')?.addEventListener('click', () => {
      this.setColumnType('date');
    });
    
    document.addEventListener('table:update', () => {
      this.refresh();
    });

    document.addEventListener('table:row-reorder', (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      this.reorderRow(Number(fromIndex), Number(toIndex));
    });

    document.addEventListener('table:col-reorder', (e) => {
      const { fromIndex, toIndex } = e.detail || {};
      this.reorderColumn(Number(fromIndex), Number(toIndex));
    });
    
    document.getElementById('btn-type-text')?.addEventListener('click', () => {
      this.setColumnType('text');
    });
    
    document.getElementById('btn-type-select')?.addEventListener('click', () => {
      this.setColumnType('select');
    });
    
    // toggle dropdown
    btnMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    
    // close properly
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btnMenu) {
        dropdown.classList.add('hidden');
      }
    });
    
    // prevent closing inside
    dropdown?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // TEMP actions
    btnExport?.addEventListener('click', () => {
      const tracker = this.state.data[this.state.active];

      if (!tracker) return;

      this.jsonService.export(tracker, `${tracker.title}.json`);

    });

    btnImport?.addEventListener('click', () => {
      this.jsonService.import((data) => {

        this.state.data[this.state.active] = {
          ...this.state.data[this.state.active],
          columns: structuredClone(data.columns),
          rows: structuredClone(data.rows)
        };

        this.save();

        window.location.reload();
      });
    });

    btnDashboard?.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      this.openDashboard();
    });

    btnOpenSearch?.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      this.openMobileSearch();
    });

    btnCloseSearch?.addEventListener('click', () => {
      if (this.sortSelect?.value === 'select-text') {
        this.clearSelectFilter();
        return;
      }

      this.closeMobileSearch();
    });

    this.dashboardSelectColumn?.addEventListener('change', (e) => {
      this.renderDashboardCards(Number(e.target.value));
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
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        this.focusSearchShortcut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'c' && !this.isEditableTarget(e.target)) {
        if (this.copyHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'v' && !this.isEditableTarget(e.target)) {
        if (this.pasteHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !this.isEditableTarget(e.target)) {
        if (this.deleteHoveredTableTarget()) {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Escape') {
        this.closeMobileSearch();
        this.closeDashboard();
      }
    });
    
    this.titleInput.addEventListener('input', (e) => {
      this.getTracker().title = e.target.value;
      this.save();
    });

    this.titleInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      this.titleInput.blur();
    });

    this.searchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    boardViewSelect?.addEventListener('change', () => {
      this.saveBoardViewPreference();
      this.resetPagination();
      this.updateBoardView();
      this.applySearchFilter();
    });

    listSearchInput?.addEventListener('input', () => {
      this.resetPagination();
      this.applySearchFilter();
    });

    listSortSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.renderListView(this.getTracker());
      this.applySearchFilter();
    });

    btnListAddJob?.addEventListener('click', () => {
      this.addRow();
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

    tableSortSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.updateSelectTextSortVisibility();
      this.refresh();
    });

    selectTextSortSelect?.addEventListener('change', () => {
      if (this.selectValueFilterSelect) {
        this.selectValueFilterSelect.value = '';
      }
      this.renderSelectValueFilterOptions();
      this.resetPagination();
      this.refresh();
    });

    selectValueFilterSelect?.addEventListener('change', () => {
      this.resetPagination();
      this.refresh();
    });

    btnPaginationPrev?.addEventListener('click', () => {
      this.changePage(-1);
    });

    btnPaginationNext?.addEventListener('click', () => {
      this.changePage(1);
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
    this.tableContainer.addEventListener('click', (e) => e.stopPropagation());

    const buttonActions = {
      "btn-addRow": (e) => {
        e.preventDefault();
        this.addRow();
      },
      "btn-addCol": (e) => {
        e.preventDefault();
        this.addCol();
      },
      "btn-copyRow": (e) => {
        e.preventDefault();
        this.copyRow();
      },
      "btn-copyCol": (e) => {
        e.preventDefault();
        this.copyCol();
      },
      "btn-moveUp": (e) => {
        e.preventDefault();
        this.moveUp();
      },
      "btn-moveDown": (e) => {
        e.preventDefault();
        this.moveDown();
      },
      "btn-moveLeft": (e) => {
        e.preventDefault();
        this.moveLeft();
      },
      "btn-moveRight": (e) => {
        e.preventDefault();
        this.moveRight();
      },
      "btn-delRow": (e) => {
        e.preventDefault();
        this.deleteRow();
      },
      "btn-delCol": (e) => {
        e.preventDefault();
        this.deleteCol();
      }
    };

    Object.entries(buttonActions).forEach(([id, action]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => action(e));
    });
  }
};
