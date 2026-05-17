import { TrackerApp } from './main/main.js';
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { app } from './firebase/firebaseApp.js';

const db = getFirestore(app);
const THEME_KEY = 'jubro_theme';

console.log("Firestore instance:", db);

function applySavedTheme() {
  const theme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

async function testFirestore() {
  try {
    await setDoc(doc(db, "test", "connection"), {
      status: "connected",
      time: Date.now()
    });

    console.log("Firestore connected successfully");
  } catch (err) {
    console.error("Firestore error:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("APP LOADED");

  applySavedTheme();
  testFirestore();

  if (document.getElementById('appBody')) {
    new TrackerApp();
  }
});
