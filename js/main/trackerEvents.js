import { Storage } from '../storage/storage.js';

export const trackerEventMethods = {
  initEvents() {
    const btnMenu = document.getElementById('btnMenu');
    const dropdown = document.getElementById('navDropdown');
    const btnImport = document.getElementById('btnImport');
    const btnExport = document.getElementById('btnExport');
    const btnDashboard = document.getElementById('btnDashboard');
    const btnCustomizeFields = document.getElementById('btnCustomizeFields');
    const btnBoardView = document.getElementById('btnBoardView');
    const btnListView = document.getElementById('btnListView');
    const btnAddApplication = document.getElementById('btnAddApplication');
    const btnCloseDashboard = document.getElementById('btnCloseDashboard');
    const btnOpenSearch = document.getElementById('btnOpenSearch');
    const btnCloseSearch = document.getElementById('btnCloseSearch');
    const boardSortSelect = document.getElementById('boardSortSelect');
    const boardViewSelect = document.getElementById('boardViewSelect');
    const selectTextSortSelect = document.getElementById('selectTextSortSelect');
    const selectValueFilterSelect = document.getElementById('selectValueFilterSelect');
    const btnClearSelectFilter = document.getElementById('btnClearSelectFilter');

    this.ensureApplicationEditModal();
    this.ensureTrackerSettingsPopup();

    btnMenu?.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdown?.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
      if (dropdown && !dropdown.contains(event.target) && event.target !== btnMenu) {
        dropdown.classList.add('hidden');
      }
    });

    dropdown?.addEventListener('click', (event) => event.stopPropagation());

    btnCustomizeFields?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.toggleTrackerSettings();
    });

    btnBoardView?.addEventListener('click', () => this.setBoardView('kanban'));
    btnListView?.addEventListener('click', () => this.setBoardView('list'));
    boardViewSelect?.addEventListener('change', () => {
      this.setBoardView(boardViewSelect.value);
    });

    btnExport?.addEventListener('click', () => {
      const tracker = this.getTracker();

      if (!tracker) {
        return;
      }

      this.jsonService.export(tracker, `${tracker.title}.json`);
      dropdown?.classList.add('hidden');
    });

    btnImport?.addEventListener('click', async () => {
      try {
        const data = await this.jsonService.import();

        if (!data) {
          return;
        }

        const trackerKey = this.getActiveTrackerKey();

        if (!trackerKey || !window.confirm('Replace this tracker with the imported data?')) {
          return;
        }

        const nextState = this.cloneValue(this.state);
        nextState.active = trackerKey;
        nextState.data[trackerKey] = {
          ...nextState.data[trackerKey],
          id: trackerKey,
          columns: this.cloneValue(data.columns),
          rows: this.cloneValue(data.rows),
        };

        if (!Storage.replace(nextState, this.state.revision)) {
          window.alert('Your data changed in another tab. Reload before importing.');
          return;
        }

        this.state = nextState;
        await this.syncLocalStateToFirebase();
        this.refresh({ persist: false });
        dropdown?.classList.add('hidden');
      } catch (error) {
        console.error('Jubro tracker import failed:', error);
        window.alert(error.userMessage || 'This file is not a valid Jubro tracker file.');
      }
    });

    btnDashboard?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.openDashboard();
    });

    btnOpenSearch?.addEventListener('click', () => {
      dropdown?.classList.add('hidden');
      this.openMobileSearch();
    });

    btnCloseSearch?.addEventListener('click', () => {
      if (this.sortSelect?.value === 'select-text') {
        this.clearSelectFilter();
        return;
      }

      this.closeMobileSearch();
    });

    this.dashboardSelectColumn?.addEventListener('change', (event) => {
      this.renderDashboardCards(Number(event.target.value));
    });

    this.dashboardRangeSelect?.addEventListener('change', () => {
      this.updateDashboardRangeVisibility();
      this.renderDashboardCards(Number(this.dashboardSelectColumn?.value));
    });

    this.dashboardDateFrom?.addEventListener('change', () => {
      this.renderDashboardCards(Number(this.dashboardSelectColumn?.value));
    });

    this.dashboardDateTo?.addEventListener('change', () => {
      this.renderDashboardCards(Number(this.dashboardSelectColumn?.value));
    });

    btnCloseDashboard?.addEventListener('click', () => this.closeDashboard());

    this.dashboardModal?.addEventListener('click', (event) => {
      if (event.target === this.dashboardModal) {
        this.closeDashboard();
      }
    });

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        this.focusSearchShortcut();
        return;
      }

      if (event.key === 'Escape') {
        this.closeMobileSearch();
        this.closeDashboard();
        this.closeTrackerSettings();
        this.closeApplicationEditModal();
      }
    });

    this.titleInput?.addEventListener('input', (event) => {
      const tracker = this.getTracker();

      if (!tracker) {
        return;
      }

      tracker.title = event.target.value;

      if (this.save({ sync: false }) === false) {
        return;
      }

      this.scheduleTitleSync();
    });

    this.titleInput?.addEventListener('blur', () => this.flushScheduledTitleSync());
    this.titleInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.target.tagName === 'TEXTAREA') {
        return;
      }

      event.preventDefault();
      this.titleInput.blur();
    });

    this.searchInput?.addEventListener('input', () => this.applySearchFilter());

    const addApplication = () => {
      this.addRow({ useJobDefaults: true, insertAtStart: true });
    };

    btnAddApplication?.addEventListener('click', addApplication);

    this.kanbanView?.addEventListener('click', (event) => {
      if (event.target.closest('[data-kanban-add-application]')) {
        addApplication();
      }
    });

    boardSortSelect?.addEventListener('change', () => {
      this.updateSelectTextSortVisibility();
      this.refresh({ persist: false });
    });

    selectTextSortSelect?.addEventListener('change', () => {
      if (this.selectValueFilterSelect) {
        this.selectValueFilterSelect.value = '';
      }

      this.renderSelectValueFilterOptions();
      this.refresh({ persist: false });
    });

    selectValueFilterSelect?.addEventListener('change', () => {
      this.refresh({ persist: false });
    });

    btnClearSelectFilter?.addEventListener('click', () => this.clearSelectFilter());
  },
};
