import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { app } from "../firebase/firebaseApp.js";
import { Storage } from "./storage.js";

class FirebaseTrackerSync {
  constructor() {
    this.db = getFirestore(app);
  }

  async syncLocalData(user) {
    if (!user) return;

    const state = Storage.load() || {
      active: null,
      data: {}
    };

    const trackerData = {
      active: state.active || null,
      data: JSON.stringify(state.data || {}),
      syncedAt: new Date().toISOString()
    };

    await setDoc(doc(this.db, "users", user.uid), {
      email: user.email,
      trackerData
    }, { merge: true });

    await setDoc(doc(this.db, "trackerData", user.uid), trackerData, { merge: true });

    console.log("Firestore trackerData created");
  }
}

export const firebaseTrackerSync = new FirebaseTrackerSync();
