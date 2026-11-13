import { BOARD_VIEW_KEY } from './constants.js';
import { isInsightsPage } from './insights/navigation.js';

export class WorkspaceLoading {
  constructor() {
    this.body = document.getElementById('appBody');
    this.placeholder = document.getElementById('workspaceLoading');
    this.workspace = document.getElementById('boardWorkspace');
    this.toolbar = document.getElementById('appNavbar');
    this.generation = 0;
  }

  get isLoading() {
    return this.body.hasAttribute('data-workspace-loading');
  }

  begin() {
    if (isInsightsPage(globalThis.window?.location?.pathname || '')) {
      document.documentElement.dataset.loadingView = 'insights';
    } else {
      try {
        document.documentElement.dataset.loadingView = localStorage.getItem(BOARD_VIEW_KEY) === 'list'
          ? 'list'
          : 'kanban';
      } catch {
        // Keep the initial safe layout if browser preferences are unavailable.
      }
    }

    this.generation += 1;
    this.body.setAttribute('data-workspace-loading', '');
    this.placeholder.hidden = false;
    this.workspace.setAttribute('aria-busy', 'true');
    this.workspace.inert = true;
    this.toolbar.inert = true;
    return this.generation;
  }

  isCurrent(token) {
    return token === this.generation;
  }

  finish(token) {
    if (!this.isCurrent(token)) {
      return false;
    }

    this.placeholder.hidden = true;
    this.body.removeAttribute('data-workspace-loading');
    this.workspace.setAttribute('aria-busy', 'false');
    this.workspace.inert = false;
    this.toolbar.inert = false;
    return true;
  }

  showError(token) {
    if (!this.finish(token)) {
      return;
    }

    this.workspace.hidden = true;
    this.toolbar.hidden = true;
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
      retry.className = 'primary-action-button';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => window.location.reload());
      panel.append(message, retry);
      this.workspace.parentElement.append(panel);
    }

    panel.hidden = false;
  }
}
