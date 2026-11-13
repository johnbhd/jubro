async function openInsights() {
  try {
    let theme = 'dark';
    try {
      theme = localStorage.getItem('jubro_theme') === 'light' ? 'light' : 'dark';
    } catch {
      // Storage errors remain the shared workspace resolver's responsibility.
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.loadingView = 'insights';
    document.documentElement.dataset.workspacePage = 'insights';

    // Reuse trusted local markup; do not duplicate forms, ownership UI, or auth handlers.
    const response = await fetch('/board/index.html', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('Could not load the workspace shell.');
    }
    const template = new DOMParser().parseFromString(await response.text(), 'text/html');
    const shell = template.getElementById('appBody');
    if (!shell || !template.getElementById('boardWorkspace')) {
      throw new Error('The workspace shell is unavailable.');
    }
    shell.dataset.workspacePage = 'insights';
    shell.querySelector('#boardTopNavbar')?.setAttribute('hidden', '');
    shell.querySelector('#appNavbar')?.setAttribute('hidden', '');
    shell.querySelectorAll('script').forEach(script => script.remove());
    document.body.replaceWith(document.importNode(shell, true));
    await import('./app.js');
  } catch (error) {
    console.error('Could not open Insights:', error);
    const message = document.getElementById('dashboardEntryMessage');
    const retry = document.getElementById('dashboardEntryRetry');
    if (message && retry) {
      message.textContent = 'Could not open Job Search Insights. Please retry.';
      retry.hidden = false;
      retry.addEventListener('click', () => window.location.reload(), { once: true });
    } else {
      const { WorkspaceLoading } = await import('./main/workspaceLoading.js');
      const loading = new WorkspaceLoading();
      loading.showError(loading.generation);
    }
  }
}

await openInsights();
