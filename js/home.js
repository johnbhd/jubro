import { TrackerHome } from './homepage/homepage.js';
import { Auth } from './auth/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("APP LOADED");

  if (document.getElementById('homeBody')) {
    new TrackerHome();
    new Auth(); 
  }
});