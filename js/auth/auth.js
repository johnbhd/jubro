export class Auth {
  constructor() {
    this.modal = null;
    this.mode = 'login';
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
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
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const id = e.target.id;

      if (id === 'btnCloseAuth') this.close();
      if (id === 'btnAuthSubmit') this.submit();
      if (id === 'btnSwitchMode') this.toggleMode();
      if (id === 'btnGoogle') this.googleLogin();

      if (e.target === this.modal) this.close();
    });

    const btnSignIn = document.getElementById('btnSignIn');
    btnSignIn?.addEventListener('click', () => this.open());
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

  submit() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const confirm = document.getElementById('authConfirmPassword').value.trim();

    if (!email || !password) return alert('Fill all fields');

    if (this.mode === 'register') {
      if (password !== confirm) return alert('Passwords do not match');
      console.log('REGISTER:', email, password);
    } else {
      console.log('LOGIN:', email, password);
    }

    this.close();
  }

  googleLogin() {
    console.log('GOOGLE LOGIN');
  }
}