import { TrackerApp } from './main/main.js';
import { authService } from './auth/firebaseAuth.js';
import { setupStorageNotice } from './storage/storageNotice.js';

const THEME_KEY = 'jubro_theme';

function applySavedTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  const theme = storedTheme === 'light' ? 'light' : 'dark';

  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("APP LOADED");

  applySavedTheme();
  setupStorageNotice();

  if (document.getElementById('appBody')) {
    await authService.waitForWorkspace();
    const trackerApp = new TrackerApp();

    authService.onAuthChange(() => {
      trackerApp.reloadStateFromStorage();
    });
  }
});
