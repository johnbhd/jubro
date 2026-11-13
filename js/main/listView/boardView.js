import { BOARD_VIEW_KEY } from '../constants.js';
import { closeMenu } from '../ui.js';
import { getRequestedBoardView, getWorkspaceLink } from '../insights/navigation.js';

export const boardViewMethods = {
  updateBoardView() {
    const currentView = this.viewSelect?.value || 'kanban';
    const isListView = !this.isInsightsPage && this.viewSelect?.value === 'list';
    const isKanbanView = !this.isInsightsPage && currentView === 'kanban';
    this.listView?.classList.toggle('hidden', !isListView);
    this.kanbanView?.classList.toggle('hidden', !isKanbanView);
    this.updateBoardViewToggle();
  },

  updateBoardViewToggle() {
    const currentView = this.viewSelect?.value || 'kanban';

    document.querySelectorAll('[data-board-view-button]').forEach((button) => {
      const isActive = !this.isInsightsPage && button.dataset.boardViewButton === currentView;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  },

  saveBoardViewPreference() {
    if (!this.viewSelect) return;

    localStorage.setItem(BOARD_VIEW_KEY, this.viewSelect.value);
  },

  setBoardView(view) {
    if (!this.viewSelect || !['kanban', 'list'].includes(view)) {
      return;
    }

    if (this.isInsightsPage) {
      window.location.assign(getWorkspaceLink(this.getActiveTrackerKey(), view));
      return;
    }

    this.viewSelect.value = view;
    this.kanbanDrag?.cancel();
    this.listDrag?.cancel();
    this.saveBoardViewPreference();
    const url = new URL(window.location.href);
    if (url.searchParams.has('view')) {
      url.searchParams.set('view', view);
      window.history.replaceState({}, '', url);
    }
    this.resetPagination();
    this.updateBoardView();
    this.applySearchFilter();
  },

  restoreBoardViewPreference() {
    if (!this.viewSelect) return;

    const savedView = localStorage.getItem(BOARD_VIEW_KEY);

    const requestedView = getRequestedBoardView(window.location?.search || '');
    if (requestedView) {
      this.viewSelect.value = requestedView;
    } else if (savedView === 'list') {
      this.viewSelect.value = savedView;
    } else {
      this.viewSelect.value = 'kanban';
      localStorage.setItem(BOARD_VIEW_KEY, 'kanban');
    }

    this.updateBoardViewToggle();
  },

  deleteRowAt(rowIndex) {
    const tracker = this.getTracker();

    if (!tracker || !Array.isArray(tracker.rows)) return;
    if (rowIndex < 0 || rowIndex >= tracker.rows.length) return;

    tracker.rows.splice(rowIndex, 1);
    this.refresh();
    closeMenu();
  }
};
