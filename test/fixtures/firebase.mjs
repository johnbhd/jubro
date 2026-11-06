const documents = new Map();
const authListeners = new Set();

const auth = {
  currentUser: null,
};

let failWrites = false;
let nextUser = null;
let signOutHook = null;

export function __resetFirebase() {
  documents.clear();
  auth.currentUser = null;
  failWrites = false;
  nextUser = null;
  signOutHook = null;
}

export function __setDocument(path, value) {
  documents.set(path, structuredClone(value));
}

export function __getDocument(path) {
  const value = documents.get(path);
  return value === undefined ? undefined : structuredClone(value);
}

export function __setFailWrites(value) {
  failWrites = value;
}

export function __setNextUser(user) {
  nextUser = user;
}

export function __setSignOutHook(callback) {
  signOutHook = callback;
}

export async function __emitAuth(user) {
  auth.currentUser = user;
  await Promise.all([...authListeners].map((listener) => listener(user)));
}

export function initializeApp(config) {
  return { config };
}

export function getAnalytics() {
  return {};
}

export function getAuth() {
  return auth;
}

export class GoogleAuthProvider {}

export const EmailAuthProvider = {
  credential(email, password) {
    return { email, password };
  },
};

async function signIn() {
  auth.currentUser = nextUser;
  await __emitAuth(nextUser);
  return { user: nextUser };
}

export const signInWithPopup = signIn;
export const createUserWithEmailAndPassword = signIn;
export const signInWithEmailAndPassword = signIn;
export async function reauthenticateWithPopup() {}
export async function reauthenticateWithCredential() {}
export async function sendPasswordResetEmail() {}
export async function updatePassword() {}
export async function deleteUser() {}

export function onAuthStateChanged(_auth, callback) {
  authListeners.add(callback);
  queueMicrotask(() => callback(auth.currentUser));
  return () => authListeners.delete(callback);
}

export async function signOut() {
  signOutHook?.();
  await __emitAuth(null);
}

export function getFirestore() {
  return {};
}

export function doc(_db, ...segments) {
  return segments.join('/');
}

export async function getDoc(path) {
  return {
    data() {
      return structuredClone(documents.get(path));
    },
    exists() {
      return documents.has(path);
    },
  };
}

export async function setDoc(path, value, options = {}) {
  if (failWrites) throw new Error('simulated-write-failure');

  const previous = options.merge ? documents.get(path) || {} : {};
  const next = { ...previous };

  Object.entries(value).forEach(([key, entry]) => {
    if (entry === DELETE_FIELD) {
      delete next[key];
    } else {
      next[key] = structuredClone(entry);
    }
  });

  documents.set(path, next);
}

export async function deleteDoc(path) {
  documents.delete(path);
}

const DELETE_FIELD = Symbol('delete-field');

export function deleteField() {
  return DELETE_FIELD;
}
