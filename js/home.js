import { TrackerHome } from './homepage/homepage.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("APP LOADED");

  if (document.getElementById('homeBody')) {
    new TrackerHome();
  }
});