import { TrackerHome } from './homepage/homepage.js';
import { authService } from './auth/firebaseAuth.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("APP LOADED");

  if (document.getElementById('homeBody')) {
    await window.jubroComponentsReady;
    await authService.waitForWorkspace();
    new TrackerHome();
  }
});
