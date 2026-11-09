import { authService } from '../auth/firebaseAuth.js';
import { logoutAndRedirect } from '../auth/authNavigation.js';

const THEME_KEY = 'jubro_theme';

export function initBoardTopNavbar() {
  const topNav = document.getElementById('boardTopNavbar');
  if (!topNav) return null;

  const btnGuestSettings = document.getElementById('btnGuestSettings');
  const btnUserAccount = document.getElementById('btnUserAccount');
  const userAccountLabel = document.getElementById('userAccountLabel');
  const dropdown = document.getElementById('boardTopNavDropdown');
  const dropdownUserHeader = document.getElementById('dropdownUserHeader');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  const dropdownLogoutWrapper = document.getElementById('dropdownLogoutWrapper');
  const btnNavHome = document.getElementById('btnNavHome');
  const btnNavSettings = document.getElementById('btnNavSettings');
  const btnThemeLight = document.getElementById('btnThemeLight');
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnNavLogout = document.getElementById('btnNavLogout');

  let currentUser = null;

  function syncThemeUI(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {}
    const lightCheck = btnThemeLight?.querySelector('.theme-check');
    const darkCheck = btnThemeDark?.querySelector('.theme-check');
    lightCheck?.classList.toggle('hidden', isDark);
    darkCheck?.classList.toggle('hidden', !isDark);
  }

  function getActiveTrigger() {
    return currentUser ? btnUserAccount : btnGuestSettings;
  }

  function openDropdown() {
    if (!dropdown) return;
    const isDark = document.documentElement.classList.contains('dark');
    syncThemeUI(isDark ? 'dark' : 'light');
    dropdown.classList.remove('hidden');
    getActiveTrigger()?.setAttribute('aria-expanded', 'true');
    btnNavHome?.focus();
  }

  function closeDropdown() {
    if (!dropdown || dropdown.classList.contains('hidden')) return;
    dropdown.classList.add('hidden');
    btnGuestSettings?.setAttribute('aria-expanded', 'false');
    btnUserAccount?.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdown() {
    if (dropdown?.classList.contains('hidden')) {
      openDropdown();
    } else {
      closeDropdown();
    }
  }

  btnGuestSettings?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleDropdown();
  });

  btnUserAccount?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleDropdown();
  });

  btnThemeLight?.addEventListener('click', () => {
    syncThemeUI('light');
  });

  btnThemeDark?.addEventListener('click', () => {
    syncThemeUI('dark');
  });

  btnNavSettings?.addEventListener('click', async () => {
    closeDropdown();
    try {
      const { Auth } = await import('../auth/auth.js');
      if (!window.__jubroAuth) {
        window.__jubroAuth = new Auth();
      }
      window.__jubroAuth.openSettingsModal();
    } catch (error) {
      console.error('Failed to open settings modal:', error);
    }
  });

  btnNavLogout?.addEventListener('click', async () => {
    closeDropdown();
    try {
      await logoutAndRedirect();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dropdown && !dropdown.classList.contains('hidden')) {
      closeDropdown();
      getActiveTrigger()?.focus();
    }
  });

  const handleOutsideClick = (event) => {
    if (
      dropdown
      && !dropdown.classList.contains('hidden')
      && !dropdown.contains(event.target)
      && !btnGuestSettings?.contains(event.target)
      && !btnUserAccount?.contains(event.target)
    ) {
      closeDropdown();
    }
  };

  document.addEventListener('click', handleOutsideClick, true);
  document.addEventListener('pointerdown', handleOutsideClick, true);

  document.getElementById('btnImport')?.addEventListener('click', () => {
    closeDropdown();
  });

  document.getElementById('btnExport')?.addEventListener('click', () => {
    closeDropdown();
  });

  function resolveUserName(user) {
    if (!user) return 'Account';
    const name = (typeof user.displayName === 'string' && user.displayName.trim())
      ? user.displayName.trim()
      : '';
    return name || 'Account';
  }

  function updateAuthUI(user) {
    currentUser = user;
    if (user) {
      btnGuestSettings?.classList.add('hidden');
      btnGuestSettings?.setAttribute('hidden', '');
      btnUserAccount?.classList.remove('hidden');
      btnUserAccount?.removeAttribute('hidden');
      const name = resolveUserName(user);
      if (userAccountLabel) userAccountLabel.textContent = name;
      if (dropdownUserName) dropdownUserName.textContent = name;
      if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || '';
      dropdownUserHeader?.classList.remove('hidden');
      btnNavSettings?.classList.remove('hidden');
      dropdownLogoutWrapper?.classList.remove('hidden');
    } else {
      btnGuestSettings?.classList.remove('hidden');
      btnGuestSettings?.removeAttribute('hidden');
      btnUserAccount?.classList.add('hidden');
      btnUserAccount?.setAttribute('hidden', '');
      if (userAccountLabel) userAccountLabel.textContent = 'Account';
      if (dropdownUserName) dropdownUserName.textContent = 'Account';
      dropdownUserHeader?.classList.add('hidden');
      btnNavSettings?.classList.add('hidden');
      dropdownLogoutWrapper?.classList.add('hidden');
      closeDropdown();
    }
  }

  const currentTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  syncThemeUI(currentTheme);

  const initialUser = authService.getCurrentUser?.();
  if (initialUser) {
    updateAuthUI(initialUser);
  }

  authService.onAuthChange((user) => {
    updateAuthUI(user);
  });

  return {
    openDropdown,
    closeDropdown,
    toggleDropdown,
    syncThemeUI,
  };
}
