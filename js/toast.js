const FLASH_KEY = 'jubro_flash_toast';
const SUCCESS_MESSAGES = ['Login successful', 'Logout successful'];
let toastTimeout;

export function setFlashToast(message) {
  if (!SUCCESS_MESSAGES.includes(message)) {
    return false;
  }

  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ type: 'success', message }));
    return true;
  } catch {
    // Navigation must still work when browser session storage is unavailable.
    return false;
  }
}

export function consumeFlashToast() {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    const flash = JSON.parse(raw);

    if (flash?.type === 'success' && SUCCESS_MESSAGES.includes(flash.message)) {
      return flash;
    }
  } catch {
    // Malformed or unavailable session metadata must not interrupt page startup.
  }

  return null;
}

export function showToast(message, { success = false } = {}) {
  let toast = document.getElementById('jubroToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'jubroToast';
    toast.className = 'jubro-toast hidden fixed bottom-4 left-1/2 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg px-4 py-3 text-center text-sm font-medium shadow-lg';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toast);
  }

  toast.textContent = '';
  toast.classList.toggle('jubro-toast-success', success);

  if (success) {
    const icon = document.createElement('span');
    icon.className = 'jubro-toast-icon';
    icon.textContent = '✓';
    icon.setAttribute('aria-hidden', 'true');
    toast.appendChild(icon);
  }

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), success ? 3000 : 2600);
}

export function showFlashToast() {
  const flash = consumeFlashToast();

  if (flash) {
    showToast(flash.message, { success: true });
  }
}
