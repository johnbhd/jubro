import { closeMenu, UIState } from './ui.js';

export const trackerKeyboardMethods = {
openMobileSearch() {
    this.searchWrapper?.classList.add('is-open');
    document.getElementById('btnOpenSearch')?.setAttribute('aria-expanded', 'true');
    this.searchInput?.focus();
  },

closeMobileSearch() {
    const wasOpen = this.searchWrapper?.classList.contains('is-open');
    this.searchWrapper?.classList.remove('is-open');
    const trigger = document.getElementById('btnOpenSearch');
    trigger?.setAttribute('aria-expanded', 'false');
    if (wasOpen && window.matchMedia('(max-width: 1023px)').matches) {
      trigger?.focus();
    }
  },

isEditableTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
  },

focusSearchShortcut() {
    this.openMobileSearch();
    this.searchInput?.focus();
    this.searchInput?.select();
  },

  deleteHoveredTarget() {
    if (UIState.activeType === 'row') {
      this.deleteRow();
      return true;
    }

    return false;
  },

  cloneValue(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  },

  copyHoveredTarget() {
    const tracker = this.getTracker();

    if (!tracker) return false;

    if (UIState.activeType === 'row' && UIState.activeRow !== null) {
      const row = tracker.rows?.[UIState.activeRow];
      if (!row) return false;

      this.clipboard = {
        type: 'row',
        row: this.cloneValue(row)
      };
      return true;
    }

    return false;
  },

  pasteHoveredTarget() {
    const tracker = this.getTracker();

    if (!tracker || !this.clipboard) return false;

    if (
      this.clipboard.type === 'row'
      && UIState.activeType === 'row'
      && UIState.activeRow !== null
    ) {
      tracker.rows.splice(UIState.activeRow + 1, 0, this.cloneValue(this.clipboard.row));
      this.clearSortControls();
      this.refresh();
      closeMenu();
      return true;
    }

    return false;
  }
};
