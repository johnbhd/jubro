import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  deleteField,
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
      (
        Array.isArray(tracker.rows) ||
        Array.isArray(tracker.columns) ||
        Boolean(String(tracker.title || "").trim())
      )
    );
  });
}

class FirebaseTrackerSync {
  constructor() {
    this.db = getFirestore(app);
  }

  clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  normalizeTracker(tracker) {
    if (!tracker || typeof tracker !== "object") return null;

    return {
      title: tracker.title || "",
      columns: tracker.columns || [],
      rows: tracker.rows || []
    };
  }

  trackersMatch(a, b) {
    return JSON.stringify(this.normalizeTracker(a)) === JSON.stringify(this.normalizeTracker(b));
  }

  findMatchingTrackerId(firebaseData, localId, localTracker) {
    if (firebaseData[localId]) return localId;

    const localTitle = String(localTracker?.title || "").trim().toLowerCase();
    if (!localTitle) return null;

    return Object.keys(firebaseData).find((firebaseId) => {
      const firebaseTitle = String(firebaseData[firebaseId]?.title || "").trim().toLowerCase();
      return firebaseTitle === localTitle;
    }) || null;
  }

  async syncLocalData(user, options = {}) {
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

    if (hasLocalData && !hasFirebaseData) {
      await this.uploadLocalState(user, localState);
      console.log("Uploaded local trackerData to Firestore");
      return;
    }

    if (hasLocalData && hasFirebaseData) {
      const mergedState = await this.mergeStates(localState, firebaseState, options.resolveConflict);

      Storage.save(mergedState);
      await this.uploadLocalState(user, mergedState);
      console.log("Merged local and Firestore trackerData");
      return;
    }

    console.log("No valid trackerData to sync");
  }

  async mergeStates(localState, firebaseState, resolveConflict) {
    const mergedData = this.clone(firebaseState?.data || {});
    const localData = localState?.data || {};

    for (const [localId, localTracker] of Object.entries(localData)) {
      const firebaseId = this.findMatchingTrackerId(mergedData, localId, localTracker);

      if (!firebaseId) {
        mergedData[localId] = this.clone(localTracker);
        continue;
      }

      if (this.trackersMatch(localTracker, mergedData[firebaseId])) {
        continue;
      }

      const shouldOverwrite = typeof resolveConflict === "function"
        ? await resolveConflict({
            localId,
            firebaseId,
            localTracker: this.clone(localTracker),
            firebaseTracker: this.clone(mergedData[firebaseId])
          })
        : false;

      if (shouldOverwrite) {
        mergedData[firebaseId] = {
          ...this.clone(localTracker),
          id: firebaseId
        };
      }
    }

    const active = mergedData[localState?.active]
      ? localState.active
      : firebaseState?.active || Object.keys(mergedData)[0] || null;

    return {
      active,
      data: mergedData
    };
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
    if (!state || typeof state !== "object" || !state.data || typeof state.data !== "object") return;

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

  async syncCurrentLocalState(user) {
    if (!user) return;

    const state = Storage.load();
    await this.uploadLocalState(user, state);
  }

  async clearTrackerData(user) {
    if (!user) return;

    await Promise.all([
      deleteDoc(doc(this.db, "trackerData", user.uid)),
      setDoc(doc(this.db, "users", user.uid), {
        trackerData: deleteField()
      }, { merge: true })
    ]);
  }

  async deleteTracker(user, trackerId) {
    if (!user || !trackerId) return;

    const state = Storage.load();
    if (state.data && state.data[trackerId]) {
      delete state.data[trackerId];
    }

    if (state.active === trackerId) {
      state.active = Object.keys(state.data || {})[0] || null;
    }

    Storage.save(state);
    await this.uploadLocalState(user, state);
  }
}

export const firebaseTrackerSync = new FirebaseTrackerSync();
