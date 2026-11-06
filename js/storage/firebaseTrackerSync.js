import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  deleteField,
  setDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import { app } from "../firebase/firebaseApp.js";
import { Storage } from "./storage.js";
import { normalizeLegacyWorkspaceState } from "../services/trackerData.js";
import {
  GUEST_TRANSFER_AUTOMATIC,
  GUEST_TRANSFER_CONFIRM,
  getGuestTransferMode
} from "./workspacePolicy.js";

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

function validCloudRevision(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function createCloudConflictError({
  expectedCloudRevision,
  currentCloudRevision,
}) {
  const error = new Error(
    "Cloud data changed in another session before this workspace could sync."
  );

  error.name = "CloudConflictError";
  error.code = "sync/cloud-conflict";
  error.expectedCloudRevision = expectedCloudRevision;
  error.currentCloudRevision = currentCloudRevision;
  error.userMessage = "Your data changed from another session. Your local changes are safe, but newer cloud data already exists.";

  return error;
}

export function dispatchTrackerSyncError(error) {
  if (typeof document === "undefined") return;

  const eventName = error?.code === "sync/cloud-conflict"
    ? "tracker:cloud-conflict"
    : "tracker:sync-error";

  document.dispatchEvent(new CustomEvent(eventName, {
    detail: {
      code: error?.code,
      message: error?.userMessage || error?.message || "Tracker data could not be synchronized.",
    },
  }));
}

export class FirebaseTrackerSync {
  constructor() {
    this.db = getFirestore(app);
    this.auth = getAuth(app);
    this.pendingUploads = new Map();
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
    if (!user?.uid) return;

    const guestState = Storage.loadGuest();
    const localState = Storage.useAccountWorkspace(user.uid);
    const firebaseState = await this.loadFirebaseState(user.uid);

    const hasLocalData = hasValidTrackerData(localState);
    const hasFirebaseData = hasValidTrackerData(firebaseState);
    let accountState = localState;
    let shouldUpload = false;

    if (!hasLocalData && hasFirebaseData) {
      accountState = firebaseState;
    } else if (hasLocalData && !hasFirebaseData) {
      shouldUpload = true;
    } else if (hasLocalData && hasFirebaseData) {
      accountState = await this.mergeStates(
        localState,
        firebaseState,
        options.resolveConflict
      );
      shouldUpload = true;
    }

    const hasAccountData = hasValidTrackerData(accountState);
    const transferMode = getGuestTransferMode({
      hasGuestData: hasValidTrackerData(guestState),
      hasAccountData,
      isLegacyGuest: guestState.legacyUnowned === true
    });
    let shouldTransferGuest = transferMode === GUEST_TRANSFER_AUTOMATIC;

    if (transferMode === GUEST_TRANSFER_CONFIRM) {
      shouldTransferGuest = typeof options.resolveGuestTransfer === "function"
        ? await options.resolveGuestTransfer({
            guestState: this.clone(guestState),
            accountState: this.clone(accountState)
          })
        : false;
    }

    if (shouldTransferGuest) {
      accountState = await this.mergeStates(
        guestState,
        accountState,
        options.resolveConflict
      );
      shouldUpload = true;
    }

    if (!hasValidTrackerData(accountState)) {
      console.log("No valid trackerData to sync");
      return;
    }

    const expectedCloudRevision = firebaseState
      ? this.getCloudRevision(firebaseState)
      : this.getCloudRevision(localState);
    const ownedAccountState = this.asAccountState(
      accountState,
      user.uid,
      expectedCloudRevision
    );
    const saved = Storage.replace(ownedAccountState, localState.revision);

    if (!saved) {
      throw new Error("Local tracker data changed before account sync completed.");
    }

    const persistedState = Storage.load();

    if (shouldUpload) {
      await this.uploadLocalState(user, persistedState);
    }

    if (shouldTransferGuest) {
      Storage.clearGuestAfterTransfer(guestState.revision);
      console.log("Transferred guest trackerData to the signed-in account");
    } else if (!hasLocalData && hasFirebaseData) {
      console.log("Loaded Firestore trackerData into account storage");
    } else if (shouldUpload) {
      console.log("Synchronized account trackerData with Firestore");
    }
  }

  asAccountState(state, userId, cloudRevision = this.getCloudRevision(state)) {
    return {
      ...this.clone(state),
      ownerType: "account",
      ownerId: userId,
      revision: Number.isInteger(state?.revision) ? state.revision : 0,
      cloudRevision: validCloudRevision(cloudRevision),
    };
  }

  getCloudRevision(state) {
    return validCloudRevision(state?.cloudRevision);
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
      data: mergedData,
      revision: Math.max(
        Number.isInteger(localState?.revision) ? localState.revision : 0,
        Number.isInteger(firebaseState?.revision) ? firebaseState.revision : 0
      )
    };
  }

  async loadFirebaseState(userId) {
    const trackerDoc = await getDoc(doc(this.db, "trackerData", userId));

    if (trackerDoc.exists()) {
      const trackerState = this.parseTrackerData(trackerDoc.data(), userId);
      if (trackerState) return trackerState;
    }

    const userDoc = await getDoc(doc(this.db, "users", userId));

    if (userDoc.exists()) {
      const userState = this.parseTrackerData(userDoc.data().trackerData, userId);
      if (userState) return userState;
    }

    return null;
  }

  parseTrackerData(trackerData, userId) {
    if (!trackerData || typeof trackerData !== "object") return null;
    if (trackerData.ownerType && (
      trackerData.ownerType !== "account"
      || trackerData.ownerId !== userId
    )) return null;

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

    const revision = Number.isInteger(trackerData.revision)
      ? trackerData.revision
      : 0;

    return normalizeLegacyWorkspaceState({
      active: trackerData.active || null,
      data,
      ownerType: "account",
      ownerId: userId,
      revision,
      cloudRevision: revision,
    });
  }

  assertCloudOwner(payload, userId) {
    if (!payload || !payload.ownerType) return;

    if (payload.ownerType !== "account" || payload.ownerId !== userId) {
      throw new Error("Refusing to use cloud tracker data for a different owner.");
    }
  }

  resolveTransactionCloudState(primarySnapshot, userSnapshot, userId) {
    const primaryPayload = primarySnapshot.exists()
      ? primarySnapshot.data()
      : null;

    this.assertCloudOwner(primaryPayload, userId);

    const primaryState = this.parseTrackerData(primaryPayload, userId);
    if (primaryState) return primaryState;

    const userPayload = userSnapshot.exists()
      ? userSnapshot.data()?.trackerData
      : null;

    this.assertCloudOwner(userPayload, userId);
    return this.parseTrackerData(userPayload, userId);
  }

  async commitCloudState(user, state) {
    if (!user?.uid || !state || typeof state !== "object" || !state.data || typeof state.data !== "object") {
      return null;
    }

    if (state.ownerType !== "account" || state.ownerId !== user.uid) {
      throw new Error("Refusing to upload tracker data for a different owner.");
    }

    const expectedCloudRevision = this.getCloudRevision(state);
    const trackerReference = doc(this.db, "trackerData", user.uid);
    const userReference = doc(this.db, "users", user.uid);

    return runTransaction(this.db, async (transaction) => {
      const trackerSnapshot = await transaction.get(trackerReference);
      const userSnapshot = await transaction.get(userReference);
      const cloudState = this.resolveTransactionCloudState(
        trackerSnapshot,
        userSnapshot,
        user.uid
      );
      const currentCloudRevision = this.getCloudRevision(cloudState);

      if (currentCloudRevision !== expectedCloudRevision) {
        throw createCloudConflictError({
          expectedCloudRevision,
          currentCloudRevision,
        });
      }

      const nextCloudRevision = currentCloudRevision + 1;
      const trackerData = {
        active: state.active || null,
        data: JSON.stringify(state.data || {}),
        ownerType: "account",
        ownerId: user.uid,
        revision: nextCloudRevision,
        syncedAt: new Date().toISOString(),
      };

      transaction.set(userReference, {
        email: user.email,
        trackerData,
      }, { merge: true });

      transaction.set(trackerReference, trackerData, { merge: true });

      return nextCloudRevision;
    });
  }

  getCurrentUploadState(user, fallbackState) {
    const currentState = Storage.load();

    if (
      currentState.ownerType === "account"
      && currentState.ownerId === user.uid
      && currentState.revision >= (fallbackState?.revision || 0)
    ) {
      return currentState;
    }

    return fallbackState;
  }

  async uploadLocalState(user, state) {
    if (!user?.uid || !state || typeof state !== "object" || !state.data || typeof state.data !== "object") return;
    if (state.ownerType !== "account" || state.ownerId !== user.uid) {
      throw new Error("Refusing to upload tracker data for a different owner.");
    }

    const revision = Number.isInteger(state.revision) ? state.revision : 0;
    const cloudRevision = this.getCloudRevision(state);
    const pendingUpload = this.pendingUploads.get(user.uid);

    if (
      pendingUpload?.revision === revision
      && pendingUpload.cloudRevision === cloudRevision
    ) {
      return pendingUpload.promise;
    }

    const previousPromise = pendingUpload?.promise || Promise.resolve();
    const uploadPromise = previousPromise
      .catch(() => {})
      .then(async () => {
        const uploadState = this.getCurrentUploadState(user, state);
        const expectedCloudRevision = this.getCloudRevision(uploadState);
        const nextCloudRevision = await this.commitCloudState(user, uploadState);
        const recorded = Storage.updateCloudRevision(
          nextCloudRevision,
          expectedCloudRevision
        );

        if (!recorded) {
          throw new Error("Local tracker data changed before cloud revision could be recorded.");
        }

        uploadState.cloudRevision = nextCloudRevision;
        return nextCloudRevision;
      });

    this.pendingUploads.set(user.uid, {
      revision,
      cloudRevision,
      promise: uploadPromise,
    });

    try {
      await uploadPromise;
    } finally {
      if (this.pendingUploads.get(user.uid)?.promise === uploadPromise) {
        this.pendingUploads.delete(user.uid);
      }
    }
  }

  async syncCurrentLocalState(user) {
    if (!user?.uid) return;

    const state = Storage.load();

    if (state.ownerType !== "account" || state.ownerId !== user.uid) {
      throw new Error("The active local workspace does not belong to the signed-in account.");
    }

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

  async deleteCurrentUserData(expectedUser) {
    const user = this.auth.currentUser;

    if (!user?.uid || !expectedUser?.uid || user.uid !== expectedUser.uid) {
      const error = new Error('No authenticated user.');
      error.code = expectedUser?.uid
        ? 'auth/user-changed-during-deletion'
        : 'auth/no-current-user';
      throw error;
    }

    const uid = user.uid;

    await Promise.all([
      deleteDoc(doc(this.db, "trackerData", uid)),
      deleteDoc(doc(this.db, "users", uid))
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

    if (!Storage.save(state)) return;

    await this.uploadLocalState(user, state);
  }
}

export const firebaseTrackerSync = new FirebaseTrackerSync();
