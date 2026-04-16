import { TrackerApp } from './main/main.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("APP LOADED");
  if (document.getElementById('appBody')) {
    new TrackerApp();
  }
});