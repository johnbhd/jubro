import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { app } from "../firebase/firebaseApp.js";
import {
  dispatchTrackerSyncError,
  firebaseTrackerSync,
} from "../storage/firebaseTrackerSync.js";
import { Storage } from "../storage/storage.js";

class FirebaseAuthService {
  constructor() {
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.googleProvider = new GoogleAuthProvider();
    this.syncedUserId = null;
    this.syncingUserId = null;
    this.syncPromise = null;
    this.initialWorkspacePromise = null;
    this.conflictResolver = ({ localTracker, firebaseTracker }) => window.confirm(
      `"${localTracker?.title || 'Untitled Job Search'}" differs from the account copy `
      + `"${firebaseTracker?.title || 'Untitled Job Search'}". Replace the account copy with this Job Search?`
    );
    this.guestTransferResolver = () => window.confirm(
      'This browser has guest Job Searches and this account already has saved Job Searches. Bring the guest Job Searches into this account?'
    );
  }

  setConflictResolver(resolveConflict) {
    this.conflictResolver = resolveConflict;
  }

  setGuestTransferResolver(resolveGuestTransfer) {
    this.guestTransferResolver = resolveGuestTransfer;
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleProvider);
    const user = result.user;

    await setDoc(doc(this.db, "users", user.uid), {
      email: user.email,
      name: user.displayName || "",
      createdAt: new Date().toISOString()
    }, { merge: true });

    await this.syncTrackerData(user);

    return user;
  }

  async register(email, password) {
    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    const user = result.user;

    await setDoc(doc(this.db, "users", user.uid), {
      email: user.email,
      createdAt: new Date().toISOString()
    });

    await this.syncTrackerData(user);

    return user;
  }

  async login(email, password) {
    const result = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    await this.syncTrackerData(result.user);

    return result.user;
  }

  resetPassword(email) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async changePassword(currentPassword, newPassword) {
    const user = this.getCurrentUser();

    if (!user) {
      const error = new Error('No authenticated user.');
      error.code = 'auth/no-current-user';
      throw error;
    }

    if (!user.email) {
      const error = new Error('The current account does not have an email address.');
      error.code = 'auth/no-email';
      throw error;
    }

    const hasPasswordProvider = user.providerData?.some(
      ({ providerId }) => providerId === 'password'
    );

    if (!hasPasswordProvider) {
      const error = new Error('Password changes require an email and password account.');
      error.code = 'auth/password-provider-required';
      throw error;
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  getAccountReauthenticationMethod() {
    const user = this.getCurrentUser();

    if (!user) return null;

    const providerIds = user.providerData?.map(({ providerId }) => providerId) || [];

    if (providerIds.includes('password')) return 'password';
    if (providerIds.includes('google.com')) return 'google';

    return 'unsupported';
  }

  async reauthenticateCurrentUser(password) {
    const user = this.getCurrentUser();

    if (!user) {
      const error = new Error('No authenticated user.');
      error.code = 'auth/no-current-user';
      throw error;
    }

    if (!user.email) {
      const error = new Error('The current account does not have an email address.');
      error.code = 'auth/no-email';
      throw error;
    }

    if (this.getAccountReauthenticationMethod() !== 'password') {
      const error = new Error('Password re-authentication is not available for this account.');
      error.code = 'auth/password-provider-required';
      throw error;
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  async reauthenticateCurrentUserWithGoogle() {
    const user = this.getCurrentUser();

    if (!user) {
      const error = new Error('No authenticated user.');
      error.code = 'auth/no-current-user';
      throw error;
    }

    if (this.getAccountReauthenticationMethod() !== 'google') {
      const error = new Error('Google re-authentication is not available for this account.');
      error.code = 'auth/google-provider-required';
      throw error;
    }

    await reauthenticateWithPopup(user, this.googleProvider);
  }

  async deleteCurrentUserAccount() {
    const user = this.getCurrentUser();

    if (!user?.uid) {
      const error = new Error('No authenticated user.');
      error.code = 'auth/no-current-user';
      throw error;
    }

    const uid = user.uid;
    await firebaseTrackerSync.deleteCurrentUserData(user);

    const currentUser = this.getCurrentUser();

    if (!currentUser || currentUser.uid !== uid) {
      const error = new Error('Authenticated user changed during account deletion.');
      error.code = 'auth/user-changed-during-deletion';
      throw error;
    }

    await deleteUser(user);
    Storage.removeAccountWorkspace(uid);
    Storage.useGuestWorkspace();
    this.syncedUserId = null;
  }

  async logout() {
    const previousUser = this.getCurrentUser();

    Storage.useGuestWorkspace();
    this.syncedUserId = null;
    this.syncingUserId = null;
    this.syncPromise = null;

    try {
      await signOut(this.auth);
    } catch (error) {
      if (previousUser?.uid) {
        Storage.useAccountWorkspace(previousUser.uid);
      }

      throw error;
    }
  }

  onAuthChange(callback) {
    return onAuthStateChanged(this.auth, async (user) => {
      try {
        await this.prepareWorkspace(user);
        callback(user);
      } catch (error) {
        this.reportSyncError(error);
        callback(user);
      }
    });
  }

  waitForWorkspace() {
    if (this.initialWorkspacePromise) return this.initialWorkspacePromise;

    this.initialWorkspacePromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
        try {
          await this.prepareWorkspace(user);
        } catch (error) {
          this.reportSyncError(error);
        } finally {
          unsubscribe();
          resolve(user);
        }
      });
    });

    return this.initialWorkspacePromise;
  }

  async prepareWorkspace(user) {
    if (user?.uid) {
      await this.syncTrackerData(user);
      return;
    }

    Storage.useGuestWorkspace();
    this.syncedUserId = null;
    this.syncingUserId = null;
    this.syncPromise = null;
    document.dispatchEvent(new CustomEvent("tracker:sync-complete", {
      detail: { userId: null }
    }));
  }

  reportSyncError(error) {
    console.error("Tracker sync error:", error);
    dispatchTrackerSyncError(error);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  async syncTrackerData(user) {
    if (!user?.uid) return;

    const owner = Storage.getCurrentOwner();

    if (
      this.syncedUserId === user.uid
      && owner.ownerType === "account"
      && owner.ownerId === user.uid
    ) return;

    if (this.syncPromise && this.syncingUserId === user.uid) {
      return this.syncPromise;
    }

    this.syncingUserId = user.uid;
    this.syncPromise = firebaseTrackerSync.syncLocalData(user, {
      resolveConflict: this.conflictResolver,
      resolveGuestTransfer: this.guestTransferResolver
    });

    try {
      await this.syncPromise;
      this.syncedUserId = user.uid;
      document.dispatchEvent(new CustomEvent("tracker:sync-complete", {
        detail: { userId: user.uid }
      }));
    } catch (err) {
      this.syncedUserId = null;
      throw err;
    } finally {
      this.syncingUserId = null;
      this.syncPromise = null;
    }
  }
}

export const authService = new FirebaseAuthService();
