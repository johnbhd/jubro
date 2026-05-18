import { TrackerHome } from './homepage/homepage.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("APP LOADED");

  if (document.getElementById('homeBody')) {
    await window.jubroComponentsReady;
    new TrackerHome();
  }
});
