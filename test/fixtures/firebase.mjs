const documents = new Map();
const documentVersions = new Map();
const authListeners = new Set();

const auth = {
  currentUser: null,
};

let failWrites = false;
let nextUser = null;
let signOutHook = null;
let writeDelay = 0;
let transactionDelay = 0;
let transactionAttempts = 0;
const writes = [];

export function __resetFirebase() {
  documents.clear();
  documentVersions.clear();
  auth.currentUser = null;
  failWrites = false;
  nextUser = null;
  signOutHook = null;
  writeDelay = 0;
  transactionDelay = 0;
  transactionAttempts = 0;
  writes.length = 0;
}

export function __setDocument(path, value) {
  documents.set(path, structuredClone(value));
  documentVersions.set(path, (documentVersions.get(path) || 0) + 1);
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

export function __getWrites() {
  return writes.map((write) => structuredClone(write));
}

export function __setWriteDelay(milliseconds) {
  writeDelay = Math.max(0, Number(milliseconds) || 0);
}

export function __setTransactionDelay(milliseconds) {
  transactionDelay = Math.max(0, Number(milliseconds) || 0);
}

export function __getTransactionAttempts() {
  return transactionAttempts;
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

  writes.push({
    path,
    value,
    options,
  });

  if (writeDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, writeDelay));
  }

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
  documentVersions.set(path, (documentVersions.get(path) || 0) + 1);
}

export async function deleteDoc(path) {
  documents.delete(path);
  documentVersions.set(path, (documentVersions.get(path) || 0) + 1);
}

function createSnapshot(path) {
  return {
    data() {
      return structuredClone(documents.get(path));
    },
    exists() {
      return documents.has(path);
    },
  };
}

function applyWrite(path, value, options = {}) {
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
  documentVersions.set(path, (documentVersions.get(path) || 0) + 1);
}

export async function runTransaction(_db, updateFunction) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    transactionAttempts += 1;

    const reads = new Map();
    const pendingWrites = [];
    let hasWritten = false;

    const transaction = {
      async get(path) {
        if (hasWritten) {
          throw new Error('Firestore transactions must read before writing.');
        }

        reads.set(path, documentVersions.get(path) || 0);
        return createSnapshot(path);
      },

      set(path, value, options = {}) {
        hasWritten = true;
        pendingWrites.push({ path, value, options });
      },

      delete(path) {
        hasWritten = true;
        pendingWrites.push({ path, value: null, options: { delete: true } });
      },
    };

    const result = await updateFunction(transaction);

    if (transactionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, transactionDelay));
    }

    const hasChangedRead = [...reads.entries()].some(([path, version]) => (
      (documentVersions.get(path) || 0) !== version
    ));

    if (hasChangedRead) {
      continue;
    }

    if (failWrites) {
      throw new Error('simulated-write-failure');
    }

    if (writeDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, writeDelay));
    }

    pendingWrites.forEach(({ path, value, options }) => {
      if (options.delete) {
        documents.delete(path);
        documentVersions.set(path, (documentVersions.get(path) || 0) + 1);
        return;
      }

      writes.push({
        path,
        value,
        options,
      });
      applyWrite(path, value, options);
    });

    return result;
  }

  throw new Error('simulated-transaction-retry-limit');
}

const DELETE_FIELD = Symbol('delete-field');

export function deleteField() {
  return DELETE_FIELD;
}
