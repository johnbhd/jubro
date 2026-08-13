import { authService } from "./firebaseAuth.js";
import { Message } from "./message.js";

const THEME_KEY = 'jubro_theme';

export class Auth {
  constructor() {
    this.modal = null;
    this.mode = 'login';
    this.message = new Message();
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

      if (id === 'btnCloseAuth') this.close();
      if (id === 'btnSwitchMode') this.toggleMode();
      if (id === 'btnGoogle') this.googleLogin();
      if (id === 'btnForgotPassword') this.openForgotPassword();
      if (id === 'btnCloseForgotPassword') this.closeForgotPassword();
      if (id === 'btnTheme') this.toggleTheme();
      if (id === 'btnGuestTheme') this.toggleTheme();
      if (id === 'btnSettings') this.openSettingsModal();
      if (id === 'btnCloseSettings') this.closeSettingsModal();
      if (id === 'btnLogout') this.logout();
      if (id === 'btnTogglePassword') this.togglePassword('authPassword', 'btnTogglePassword');
      if (id === 'btnToggleConfirmPassword') this.togglePassword('authConfirmPassword', 'btnToggleConfirmPassword');

      if (e.target === this.modal) this.close();
      if (e.target === this.forgotPasswordModal) this.closeForgotPassword();
      if (e.target === this.settingsModal) this.closeSettingsModal();

      if (!this.dropdown.contains(e.target) && e.target.id !== 'btnSignIn') {
        this.dropdown.classList.add('hidden');
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
  }

  async logout() {
    await authService.logout();
    this.dropdown.classList.add('hidden');
  }

  createSettingsModal() {
    const div = document.createElement('div');

    div.id = 'settingsModal';
    div.className = 'hidden fixed inset-0 z-[60] items-center justify-center bg-black/50 p-4';
    div.innerHTML = `
      <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <button id="btnCloseSettings" type="button" aria-label="Close settings"
          class="absolute right-3 top-3 text-xl text-gray-500 hover:text-gray-900">
          &times;
        </button>

        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <i class="fa-solid fa-screwdriver-wrench text-2xl"></i>
        </div>
        <h2 class="text-xl font-semibold text-gray-900">Settings</h2>
        <p class="mt-2 text-sm text-gray-500">This feature is under development.</p>
      </div>
    `;

    document.body.appendChild(div);
    this.settingsModal = div;
  }

  openSettingsModal() {
    this.dropdown.classList.add('hidden');
    this.settingsModal.classList.remove('hidden');
    this.settingsModal.classList.add('flex');
  }

  closeSettingsModal() {
    this.settingsModal.classList.add('hidden');
    this.settingsModal.classList.remove('flex');
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
