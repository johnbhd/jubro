import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  clear() {
    this.values.clear();
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
globalThis.document = new EventTarget();

const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js');
const { STORAGE_KEY, Storage } = await import('../js/storage/storage.js');
const { firebaseTrackerSync } = await import('../js/storage/firebaseTrackerSync.js');

const ACCOUNT_A = { uid: 'account-a', email: 'a@example.test' };
const ACCOUNT_B = { uid: 'account-b', email: 'b@example.test' };

function trackerState(id, title) {
  return {
    active: id,
    data: {
      [id]: {
        id,
        title,
        columns: [],
        rows: [],
      },
    },
  };
}

function cloudState(id, title, revision = 1) {
  return {
    active: id,
    data: JSON.stringify(trackerState(id, title).data),
    ownerType: 'account',
    ownerId: ACCOUNT_A.uid,
    revision,
  };
}

test.beforeEach(() => {
  localStorage.clear();
  firebase.__resetFirebase();
  Storage.useGuestWorkspace();
});

test('transfers guest data to an empty account once and clears the guest copy', async () => {
  const guestState = trackerState('guest-1', 'Guest Tracker');
  assert.equal(Storage.save(guestState), true);

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A);

  const accountState = Storage.load();
  assert.equal(accountState.ownerId, ACCOUNT_A.uid);
  assert.equal(accountState.data['guest-1'].title, 'Guest Tracker');
  assert.deepEqual(Storage.loadGuest().data, {});
  assert.equal(firebase.__getDocument('trackerData/account-a').ownerId, ACCOUNT_A.uid);

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A);
  assert.equal(Object.keys(Storage.load().data).length, 1);
});

test('keeps guest data separate when populated-account transfer is declined', async () => {
  const guestState = trackerState('guest-1', 'Guest Tracker');
  assert.equal(Storage.save(guestState), true);
  firebase.__setDocument('trackerData/account-a', cloudState('account-1', 'Account Tracker'));

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A, {
    resolveGuestTransfer: async () => false,
  });

  assert.equal(Storage.load().data['account-1'].title, 'Account Tracker');
  assert.equal(Storage.loadGuest().data['guest-1'].title, 'Guest Tracker');
});

test('preserves both sides when populated-account transfer is accepted', async () => {
  const guestState = trackerState('guest-1', 'Guest Tracker');
  assert.equal(Storage.save(guestState), true);
  firebase.__setDocument('trackerData/account-a', cloudState('account-1', 'Account Tracker'));

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A, {
    resolveGuestTransfer: async () => true,
  });

  assert.deepEqual(Object.keys(Storage.load().data).sort(), ['account-1', 'guest-1']);
  assert.deepEqual(Storage.loadGuest().data, {});
});

test('does not expose or upload Account A cache when Account B signs in', async () => {
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  const accountAState = trackerState('a-1', 'Account A Tracker');
  assert.equal(Storage.save(accountAState), true);

  await firebaseTrackerSync.syncLocalData(ACCOUNT_B);

  assert.deepEqual(Storage.load().data, {});
  assert.equal(firebase.__getDocument('trackerData/account-b'), undefined);
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  assert.equal(Storage.load().data['a-1'].title, 'Account A Tracker');
});

test('keeps guest data when transfer upload fails', async () => {
  const guestState = trackerState('guest-1', 'Guest Tracker');
  assert.equal(Storage.save(guestState), true);
  firebase.__setFailWrites(true);

  await assert.rejects(
    firebaseTrackerSync.syncLocalData(ACCOUNT_A),
    /simulated-write-failure/
  );

  assert.equal(Storage.loadGuest().data['guest-1'].title, 'Guest Tracker');
});

test('does not silently transfer legacy unowned data to an empty account', async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerState('legacy-1', 'Legacy Data')));

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A);

  assert.deepEqual(Storage.load().data, {});
  assert.equal(Storage.loadGuest().data['legacy-1'].title, 'Legacy Data');
  assert.equal(firebase.__getDocument('trackerData/account-a'), undefined);
});

test('normalizes legacy checkbox strings loaded from Firestore by column type', async () => {
  const cloudPayload = {
    active: 'cloud-1',
    data: JSON.stringify({
      'cloud-1': {
        id: 'cloud-1',
        title: 'Cloud Types',
        columns: [
          { name: 'Done', type: 'checkbox' },
          { name: 'Text', type: 'text' },
        ],
        rows: [[
          { value: 'true', type: 'checkbox' },
          { value: 'true', type: 'text' },
        ]],
      },
    }),
    ownerType: 'account',
    ownerId: ACCOUNT_A.uid,
    revision: 3,
  };

  const parsedState = firebaseTrackerSync.parseTrackerData(cloudPayload, ACCOUNT_A.uid);
  assert.equal(parsedState.data['cloud-1'].rows[0][0].value, true);
  assert.equal(parsedState.data['cloud-1'].rows[0][1].value, 'true');

  firebase.__setDocument('trackerData/account-a', cloudPayload);

  await firebaseTrackerSync.syncLocalData(ACCOUNT_A);

  const state = Storage.load();
  const row = state.data['cloud-1'].rows[0];

  assert.equal(row[0].value, true);
  assert.equal(typeof row[0].value, 'boolean');
  assert.equal(row[1].value, 'true');
});
