import { BOARD_PAGE_SIZE, BOARD_VIEW_KEY } from '../constants.js';
import { closeMenu } from '../ui.js';

export const boardViewMethods = {
  updateBoardView() {
    const isListView = this.viewSelect?.value === 'list';

    this.tableView?.classList.toggle('hidden', isListView);
    this.listView?.classList.toggle('hidden', !isListView);
    this.updateBoardViewToggle();
  },

  updateBoardViewToggle() {
    const currentView = this.viewSelect?.value || 'table';

    document.querySelectorAll('[data-board-view-button]').forEach((button) => {
      const isActive = button.dataset.boardViewButton === currentView;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  },

  saveBoardViewPreference() {
    if (!this.viewSelect) return;

    localStorage.setItem(BOARD_VIEW_KEY, this.viewSelect.value);
  },

  restoreBoardViewPreference() {
    if (!this.viewSelect) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const savedView = localStorage.getItem(BOARD_VIEW_KEY);

    if (isMobile) {
      this.viewSelect.value = 'list';
      localStorage.setItem(BOARD_VIEW_KEY, 'list');
    } else if (savedView === 'list' || savedView === 'table') {
      this.viewSelect.value = savedView;
    }

    this.updateBoardViewToggle();
  },

  showTableRow(rowIndex) {
    if (this.viewSelect) {
      this.viewSelect.value = 'table';
      this.saveBoardViewPreference();
    }

    this.currentPage = Math.floor(rowIndex / BOARD_PAGE_SIZE) + 1;
    this.updateBoardView();
    this.applySearchFilter();

    const rowElement = document.querySelector(`#tableBody tr[data-row-index="${rowIndex}"]`);
    rowElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
