import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  removeItem(key) {
    this.values.delete(key);
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = new EventTarget();
globalThis.window.confirm = () => true;
globalThis.document = new EventTarget();

const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js');
const { Storage } = await import('../js/storage/storage.js');
const { firebaseTrackerSync } = await import('../js/storage/firebaseTrackerSync.js');
const { authService } = await import('../js/auth/firebaseAuth.js');

test('resolves ownership before callbacks and restores guest before signout', async () => {
  const accountA = { uid: 'account-a', email: 'a@example.test' };
  const accountB = { uid: 'account-b', email: 'b@example.test' };
  const observedOwners = [];

  await authService.waitForWorkspace();
  assert.deepEqual(Storage.getCurrentOwner(), {
    ownerType: 'guest',
    ownerId: null,
  });

  const unsubscribe = authService.onAuthChange((user) => {
    observedOwners.push({
      userId: user?.uid || null,
      owner: Storage.getCurrentOwner(),
    });
  });

  await firebase.__emitAuth(accountA);
  assert.deepEqual(Storage.getCurrentOwner(), {
    ownerType: 'account',
    ownerId: accountA.uid,
  });

  let ownerDuringSignOut = null;
  firebase.__setSignOutHook(() => {
    ownerDuringSignOut = Storage.getCurrentOwner();
  });
  await authService.logout();

  assert.deepEqual(ownerDuringSignOut, {
    ownerType: 'guest',
    ownerId: null,
  });
  assert.deepEqual(Storage.getCurrentOwner(), {
    ownerType: 'guest',
    ownerId: null,
  });

  await firebase.__emitAuth(accountB);
  assert.deepEqual(Storage.getCurrentOwner(), {
    ownerType: 'account',
    ownerId: accountB.uid,
  });
  assert.ok(observedOwners.some(({ userId, owner }) => (
    userId === accountB.uid && owner.ownerId === accountB.uid
  )));

  unsubscribe();
});

test('uses shared Jubro modal resolvers without the navbar Auth UI', async () => {
  const originalSync = firebaseTrackerSync.syncLocalData;
  let options = null;

  firebaseTrackerSync.syncLocalData = async (_user, receivedOptions) => {
    options = receivedOptions;
  };
  authService.syncedUserId = null;

  try {
    await authService.syncTrackerData({ uid: 'direct-board-user' });
  } finally {
    firebaseTrackerSync.syncLocalData = originalSync;
  }

  const { confirmGuestTransfer, confirmTrackerOverwrite } = await import('../js/auth/syncChoice.js');
  assert.equal(options.resolveConflict, confirmTrackerOverwrite);
  assert.equal(options.resolveGuestTransfer, confirmGuestTransfer);
});

test('optional pending hook runs before resolution and its context reaches the settled callback', async () => {
  const originalPrepare = authService.prepareWorkspace;
  let release;
  const calls = [];
  const context = { token: 1 };
  authService.prepareWorkspace = async () => {
    calls.push('prepare');
    await new Promise((resolve) => {
      release = resolve;
    });
  };
  const unsubscribe = authService.onAuthChange((_user, received) => {
    calls.push('settled');
    assert.equal(received, context);
  }, {
    onPending() {
      calls.push('pending');
      return context;
    },
  });
  try {
    await new Promise((resolve) => queueMicrotask(resolve));
    assert.deepEqual(calls, ['pending', 'prepare']);
    release();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['pending', 'prepare', 'settled']);
  } finally {
    unsubscribe();
    authService.prepareWorkspace = originalPrepare;
  }
});
