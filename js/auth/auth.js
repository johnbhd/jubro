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
    this.createDropdown();
    this.bindEvents();
    this.listenAuth();
  }

  getStoredTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'dark' ? 'dark' : 'light';
  }

  setStoredTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
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

    icon?.classList.toggle('fa-moon', !isDark);
    icon?.classList.toggle('fa-sun', isDark);
    label && (label.textContent = isDark ? 'Light Mode' : 'Dark Mode');
    toggle?.classList.toggle('bg-gray-300', !isDark);
    toggle?.classList.toggle('bg-black', isDark);
    circle?.classList.toggle('translate-x-5', isDark);
    guestIcon?.classList.toggle('fa-moon', !isDark);
    guestIcon?.classList.toggle('fa-sun', isDark);
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
      if (id === 'btnTheme') this.toggleTheme();
      if (id === 'btnGuestTheme') this.toggleTheme();
      if (id === 'btnLogout') this.logout();
      if (id === 'btnTogglePassword') this.togglePassword('authPassword', 'btnTogglePassword');
      if (id === 'btnToggleConfirmPassword') this.togglePassword('authConfirmPassword', 'btnToggleConfirmPassword');

      if (e.target === this.modal) this.close();

      if (!this.dropdown.contains(e.target) && e.target.id !== 'btnSignIn') {
        this.dropdown.classList.add('hidden');
      }
    });

    this.modal.addEventListener('submit', (e) => {
      if (e.target.id !== 'authForm') return;

      e.preventDefault();
      this.submit();
    });
  }

  async logout() {
    await authService.logout();
    this.dropdown.classList.add('hidden');
  }

  open() {
    this.modal.classList.remove('hidden');
  }

  close() {
    this.modal.classList.add('hidden');
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
    } else {
      title.textContent = 'Register';
      btn.textContent = 'Create Account';
      text.textContent = "Already have an account?";
      switchBtn.textContent = 'Sign In';
      confirm.classList.remove('hidden');
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
      this.message.show(err.message);
    }
  }
  
  async googleLogin() {
    this.message.clear();
  
    try {
      await authService.loginWithGoogle();
      this.message.show('Logged in with Google!', 'success');
  
      setTimeout(() => this.close(), 1000);
  
    } catch (err) {
      this.message.show(err.message);
    }
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
