import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import { app } from "../firebase/firebaseApp.js";

class FirebaseAuthService {
  constructor() {
    this.auth = getAuth(app);
    this.googleProvider = new GoogleAuthProvider();
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, this.googleProvider);
    return result.user;
  }

  async register(email, password) {
    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

  async login(email, password) {
    const result = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}

export const authService = new FirebaseAuthService();