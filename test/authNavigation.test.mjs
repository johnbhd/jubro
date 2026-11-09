import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.document = new EventTarget();
globalThis.window = new EventTarget();
const navigations = [];
window.location = { assign: (path) => navigations.push(path) };
const inputs = {
  authEmail: { value: 'a@example.test' },
  authPassword: { value: 'password' },
  authConfirmPassword: { value: '' },
};
document.getElementById = (id) => inputs[id] || null;
document.body = { dataset: { page: 'homepage' } };

const firebase = await import('./fixtures/firebase.mjs');
const { Auth } = await import('../js/auth/auth.js');
const { authService } = await import('../js/auth/firebaseAuth.js');
const { Storage } = await import('../js/storage/storage.js');
const user = { uid: 'auth-navigation', email: 'a@example.test' };
const originalLogin = authService.login;

function authUI() {
  const ui = Object.create(Auth.prototype);
  ui.mode = 'login';
  ui.message = { clear() {}, show() {} };
  ui.close = () => {};
  ui.dropdown = { classList: { add() {} } };
  return ui;
}

test.beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  firebase.__resetFirebase();
  await authService.prepareWorkspace(null);
  authService.login = originalLogin;
  navigations.length = 0;
  document.body.dataset.page = 'homepage';
  firebase.__setNextUser(user);
});

test('homepage email login navigates only after the guest transfer choice resolves', async () => {
  Storage.save({ active: 'guest', data: { guest: {
    id: 'guest', title: 'Guest Search', columns: [], rows: [['Application']],
  } } });
  firebase.__setDocument('trackerData/' + user.uid, {
    active: 'account', revision: 1, ownerType: 'account', ownerId: user.uid,
    data: JSON.stringify({ account: { id: 'account', title: 'Account Search', columns: [], rows: [] } }),
  });
  let decide;
  let prompted;
  const ready = new Promise((resolve) => {
    prompted = resolve;
  });
  authService.setGuestTransferResolver(() => new Promise((resolve) => {
    decide = resolve;
    prompted();
  }));
  const attempt = authUI().submit();
  await ready;
  assert.deepEqual(navigations, []);
  assert.equal(sessionStorage.values.size, 0);
  decide(false);
  await attempt;
  assert.deepEqual(navigations, ['/board/']);
  assert.equal(JSON.parse([...sessionStorage.values.values()][0]).message, 'Login successful');
});

test('homepage Google login uses the same Board destination and success flash', async () => {
  await authUI().googleLogin();
  assert.deepEqual(navigations, ['/board/']);
  assert.equal(JSON.parse([...sessionStorage.values.values()][0]).message, 'Login successful');
});

test('login failure creates neither navigation nor success flash', async () => {
  authService.login = async () => {
    throw Object.assign(new Error('invalid login'), { code: 'auth/invalid-credential' });
  };
  await authUI().submit();
  assert.deepEqual(navigations, []);
  assert.equal(sessionStorage.values.size, 0);
});

test('logout restores guest ownership before navigating home with one success flash', async () => {
  await firebase.__emitAuth(user);
  Storage.useAccountWorkspace(user.uid);
  await authUI().logout();
  assert.equal(Storage.getCurrentOwner().ownerType, 'guest');
  assert.equal(authService.getCurrentUser(), null);
  assert.deepEqual(navigations, ['/']);
  assert.equal(JSON.parse([...sessionStorage.values.values()][0]).message, 'Logout successful');
});

test('failed logout retains account ownership and never navigates or flashes success', async () => {
  await firebase.__emitAuth(user);
  Storage.useAccountWorkspace(user.uid);
  firebase.__setSignOutHook(() => {
    throw new Error('signout failed');
  });
  await authUI().logout();
  assert.equal(Storage.getCurrentOwner().ownerId, user.uid);
  assert.deepEqual(navigations, []);
  assert.equal(sessionStorage.values.size, 0);
});
