import { Storage } from '../storage/storage.js';
import { authService } from '../auth/firebaseAuth.js';
import { createDefaultTracker } from '../tracker/defaultTracker.js';
import { resolveTrackerTarget } from './trackerState.js';
import { UIState, closeMenu } from './ui.js';

export const jobSearchMethods = {
  canOpenWorkspace() {
    const user = authService.getCurrentUser();
    const owner = Storage.getCurrentOwner();
    const matchingOwner = user
      ? owner.ownerType === 'account' && owner.ownerId === user.uid
      : owner.ownerType === 'guest';

    return matchingOwner && (!user || authService.syncedUserId === user.uid
      || Object.keys(this.state.data || {}).length > 0);
  },

  resolveBoardSearch({ ignoreURL = false } = {}) {
    const route = resolveTrackerTarget(this.state, ignoreURL ? '' : window.location.search);
    let key = route.key;

    if (!key) {
      key = resolveTrackerTarget(this.state, '').key;
    }

    if (!key) {
      key = this.generateId();
      this.state.data[key] = createDefaultTracker(key, 'My Job Search');
    }

    if (this.state.active !== key) {
      this.state.active = key;
      try {
        if (this.save() === false) {
          this.state = this.initializeState();
          return false;
        }
      } catch (error) {
        this.state = this.initializeState();
        this.showToast?.('Could not open Job Search. Please retry.');
        return false;
      }
    }

    this.ensureCanonicalTrackerURL(key);
    if (route.status === 'invalid') {
      this.showToast?.('That Job Search is unavailable. Opened your current Job Search.');
    }
    return true;
  },

  showWorkspaceRetry() {
    this.closeSearchSpecificUI();
    this.boardWorkspace?.setAttribute('hidden', '');
    document.getElementById('appNavbar')?.setAttribute('hidden', '');
    let panel = document.getElementById('workspaceRetry');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'workspaceRetry';
      panel.className = 'workspace-retry';
      panel.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = 'Could not open your Job Searches. Please retry.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry';
      retry.className = 'primary-action-button';
      retry.addEventListener('click', async () => {
        retry.disabled = true;
        try {
          await authService.prepareWorkspace(authService.getCurrentUser());
          this.reloadStateFromStorage({ ignoreURL: true });
        } catch {
          this.showToast('Could not load your Job Searches. Try again.');
        } finally {
          retry.disabled = false;
        }
      });
      panel.append(message, retry);
      (this.boardWorkspace?.parentElement || this.appBody).appendChild(panel);
    }
    panel.hidden = false;
  },

  closeSearchSpecificUI() {
    this.kanbanDrag?.destroy();
    this.listDrag?.destroy();
    this.closeListEditModal?.();
    this.closeDashboard?.();
    this.closeCustomizeFields?.();
    this.cancelScheduledTitleSync();
    this.closeMobileSearch?.();
    closeMenu();
    this.clipboard = null;
    UIState.activeRow = null;
    UIState.activeCol = null;
    UIState.activeType = null;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.querySelectorAll('[popover]').forEach(popover => popover.hidePopover());
    this.activeListFilters = {};
    this.currentPage = 1;
    this.kanbanFallbackColor = undefined;
    for (const control of [this.searchInput, this.listSearchInput, this.selectValueFilterSelect]) {
      if (control) {
        control.value = '';
      }
    }
  },

  switchJobSearch(key) {
    if (!this.state.data[key] || this.state.active === key) {
      return false;
    }
    this.closeSearchSpecificUI();
    this.state.active = key;
    try {
      if (this.save() === false) {
        this.reloadStateFromStorage();
        return false;
      }
    } catch {
      this.reloadStateFromStorage();
      this.showToast('Could not switch Job Searches. Saved data restored.');
      return false;
    }
    this.ensureCanonicalTrackerURL(key);
    this.refresh({ persist: false });
    return true;
  },

  renderJobSearchSelector() {
    const trigger = document.getElementById('jobSearchSelector');
    const menu = document.getElementById('jobSearchDropdown');
    if (!trigger || !menu) {
      return;
    }
    const label = document.createElement('span');
    label.textContent = this.getTracker()?.title || 'Job Search';
    const chevron = document.createElement('span');
    chevron.textContent = '▾';
    chevron.setAttribute('aria-hidden', 'true');
    trigger.replaceChildren(label, chevron);
    menu.replaceChildren();
    Object.entries(this.state.data).forEach(([key, tracker]) => {
      const row = document.createElement('div');
      row.className = 'job-search-item';
      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'job-search-choice';
      select.setAttribute('aria-current', String(key === this.state.active));
      const title = document.createElement('span');
      title.textContent = `${key === this.state.active ? '✓ ' : ''}${tracker.title}`;
      const count = document.createElement('small');
      count.textContent = `${tracker.rows.length} applications`;
      select.append(title, count);
      select.addEventListener('click', () => {
        menu.hidePopover();
        this.switchJobSearch(key);
        trigger.focus();
      });
      row.appendChild(select);
      this.appendJobSearchActions?.(row, key);
      menu.appendChild(row);
    });
    if (this.openJobSearchDialog) {
      const create = document.createElement('button');
      create.type = 'button';
      create.className = 'job-search-new';
      create.textContent = '+ New Job Search';
      create.addEventListener('click', () => {
        menu.hidePopover();
        this.openJobSearchDialog('create');
      });
      menu.appendChild(create);
    }
    if (!this.jobSearchSelectorBound) {
      this.jobSearchSelectorBound = true;
      const positionMenu = () => {
        if (!menu.matches(':popover-open')) {
          return;
        }
        const bounds = trigger.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - menu.offsetWidth - 8))}px`;
        menu.style.top = `${bounds.bottom + 6}px`;
        menu.style.maxHeight = `${Math.max(44, window.innerHeight - bounds.bottom - 14)}px`;
      };
      window.addEventListener('resize', () => requestAnimationFrame(positionMenu));
      menu.addEventListener('toggle', event => {
        trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
        if (event.newState === 'open') {
          positionMenu();
          requestAnimationFrame(positionMenu);
          menu.querySelector('button')?.focus();
        }
      });
      menu.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          trigger.focus();
        }
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) {
          return;
        }
        event.preventDefault();
        const buttons = [...menu.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      });
    }
  },
};
