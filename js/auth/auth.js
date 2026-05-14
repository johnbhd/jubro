import { authService } from "./firebaseAuth.js";
import { Message } from "./message.js";

export class Auth {
  constructor() {
    this.modal = null;
    this.mode = 'login';
    this.message = new Message();
    this.init();
  }

  init() {
    this.createModal();
    this.createDropdown();
    this.bindEvents();
    this.listenAuth();
  }

  createDropdown() {
    const div = document.createElement('div');
    div.id = 'userDropdown';
    div.className = 'hidden absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow z-50';

    div.innerHTML = `
      <div id="userEmail" class="px-4 py-2 text-sm text-gray-500 border-b"></div>
      <button id="btnLogout" class="w-full text-left px-4 py-2 hover:bg-gray-100">
        Logout
      </button>
    `;

    document.body.appendChild(div);
    this.dropdown = div;
  }

  listenAuth() {
    authService.onAuthChange((user) => {
      const btn = document.getElementById('btnSignIn');

      if (!btn) return;

      if (user) {
        btn.innerHTML = `
          <i class="fa-solid fa-user mr-2"></i>
          ${user.displayName || 'Account'}
        `;

        btn.onclick = (e) => {
          e.stopPropagation();
          this.toggleDropdown(btn, user);
        };
      } else {
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

    this.dropdown.style.top = rect.bottom + 'px';
    this.dropdown.style.left = rect.right - 192 + 'px';

    document.getElementById('userEmail').textContent = user.email;

    this.dropdown.classList.toggle('hidden');
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const id = e.target.id;

      if (id === 'btnCloseAuth') this.close();
      if (id === 'btnAuthSubmit') this.submit();
      if (id === 'btnSwitchMode') this.toggleMode();
      if (id === 'btnGoogle') this.googleLogin();
      if (id === 'btnLogout') this.logout();

      if (e.target === this.modal) this.close();

      if (!this.dropdown.contains(e.target) && e.target.id !== 'btnSignIn') {
        this.dropdown.classList.add('hidden');
      }
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
    const confirm = document.getElementById('authConfirmPassword');

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

        <button id="btnCloseAuth"
          class="absolute top-3 right-3 text-gray-500 text-xl">
          ×
        </button>

        <h2 id="authTitle" class="text-xl font-semibold mb-4 text-center">
          Sign In
        </h2>

        <button id="btnGoogle"
          class="w-full flex items-center justify-center gap-2 border py-2 rounded-xl mb-4 hover:bg-gray-50">
          <i class="fa-brands fa-google"></i>
          Continue with Google
        </button>

        <div class="flex items-center gap-2 mb-4">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-gray-400 text-sm">or</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <input id="authEmail" type="email" placeholder="Email"
          class="w-full border p-3 rounded-xl mb-3 outline-none" />

        <input id="authPassword" type="password" placeholder="Password"
          class="w-full border p-3 rounded-xl mb-3 outline-none" />

        <input id="authConfirmPassword" type="password" placeholder="Confirm Password"
          class="w-full border p-3 rounded-xl mb-4 outline-none hidden" />

        <button id="btnAuthSubmit"
          class="w-full py-2 bg-black text-white rounded-xl mb-3">
          Sign In
        </button>

        <p class="text-sm text-center text-gray-500">
          <span id="authSwitchText">Don't have an account?</span>
          <button id="btnSwitchMode" class="text-black font-medium ml-1">
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
