import { TrackerApp } from './main/main.js';
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { app } from './firebase/firebaseApp.js';

const db = getFirestore(app);

console.log("Firestore instance:", db);

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

  testFirestore();

  if (document.getElementById('appBody')) {
    new TrackerApp();
  }
});