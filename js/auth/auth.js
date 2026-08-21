import { authService } from "./firebaseAuth.js";
import { Message } from "./message.js";
import { Storage } from "../storage/storage.js";
import { JSONService } from "../services/jsonService.js";

const THEME_KEY = 'jubro_theme';

export class Auth {
  constructor() {
    this.modal = null;
    this.mode = 'login';
    this.message = new Message();
    this.settingsSection = 'account';
    this.settingsReturnFocus = null;
    this.settingsBodyWasLocked = false;
    this.passwordUpdateInProgress = false;
    this.exportInProgress = false;
    this.jsonService = new JSONService();
    this.init();
  }

  init() {
    this.applySavedTheme();
    this.createModal();
    this.createForgotPasswordModal();
    this.createSettingsModal();
    this.createSyncConflictModal();
    this.createDropdown();
    authService.setConflictResolver((conflict) => this.confirmTrackerOverwrite(conflict));
    this.bindEvents();
    this.listenAuth();
  }

  getStoredTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' ? 'light' : 'dark';
  }

  setStoredTheme(theme) {
    localStorage.setItem(THEME_KEY, theme === 'light' ? 'light' : 'dark');
  }

  applyTheme(theme) {
    const isDark = theme === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    this.updateThemeToggle(isDark);
  }

  applySavedTheme() {
    const theme = this.getStoredTheme();
    this.setStoredTheme(theme);
    this.applyTheme(theme);
  }

  updateThemeToggle(isDark) {
    const icon = document.querySelector('#btnTheme i');
    const label = document.querySelector('#btnTheme span');
    const toggle = document.getElementById('themeToggle');
    const circle = document.getElementById('themeCircle');
    const guestTheme = document.getElementById('btnGuestTheme');
    const guestIcon = guestTheme?.querySelector('i');
    const guestLabel = guestTheme?.querySelector('span');

    icon?.classList.toggle('fa-moon', !isDark);
    icon?.classList.toggle('fa-sun', isDark);
    label && (label.textContent = isDark ? 'Light Mode' : 'Dark Mode');
    toggle?.classList.toggle('bg-gray-300', !isDark);
    toggle?.classList.toggle('bg-black', isDark);
    circle?.classList.toggle('translate-x-5', isDark);
    guestIcon?.classList.toggle('fa-moon', !isDark);
    guestIcon?.classList.toggle('fa-sun', isDark);
    guestLabel && (guestLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode');
    guestTheme?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  toggleTheme() {
    const nextTheme = this.getStoredTheme() === 'dark' ? 'light' : 'dark';
    this.setStoredTheme(nextTheme);
    this.applyTheme(nextTheme);
  }

  createDropdown() {
    const div = document.createElement('div');
    div.id = 'userDropdown';
    div.className = 'hidden fixed z-50 w-63 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl mt-2';

    div.innerHTML = `
      <div class="border-b border-gray-100 px-4 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <i class="fa-solid fa-user text-sm"></i>
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-400">
              Signed in as
            </p>

            <div id="userEmail" class="mt-1 truncate text-sm font-medium text-gray-700"></div>
          </div>
        </div>
      </div>

      <div class="p-2 space-y-1">

        <button
      id="btnTheme"
      type="button"
      class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100"
    >
      <div class="flex items-center gap-3">
        <i class="fa-solid fa-moon w-4 text-center text-gray-500"></i>
        <span>Dark Mode</span>
      </div>

      <div
        id="themeToggle"
        class="relative h-6 w-11 rounded-full bg-gray-300 transition"
      >
        <div
          id="themeCircle"
          class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition"
        ></div>
      </div>
    </button>

    <button
      id="btnSettings"
      type="button"
      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100"
    >
      <i class="fa-solid fa-gear w-4 text-center text-gray-500"></i>
      <span>Settings</span>
    </button>

    <div class="my-1 border-t border-gray-100"></div>

    <button
      id="btnLogout"
      type="button"
      class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
    >
      <i class="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i>
      <span>Logout</span>
    </button>

  </div>
`;

    document.body.appendChild(div);
    this.dropdown = div;
    this.updateThemeToggle(this.getStoredTheme() === 'dark');
  }

  listenAuth() {
    authService.onAuthChange((user) => {
      const btn = document.getElementById('btnSignIn');

      if (!btn) return;

      if (user) {
        const guestTheme = document.getElementById('btnGuestTheme');
        guestTheme?.classList.add('hidden');
        guestTheme?.classList.remove('inline-flex');

        btn.innerHTML = `
          <i class="fa-solid fa-user mr-2 shrink-0"></i>
          <span class="min-w-0 truncate">${user.displayName || 'Account'}</span>
        `;

        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleDropdown(btn, user);
        };
      } else {
        const guestTheme = document.getElementById('btnGuestTheme');
        guestTheme?.classList.remove('hidden');
        guestTheme?.classList.add('inline-flex');

        btn.innerHTML = `
          <i class="fa-solid fa-user mr-2"></i>
          Sign In
        `;

        btn.onclick = () => this.open();
        this.dropdown.classList.add('hidden');
      }
    });
  }

  toggleDropdown(btn, user) {
    const rect = btn.getBoundingClientRect();
    const dropdownWidth = Math.min(256, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 16));

    this.dropdown.style.top = rect.bottom + 8 + 'px';
    this.dropdown.style.left = left + 'px';

    const email = document.getElementById('userEmail');
    email.textContent = user.email;
    email.title = user.email;

    this.dropdown.classList.toggle('hidden');
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      const id = button?.id || e.target.id;
      const sectionButton = e.target.closest('[data-settings-section]');

      if (id === 'btnCloseAuth') this.close();
      if (id === 'btnSwitchMode') this.toggleMode();
      if (id === 'btnGoogle') this.googleLogin();
      if (id === 'btnForgotPassword') this.openForgotPassword();
      if (id === 'btnCloseForgotPassword') this.closeForgotPassword();
      if (id === 'btnTheme') this.toggleTheme();
      if (id === 'btnGuestTheme') this.toggleTheme();
      if (id === 'btnSettings') this.openSettingsModal();
      if (id === 'btnCloseSettings') this.closeSettingsModal();
      if (id === 'btnExportJubroData') this.exportAllJubroData();
      if (id === 'btnLogout') this.logout();
      if (id === 'btnTogglePassword') this.togglePassword('authPassword', 'btnTogglePassword');
      if (id === 'btnToggleConfirmPassword') this.togglePassword('authConfirmPassword', 'btnToggleConfirmPassword');
      if (id === 'btnToggleSettingsCurrentPassword') this.togglePassword('settingsCurrentPassword', 'btnToggleSettingsCurrentPassword');
      if (id === 'btnToggleSettingsNewPassword') this.togglePassword('settingsNewPassword', 'btnToggleSettingsNewPassword');
      if (id === 'btnToggleSettingsConfirmPassword') this.togglePassword('settingsConfirmPassword', 'btnToggleSettingsConfirmPassword');

      if (sectionButton && this.settingsModal.contains(sectionButton)) {
        this.setSettingsSection(sectionButton.dataset.settingsSection);
      }

      if (e.target === this.modal) this.close();
      if (e.target === this.forgotPasswordModal) this.closeForgotPassword();
      if (e.target === this.settingsModal) this.closeSettingsModal();

      if (!this.dropdown.contains(e.target) && e.target.id !== 'btnSignIn') {
        this.dropdown.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.settingsModal.classList.contains('hidden')) {
        this.closeSettingsModal();
      }
    });

    this.modal.addEventListener('submit', (e) => {
      if (e.target.id !== 'authForm') return;

      e.preventDefault();
      this.submit();
    });

    this.forgotPasswordModal.addEventListener('submit', (e) => {
      if (e.target.id !== 'forgotPasswordForm') return;

      e.preventDefault();
      this.submitForgotPassword();
    });

    this.settingsModal.addEventListener('submit', (e) => {
      if (e.target.id !== 'settingsPasswordForm') return;

      this.changeUserPassword(e);
    });
  }

  async logout() {
    await authService.logout();
    this.dropdown.classList.add('hidden');
  }

  createSettingsModal() {
    const div = document.createElement('div');

    div.id = 'settingsModal';
    div.className = 'hidden fixed inset-0 z-[60] items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-6';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.setAttribute('aria-labelledby', 'settings-title');
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = `
      <div class="settings-modal-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-5 sm:px-7 sm:py-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Account preferences</p>
            <h2 id="settings-title" class="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Settings</h2>
            <p class="mt-2 max-w-xl text-sm leading-6 text-gray-500">Manage your account preferences and review how your Jubro data is handled.</p>
          </div>

          <button id="btnCloseSettings" type="button" aria-label="Close settings"
            class="settings-close-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav class="settings-modal-navigation shrink-0 border-b border-gray-200 p-3 md:w-60 md:border-b-0 md:border-r md:p-4" aria-label="Settings sections">
            <div class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              <button id="settings-nav-account" type="button" data-settings-section="account" aria-controls="settings-panel-account" aria-current="page"
                class="settings-nav-button min-w-max rounded-xl bg-blue-50 px-3 py-3 text-left text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0">
                <span class="flex items-center gap-3"><i class="fa-solid fa-user w-4 text-center" aria-hidden="true"></i>Account</span>
              </button>

              <button id="settings-nav-sync" type="button" data-settings-section="sync" aria-controls="settings-panel-sync"
                class="settings-nav-button min-w-max rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0">
                <span class="flex items-center gap-3"><i class="fa-solid fa-cloud-arrow-up w-4 text-center" aria-hidden="true"></i>Data &amp; Sync</span>
              </button>

              <button id="settings-nav-data" type="button" data-settings-section="data" aria-controls="settings-panel-data"
                class="settings-nav-button min-w-max rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0">
                <span class="flex items-center gap-3"><i class="fa-solid fa-database w-4 text-center" aria-hidden="true"></i>Data Management</span>
              </button>

              <button id="settings-nav-privacy" type="button" data-settings-section="privacy" aria-controls="settings-panel-privacy"
                class="settings-nav-button min-w-max rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0">
                <span class="flex items-center gap-3"><i class="fa-solid fa-shield-halved w-4 text-center" aria-hidden="true"></i>Privacy</span>
              </button>

              <button id="settings-nav-danger" type="button" data-settings-section="danger" aria-controls="settings-panel-danger"
                class="settings-nav-button min-w-max rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0">
                <span class="flex items-center gap-3"><i class="fa-solid fa-triangle-exclamation w-4 text-center" aria-hidden="true"></i>Danger Zone</span>
              </button>
            </div>
          </nav>

          <div id="settingsPanels" class="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            <section id="settings-panel-account" data-settings-panel="account" role="tabpanel" aria-labelledby="settings-nav-account">
              <div class="max-w-2xl space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Account</h3>
                  <p class="mt-1 text-sm leading-6 text-gray-500">Review your account details and update your password.</p>
                </div>

                <div class="settings-card rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <label for="settingsEmail" class="block text-sm font-semibold text-gray-900">Email address</label>
                  <input id="settingsEmail" type="email" readonly placeholder="Signed-in account"
                    class="settings-input mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none" />
                  <p class="mt-2 text-xs leading-5 text-gray-500">Your email is used to identify your Jubro account.</p>
                </div>

                <div class="border-t border-gray-200 pt-6">
                  <h4 class="text-base font-semibold text-gray-900">Change Password</h4>
                  <p class="mt-1 text-sm leading-6 text-gray-500">Re-enter your current password to securely set a new one.</p>

                  <form id="settingsPasswordForm" class="mt-5 space-y-4" novalidate>
                    <div>
                      <label for="settingsCurrentPassword" class="block text-sm font-medium text-gray-700">Current Password</label>
                      <div class="relative mt-2">
                        <input id="settingsCurrentPassword" type="password" autocomplete="current-password"
                          aria-describedby="settingsPasswordMessage"
                          class="settings-input w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        <button id="btnToggleSettingsCurrentPassword" type="button" aria-label="Show current password"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                          <i class="fa-solid fa-eye" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label for="settingsNewPassword" class="block text-sm font-medium text-gray-700">New Password</label>
                      <div class="relative mt-2">
                        <input id="settingsNewPassword" type="password" autocomplete="new-password"
                          aria-describedby="settingsPasswordMessage"
                          class="settings-input w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        <button id="btnToggleSettingsNewPassword" type="button" aria-label="Show new password"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                          <i class="fa-solid fa-eye" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label for="settingsConfirmPassword" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <div class="relative mt-2">
                        <input id="settingsConfirmPassword" type="password" autocomplete="new-password"
                          aria-describedby="settingsPasswordMessage"
                          class="settings-input w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        <button id="btnToggleSettingsConfirmPassword" type="button" aria-label="Show confirmation password"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                          <i class="fa-solid fa-eye" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <p id="settingsPasswordMessage" class="min-h-5 text-sm" role="status" aria-live="polite"></p>

                    <button id="btnChangePassword" type="submit" class="theme-create-button inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60">
                      Change Password
                    </button>
                  </form>
                </div>
              </div>
            </section>

            <section id="settings-panel-sync" data-settings-panel="sync" role="tabpanel" aria-labelledby="settings-nav-sync" hidden>
              <div class="max-w-2xl space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Data &amp; Sync</h3>
                  <p class="mt-1 text-sm leading-6 text-gray-500">See whether your Jubro data is connected to your account.</p>
                </div>

                <div class="settings-card rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-semibold text-gray-900">Account sync status</h4>
                      <p class="mt-1 text-sm leading-6 text-gray-500">Your Jubro data is synced with your account.</p>
                    </div>
                    <span class="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                      <span class="h-2 w-2 rounded-full bg-green-500" aria-hidden="true"></span>Synced
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section id="settings-panel-data" data-settings-panel="data" role="tabpanel" aria-labelledby="settings-nav-data" hidden>
              <div class="max-w-2xl space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Data Management</h3>
                  <p class="mt-1 text-sm leading-6 text-gray-500">Manage a copy of your tracker data or clear it from Jubro.</p>
                </div>

                <div class="space-y-3">
                  <div class="settings-action-row flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-gray-900">Export your data</h4>
                      <p class="mt-1 text-sm leading-6 text-gray-500">Download a backup of all your trackers and applications.</p>
                    </div>
                    <button id="btnExportJubroData" type="button" aria-describedby="settingsDataMessage" class="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60">Export Data</button>
                  </div>
                  <div class="settings-action-row flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-gray-900">Import Data</h4>
                      <p class="mt-1 text-sm leading-6 text-gray-500">Import your copy of your saved trackers and applications.</p>
                    </div>
                    <button type="button" class="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Import Data</button>
                  </div>

                  <div class="settings-action-row flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 class="text-sm font-semibold text-red-800">Delete Application Data</h4>
                      <p class="mt-1 text-sm leading-6 text-red-700">Remove saved application data from Jubro.</p>
                    </div>
                    <button type="button" class="settings-danger-button inline-flex shrink-0 items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Delete Application Data</button>
                  </div>
                </div>
                <p id="settingsDataMessage" class="min-h-5 text-sm" role="status" aria-live="polite"></p>
              </div>
            </section>

            <section id="settings-panel-privacy" data-settings-panel="privacy" role="tabpanel" aria-labelledby="settings-nav-privacy" hidden>
              <div class="max-w-2xl space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Privacy</h3>
                  <p class="mt-1 text-sm leading-6 text-gray-500">Learn how Jubro handles your account and tracker information.</p>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <a href="/privacy" class="settings-link-card rounded-2xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    <span class="flex items-center justify-between gap-3">
                      <span><span class="block text-sm font-semibold text-gray-900">Privacy Policy</span><span class="mt-1 block text-xs text-gray-500">How Jubro handles information</span></span>
                      <i class="fa-solid fa-arrow-up-right-from-square text-sm text-blue-600" aria-hidden="true"></i>
                    </span>
                  </a>

                  <a href="/terms" class="settings-link-card rounded-2xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    <span class="flex items-center justify-between gap-3">
                      <span><span class="block text-sm font-semibold text-gray-900">Terms of Service</span><span class="mt-1 block text-xs text-gray-500">Rules for using Jubro</span></span>
                      <i class="fa-solid fa-arrow-up-right-from-square text-sm text-blue-600" aria-hidden="true"></i>
                    </span>
                  </a>
                </div>
              </div>
            </section>

            <section id="settings-panel-danger" data-settings-panel="danger" role="tabpanel" aria-labelledby="settings-nav-danger" hidden>
              <div class="max-w-2xl space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-red-800">Danger Zone</h3>
                  <p class="mt-1 text-sm leading-6 text-gray-500">These actions can permanently affect your Jubro account.</p>
                </div>

                <div class="settings-danger-panel rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    </div>
                    <div>
                      <h4 class="text-sm font-semibold text-red-800">Delete Account</h4>
                      <p class="mt-1 text-sm leading-6 text-red-700">Permanently delete your Jubro account and all associated data.</p>
                    </div>
                  </div>
                  <button type="button" class="settings-danger-button mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Delete Account</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    this.settingsModal = div;
    this.setSettingsSection(this.settingsSection);
  }

  openSettingsModal() {
    if (this.settingsModal.classList.contains('hidden')) {
      this.settingsReturnFocus = document.activeElement;
      this.settingsBodyWasLocked = document.body.classList.contains('overflow-hidden');
    }

    this.dropdown.classList.add('hidden');
    this.settingsModal.classList.remove('hidden');
    this.settingsModal.classList.add('flex');
    this.settingsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');

    const currentUser = authService.getCurrentUser();
    const email = currentUser?.email || document.getElementById('userEmail')?.textContent || '';
    const emailInput = document.getElementById('settingsEmail');

    if (emailInput) emailInput.value = email;

    this.setSettingsSection(this.settingsSection);
    window.requestAnimationFrame(() => document.getElementById('btnCloseSettings')?.focus());
  }

  closeSettingsModal() {
    this.settingsModal.classList.add('hidden');
    this.settingsModal.classList.remove('flex');
    this.settingsModal.setAttribute('aria-hidden', 'true');

    if (!this.settingsBodyWasLocked) {
      document.body.classList.remove('overflow-hidden');
    }

    const returnFocus = this.settingsReturnFocus;
    this.settingsReturnFocus = null;
    returnFocus?.focus?.();
  }

  setSettingsSection(sectionName) {
    const sections = ['account', 'sync', 'data', 'privacy', 'danger'];
    const activeSection = sections.includes(sectionName) ? sectionName : 'account';
    const activeClasses = ['bg-blue-50', 'font-semibold', 'text-blue-700', 'shadow-sm'];
    const inactiveClasses = ['font-medium', 'text-gray-600', 'hover:bg-gray-50', 'hover:text-gray-900'];

    this.settingsSection = activeSection;

    this.settingsModal.querySelectorAll('[data-settings-section]').forEach((button) => {
      const isActive = button.dataset.settingsSection === activeSection;

      button.classList.remove(...activeClasses, ...inactiveClasses);
      button.classList.add(...(isActive ? activeClasses : inactiveClasses));

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    this.settingsModal.querySelectorAll('[data-settings-panel]').forEach((panel) => {
      const isActive = panel.dataset.settingsPanel === activeSection;

      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
    });
  }

  validatePasswordForm() {
    const currentPassword = document.getElementById('settingsCurrentPassword')?.value || '';
    const newPassword = document.getElementById('settingsNewPassword')?.value || '';
    const confirmPassword = document.getElementById('settingsConfirmPassword')?.value || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { valid: false, message: 'Please fill in all password fields.' };
    }

    if (newPassword !== confirmPassword) {
      return { valid: false, message: 'New passwords do not match.' };
    }

    if (newPassword.length < 6) {
      return { valid: false, message: 'Your new password must be at least 6 characters.' };
    }

    if (newPassword === currentPassword) {
      return { valid: false, message: 'Your new password must be different from your current password.' };
    }

    return {
      valid: true,
      currentPassword,
      newPassword
    };
  }

  showPasswordMessage(text, type = 'error') {
    const message = document.getElementById('settingsPasswordMessage');

    if (!message) return;

    message.textContent = text;
    message.classList.remove('text-red-700', 'text-green-700');

    if (text) {
      message.classList.add(type === 'success' ? 'text-green-700' : 'text-red-700');
    }
  }

  setPasswordLoadingState(isLoading) {
    const form = document.getElementById('settingsPasswordForm');
    const button = document.getElementById('btnChangePassword');

    if (!form || !button) return;

    form.setAttribute('aria-busy', String(isLoading));
    form.querySelectorAll('input, button').forEach((control) => {
      control.disabled = isLoading;
    });
    button.textContent = isLoading ? 'Updating...' : 'Change Password';
  }

  getFriendlyPasswordError(error) {
    const messages = {
      'auth/invalid-credential': 'Your current password is incorrect.',
      'auth/wrong-password': 'Your current password is incorrect.',
      'auth/user-mismatch': 'Your current password is incorrect.',
      'auth/weak-password': 'Your new password must be at least 6 characters.',
      'auth/no-current-user': 'No signed-in account was found. Please sign in again.',
      'auth/no-email': 'This account cannot change its password from Settings.',
      'auth/password-provider-required': 'Password changes are available for email and password accounts.',
      'auth/requires-recent-login': 'Please sign in again before changing your password.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/operation-not-allowed': 'Password changes are not available for this account.'
    };

    return messages[error?.code] || 'Something went wrong. Please try again.';
  }

  async changeUserPassword(event) {
    event.preventDefault();

    if (this.passwordUpdateInProgress) return;

    const validation = this.validatePasswordForm();

    if (!validation.valid) {
      this.showPasswordMessage(validation.message);
      return;
    }

    if (!authService.getCurrentUser()) {
      this.showPasswordMessage('No signed-in account was found. Please sign in again.');
      return;
    }

    this.passwordUpdateInProgress = true;
    this.showPasswordMessage('');
    this.setPasswordLoadingState(true);

    try {
      await authService.changePassword(validation.currentPassword, validation.newPassword);
      document.getElementById('settingsPasswordForm')?.reset();
      this.showPasswordMessage('Password updated successfully.', 'success');
    } catch (error) {
      this.showPasswordMessage(this.getFriendlyPasswordError(error));
    } finally {
      this.passwordUpdateInProgress = false;
      this.setPasswordLoadingState(false);
    }
  }

  getAllUserTrackers() {
    const state = Storage.load();

    if (!state || typeof state !== 'object' || !state.data || typeof state.data !== 'object') {
      throw new Error('Unable to read Jubro tracker data.');
    }

    return state;
  }

  showDataMessage(text, type = 'error') {
    const message = document.getElementById('settingsDataMessage');

    if (!message) return;

    message.textContent = text;
    message.classList.remove('text-red-700', 'text-green-700');

    if (text) {
      message.classList.add(type === 'success' ? 'text-green-700' : 'text-red-700');
    }
  }

  setExportLoadingState(isLoading) {
    const button = document.getElementById('btnExportJubroData');

    if (!button) return;

    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
    button.textContent = isLoading ? 'Exporting...' : 'Export Data';
  }

  async exportAllJubroData() {
    if (this.exportInProgress) return;

    this.exportInProgress = true;
    this.showDataMessage('');
    this.setExportLoadingState(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const state = this.getAllUserTrackers();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `jubro-backup-${date}.json`;

      this.jsonService.exportAll(state, filename);

      const trackerCount = Object.keys(state.data).length;
      const message = trackerCount
        ? 'Your Jubro backup is ready to download.'
        : 'No trackers were found. An empty Jubro backup was downloaded.';

      this.showDataMessage(message, 'success');
    } catch (error) {
      console.error('Jubro data export failed:', error);
      this.showDataMessage('Something went wrong while exporting your data. Please try again.');
    } finally {
      this.exportInProgress = false;
      this.setExportLoadingState(false);
    }
  }

  open() {
    this.modal.classList.remove('hidden');
  }

  close() {
    this.modal.classList.add('hidden');
  }

  openForgotPassword() {
    const email = document.getElementById('authEmail')?.value.trim() || '';
    const resetEmail = document.getElementById('forgotPasswordEmail');

    if (resetEmail) resetEmail.value = email;
    document.getElementById('forgotPasswordMessage').textContent = '';
    this.modal.classList.add('hidden');
    this.forgotPasswordModal.classList.remove('hidden');
    resetEmail?.focus();
  }

  closeForgotPassword() {
    this.forgotPasswordModal.classList.add('hidden');
  }

  async submitForgotPassword() {
    const email = document.getElementById('forgotPasswordEmail').value.trim();
    const message = document.getElementById('forgotPasswordMessage');

    message.textContent = '';
    message.className = 'mt-3 min-h-5 text-sm text-red-500';

    if (!email) {
      message.textContent = 'Enter your email address.';
      return;
    }

    try {
      await authService.resetPassword(email);
      message.className = 'mt-3 min-h-5 text-sm text-green-600';
      message.textContent = 'Password reset link sent. Check your email.';
    } catch (err) {
      message.textContent = err.message;
    }
  }

  createSyncConflictModal() {
    const div = document.createElement('div');

    div.id = 'syncConflictModal';
    div.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4';

    div.innerHTML = `
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-xl font-semibold text-gray-900">
          Tracker already exists
        </h2>

        <p id="syncConflictText" class="mt-3 leading-7 text-gray-600"></p>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            id="btnKeepCloudTracker"
            type="button"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-100"
          >
            Keep Cloud
          </button>

          <button
            id="btnOverwriteCloudTracker"
            type="button"
            class="theme-create-button flex-1 rounded-xl bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Overwrite
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    this.syncConflictModal = div;
    this.syncConflictText = div.querySelector('#syncConflictText');
  }

  confirmTrackerOverwrite({ localTracker, firebaseTracker }) {
    const localTitle = localTracker?.title || 'Untitled tracker';
    const cloudTitle = firebaseTracker?.title || localTitle;

    this.syncConflictText.textContent = `"${localTitle}" already exists in Firebase as "${cloudTitle}", but the entries do not match. Do you want to overwrite the Firebase tracker with this local tracker?`;
    this.syncConflictModal.classList.remove('hidden');

    return new Promise((resolve) => {
      const keepCloud = document.getElementById('btnKeepCloudTracker');
      const overwriteCloud = document.getElementById('btnOverwriteCloudTracker');

      const cleanup = (shouldOverwrite) => {
        keepCloud.removeEventListener('click', keepHandler);
        overwriteCloud.removeEventListener('click', overwriteHandler);
        this.syncConflictModal.classList.add('hidden');
        resolve(shouldOverwrite);
      };

      const keepHandler = () => cleanup(false);
      const overwriteHandler = () => cleanup(true);

      keepCloud.addEventListener('click', keepHandler);
      overwriteCloud.addEventListener('click', overwriteHandler);
    });
  }

  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';

    const title = document.getElementById('authTitle');
    const btn = document.getElementById('btnAuthSubmit');
    const text = document.getElementById('authSwitchText');
    const switchBtn = document.getElementById('btnSwitchMode');
    const confirm = document.getElementById('authConfirmWrapper');

    if (this.mode === 'login') {
      title.textContent = 'Sign In';
      btn.textContent = 'Sign In';
      text.textContent = "Don't have an account?";
      switchBtn.textContent = 'Register';
      confirm.classList.add('hidden');
      document.getElementById('forgotPasswordWrapper')?.classList.remove('hidden');
    } else {
      title.textContent = 'Register';
      btn.textContent = 'Create Account';
      text.textContent = "Already have an account?";
      switchBtn.textContent = 'Sign In';
      confirm.classList.remove('hidden');
      document.getElementById('forgotPasswordWrapper')?.classList.add('hidden');
    }
  }

  togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const icon = button?.querySelector('i');

    if (!input || !icon) return;

    const isHidden = input.type === 'password';

    input.type = isHidden ? 'text' : 'password';
    icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(isHidden));
  }

  async submit() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const confirm = document.getElementById('authConfirmPassword').value.trim();

  this.message.clear();

  if (!email || !password) {
    return this.message.show('Fill all fields');
  }

  try {
      if (this.mode === 'register') {
        if (password !== confirm) {
          return this.message.show('Passwords do not match');
        }
  
        await authService.register(email, password);
        this.message.show('Account created!', 'success');
      } else {
        await authService.login(email, password);
        this.message.show('Logged in successfully!', 'success');
      }
  
      setTimeout(() => this.close(), 1000);
  
    } catch (err) {
      this.message.show(this.getFriendlyAuthError(err.code));
    }
  }
  
  async googleLogin() {
    this.message.clear();
  
    try {
      await authService.loginWithGoogle();
      this.message.show('Logged in with Google!', 'success');
  
      setTimeout(() => this.close(), 1000);
  
    } catch (err) {
      this.message.show(this.getFriendlyAuthError(err.code));
    }
  }

  getFriendlyAuthError(code) {
    const messages = {
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/user-not-found': 'No account was found with that email address.',
      'auth/wrong-password': 'Incorrect email or password.',
      'auth/email-already-in-use': 'An account already exists with this email address.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Your password must be at least 6 characters long.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.'
    };

    return messages[code] || 'Unable to sign in right now. Please try again.';
  }

  createForgotPasswordModal() {
    const div = document.createElement('div');

    div.id = 'forgotPasswordModal';
    div.className = 'hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    div.style.zIndex = '60';

    div.innerHTML = `
      <div class="bg-white p-6 rounded-2xl w-full max-w-md relative">
        <button id="btnCloseForgotPassword" type="button"
          class="absolute top-3 right-3 text-gray-500 text-xl">
          &times;
        </button>

        <h2 class="text-xl font-semibold mb-2 text-center">
          Reset Password
        </h2>

        <p class="mb-4 text-center text-sm text-gray-500">
          Enter your email and we'll send a password reset link.
        </p>

        <form id="forgotPasswordForm">
          <input id="forgotPasswordEmail" type="email" placeholder="Email"
            class="w-full border p-3 rounded-xl outline-none" />

          <p id="forgotPasswordMessage" class="mt-3 min-h-5 text-sm text-red-500"></p>

          <button type="submit"
            class="theme-create-button mt-3 w-full py-2 bg-black text-white rounded-xl">
            Send Reset Link
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(div);
    this.forgotPasswordModal = div;
  }

  createModal() {
    const div = document.createElement('div');

    div.id = 'authModal';
    div.className = 'hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50';

    div.innerHTML = `
      <div class="bg-white p-6 rounded-2xl w-full max-w-md relative">

        <button id="btnCloseAuth" type="button"
          class="absolute top-3 right-3 text-gray-500 text-xl">
          ×
        </button>

        <h2 id="authTitle" class="text-xl font-semibold mb-4 text-center">
          Sign In
        </h2>

        <button id="btnGoogle" type="button"
          class="w-full flex items-center justify-center gap-2 border py-2 rounded-xl mb-4 hover:bg-gray-50">
          <i class="fa-brands fa-google"></i>
          Continue with Google
        </button>

        <div class="flex items-center gap-2 mb-4">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-gray-400 text-sm">or</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <form id="authForm">
          <input id="authEmail" type="email" placeholder="Email"
            class="w-full border p-3 rounded-xl mb-3 outline-none" />

          <div class="relative mb-3">
            <input id="authPassword" type="password" placeholder="Password"
              class="w-full border p-3 pr-11 rounded-xl outline-none" />
            <button id="btnTogglePassword" type="button" aria-label="Show password"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>

          <div id="forgotPasswordWrapper" class="-mt-1 mb-3 flex justify-end">
            <button id="btnForgotPassword" type="button" class="text-sm font-medium text-black hover:underline">
              Forgot password?
            </button>
          </div>

          <div id="authConfirmWrapper" class="relative mb-4 hidden">
            <input id="authConfirmPassword" type="password" placeholder="Confirm Password"
              class="w-full border p-3 pr-11 rounded-xl outline-none" />
            <button id="btnToggleConfirmPassword" type="button" aria-label="Show password"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>

          <button id="btnAuthSubmit" type="submit"
            class="theme-create-button w-full py-2 bg-black text-white rounded-xl mb-3">
            Sign In
          </button>
        </form>

        <p class="text-sm text-center text-gray-500">
          <span id="authSwitchText">Don't have an account?</span>
          <button id="btnSwitchMode" type="button" class="text-black font-medium ml-1">
            Register
          </button>
        </p>

      </div>
    `;

    document.body.appendChild(div);
    this.modal = div;
    
    const container = div.querySelector('.bg-white');
    this.message.init(container);
  }
}
