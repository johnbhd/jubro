import { TrackerApp } from './main/main.js';
import { authService } from './auth/firebaseAuth.js';
import { setupStorageNotice } from './storage/storageNotice.js';
import { initBoardTopNavbar } from './main/boardNav.js';
import { showFlashToast } from './toast.js';
import { WorkspaceLoading } from './main/workspaceLoading.js';

const THEME_KEY = 'jubro_theme';

function applySavedTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  const theme = storedTheme === 'light' ? 'light' : 'dark';

  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("APP LOADED");

  if (document.getElementById('appBody')) {
    const loading = new WorkspaceLoading();
    const initialToken = loading.begin();
    let trackerApp;

    try {
      applySavedTheme();
      setupStorageNotice();
      initBoardTopNavbar();
      await authService.waitForWorkspace();
      trackerApp = new TrackerApp();
      trackerApp.workspaceLoading = loading;
      loading.finish(initialToken);
    } catch (error) {
      console.error('Could not initialize workspace:', error);
      loading.showError(initialToken);
      return;
    }

    let renderedUserId = authService.getCurrentUser()?.uid || null;
    let authGeneration = 0;
    showFlashToast();

    document.addEventListener('tracker:sync-complete', () => {
      if (!loading.isLoading && renderedUserId === (authService.getCurrentUser()?.uid || null)) {
        trackerApp.reloadStateFromStorage({ ignoreURL: true });
      }
    });

    authService.onAuthChange((user, resolution) => {
      if (
        resolution.generation !== authGeneration
        || (user?.uid || null) !== (authService.getCurrentUser()?.uid || null)
        || (resolution.token !== null && !loading.isCurrent(resolution.token))
      ) {
        return;
      }

      try {
        trackerApp.reloadStateFromStorage();
        renderedUserId = user?.uid || null;
        if (resolution.token !== null) {
          loading.finish(resolution.token);
        }
      } catch (error) {
        console.error('Could not render workspace:', error);
        loading.showError(resolution.token ?? loading.generation);
      }
    }, {
      onPending(user) {
        authGeneration += 1;
        let token = null;

        if (renderedUserId !== (user?.uid || null) || loading.isLoading) {
          token = loading.begin();
          trackerApp.closeSearchSpecificUI();
        }

        return { generation: authGeneration, token };
      },
    });
  } else {
    applySavedTheme();
    setupStorageNotice();
  }
});
