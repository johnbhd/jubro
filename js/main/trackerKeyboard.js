export const trackerKeyboardMethods = {
  openMobileSearch() {
    this.searchWrapper?.classList.remove('hidden');
    this.searchWrapper?.classList.add('flex');
    this.btnCloseSearch?.classList.remove('hidden');
    this.btnCloseSearch?.classList.add('inline-flex');
    this.searchInput?.focus();
  },

  closeMobileSearch() {
    this.searchWrapper?.classList.add('hidden');
    this.searchWrapper?.classList.remove('flex');

    if (this.sortSelect?.value !== 'select-text') {
      this.btnCloseSearch?.classList.add('hidden');
      this.btnCloseSearch?.classList.remove('inline-flex');
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
};
