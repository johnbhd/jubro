import { authService } from './firebaseAuth.js';
import { setFlashToast, showToast } from '../toast.js';

let pendingLogout = null;

export function finishSignIn() {
  if (document.body.dataset.page === 'homepage') {
    setFlashToast('Login successful');
    window.location.assign('/board/');
    return;
  }

  showToast('Login successful', { success: true });
}

export function logoutAndRedirect() {
  if (pendingLogout) {
    return pendingLogout;
  }

  pendingLogout = authService.logout()
    .then(() => {
      setFlashToast('Logout successful');
      window.location.assign('/');
    })
    .finally(() => {
      pendingLogout = null;
    });

  return pendingLogout;
}
