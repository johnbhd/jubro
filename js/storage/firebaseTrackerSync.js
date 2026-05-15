import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { app } from "../firebase/firebaseApp.js";
import { Storage } from "./storage.js";

export function hasValidTrackerData(state) {
  if (!state || typeof state !== "object") return false;
  if (!state.data || typeof state.data !== "object") return false;

  return Object.values(state.data).some((tracker) => {
    return (
      tracker &&
      typeof tracker === "object" &&
      Array.isArray(tracker.rows) &&
      tracker.rows.length > 0
    );
  });
}

class FirebaseTrackerSync {
  constructor() {
    this.db = getFirestore(app);
  }

  async syncLocalData(user) {
    if (!user) return;

    const localState = Storage.load();
    const firebaseState = await this.loadFirebaseState(user.uid);

    const hasLocalData = hasValidTrackerData(localState);
    const hasFirebaseData = hasValidTrackerData(firebaseState);

    if (!hasLocalData && hasFirebaseData) {
      Storage.save(firebaseState);
      console.log("Loaded Firestore trackerData into localStorage");
      return;
    }

    if (hasLocalData) {
      await this.uploadLocalState(user, localState);
      console.log("Uploaded local trackerData to Firestore");
      return;
    }

    console.log("No valid trackerData to sync");
  }

  async loadFirebaseState(userId) {
    const trackerDoc = await getDoc(doc(this.db, "trackerData", userId));

    if (trackerDoc.exists()) {
      const trackerState = this.parseTrackerData(trackerDoc.data());
      if (hasValidTrackerData(trackerState)) return trackerState;
    }

    const userDoc = await getDoc(doc(this.db, "users", userId));

    if (userDoc.exists()) {
      const userState = this.parseTrackerData(userDoc.data().trackerData);
      if (hasValidTrackerData(userState)) return userState;
    }

    return null;
  }

  parseTrackerData(trackerData) {
    if (!trackerData || typeof trackerData !== "object") return null;

    let data = trackerData.data;

    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.error("Firestore trackerData parse error:", err);
        return null;
      }
    }

    if (!data || typeof data !== "object") return null;

    return {
      active: trackerData.active || null,
      data
    };
  }

  async uploadLocalState(user, state) {
    if (!hasValidTrackerData(state)) return;

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
  }
}

export const firebaseTrackerSync = new FirebaseTrackerSync();
