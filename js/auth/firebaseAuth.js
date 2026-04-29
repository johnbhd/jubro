import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { app } from "../firebase/firebaseApp.js";

class FirebaseAuthService {
  constructor() {
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.googleProvider = new GoogleAuthProvider();
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleProvider);
    const user = result.user;

    await setDoc(doc(this.db, "users", user.uid), {
      email: user.email,
      name: user.displayName || "",
      createdAt: new Date().toISOString()
    }, { merge: true });

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

    return user;
  }

  async login(email, password) {
    const result = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

  logout() {
    return signOut(this.auth);
  }

  onAuthChange(callback) {
    onAuthStateChanged(this.auth, callback);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}

export const authService = new FirebaseAuthService();