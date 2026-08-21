import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { app } from "../firebase/firebaseApp.js";
import { firebaseTrackerSync } from "../storage/firebaseTrackerSync.js";

class FirebaseAuthService {
  constructor() {
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.googleProvider = new GoogleAuthProvider();
    this.syncedUserId = null;
    this.conflictResolver = null;
  }

  setConflictResolver(resolveConflict) {
    this.conflictResolver = resolveConflict;
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

  async logout() {
    await signOut(this.auth);
    this.syncedUserId = null;
  }

  onAuthChange(callback) {
    return onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.syncTrackerData(user);
      } else {
        this.syncedUserId = null;
      }

      callback(user);
    });
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  async syncTrackerData(user) {
    if (!user || this.syncedUserId === user.uid) return;

    this.syncedUserId = user.uid;

    try {
      await firebaseTrackerSync.syncLocalData(user, {
        resolveConflict: this.conflictResolver
      });
      document.dispatchEvent(new CustomEvent("tracker:sync-complete", {
        detail: { userId: user.uid }
      }));
    } catch (err) {
      this.syncedUserId = null;
      console.error("Tracker sync error:", err);
    }
  }
}

export const authService = new FirebaseAuthService();
