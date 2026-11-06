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
const {
  FirebaseTrackerSync,
  firebaseTrackerSync,
} = await import('../js/storage/firebaseTrackerSync.js');

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

function accountState(id, title, cloudRevision) {
  return {
    ...trackerState(id, title),
    ownerType: 'account',
    ownerId: ACCOUNT_A.uid,
    cloudRevision,
  };
}

function seedCloudState(revision, title = 'Original') {
  const payload = cloudState('account-1', title, revision);

  firebase.__setDocument('trackerData/account-a', payload);
  firebase.__setDocument('users/account-a', {
    email: ACCOUNT_A.email,
    trackerData: payload,
  });
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

test('coalesces duplicate same-revision sync requests', async () => {
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  assert.equal(Storage.save(trackerState('account-1', 'Account Tracker')), true);

  const firstSync = firebaseTrackerSync.syncCurrentLocalState(ACCOUNT_A);
  const secondSync = firebaseTrackerSync.syncCurrentLocalState(ACCOUNT_A);

  await Promise.all([firstSync, secondSync]);

  assert.deepEqual(
    firebase.__getWrites().map(({ path }) => path),
    ['users/account-a', 'trackerData/account-a']
  );
});

test('serializes different-revision uploads for one account', async () => {
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  assert.equal(Storage.save(trackerState('account-1', 'First revision')), true);
  firebase.__setWriteDelay(1);

  const firstSync = firebaseTrackerSync.syncCurrentLocalState(ACCOUNT_A);
  const nextState = Storage.load();
  nextState.data['account-1'].title = 'Second revision';
  assert.equal(Storage.save(nextState), true);
  const secondSync = firebaseTrackerSync.syncCurrentLocalState(ACCOUNT_A);

  await Promise.all([firstSync, secondSync]);

  assert.deepEqual(
    firebase.__getWrites().map(({ path }) => path),
    [
      'users/account-a',
      'trackerData/account-a',
      'users/account-a',
      'trackerData/account-a',
    ]
  );

  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 2);
  assert.equal(Storage.load().cloudRevision, 2);
});

test('rejects a stale independent client without overwriting cloud data', async () => {
  seedCloudState(10);

  const clientA = new FirebaseTrackerSync();
  const clientB = new FirebaseTrackerSync();
  const stateA = accountState('account-1', 'Google', 10);
  const stateB = accountState('account-1', 'Microsoft', 10);

  await clientA.commitCloudState(ACCOUNT_A, stateA);

  await assert.rejects(
    clientB.commitCloudState(ACCOUNT_A, stateB),
    (error) => error.code === 'sync/cloud-conflict'
  );

  const cloud = firebase.__getDocument('trackerData/account-a');
  const compatible = firebase.__getDocument('users/account-a').trackerData;

  assert.equal(cloud.revision, 11);
  assert.equal(JSON.parse(cloud.data)['account-1'].title, 'Google');
  assert.deepEqual(compatible, cloud);
  assert.equal(stateB.data['account-1'].title, 'Microsoft');
});

test('independent clients reject whichever client becomes stale', async () => {
  seedCloudState(10);

  const clientA = new FirebaseTrackerSync();
  const clientB = new FirebaseTrackerSync();
  const stateA = accountState('account-1', 'Google', 10);
  const stateB = accountState('account-1', 'Microsoft', 10);

  await clientB.commitCloudState(ACCOUNT_A, stateB);

  await assert.rejects(
    clientA.commitCloudState(ACCOUNT_A, stateA),
    (error) => error.code === 'sync/cloud-conflict'
  );

  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 11);
  assert.equal(
    JSON.parse(firebase.__getDocument('trackerData/account-a').data)['account-1'].title,
    'Microsoft'
  );
});

test('transaction retry keeps the original expected cloud revision', async () => {
  seedCloudState(10);
  firebase.__setTransactionDelay(1);

  const clientA = new FirebaseTrackerSync();
  const clientB = new FirebaseTrackerSync();
  const results = await Promise.allSettled([
    clientA.commitCloudState(ACCOUNT_A, accountState('account-1', 'Google', 10)),
    clientB.commitCloudState(ACCOUNT_A, accountState('account-1', 'Microsoft', 10)),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.ok(firebase.__getTransactionAttempts() >= 3);
  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 11);
});

test('creates first cloud revision from an empty account', async () => {
  const client = new FirebaseTrackerSync();

  await client.commitCloudState(
    ACCOUNT_A,
    accountState('account-1', 'First tracker', 0)
  );

  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 1);
  assert.equal(firebase.__getDocument('users/account-a').trackerData.revision, 1);
});

test('only one independent client creates the first empty-account revision', async () => {
  firebase.__setTransactionDelay(1);
  const clientA = new FirebaseTrackerSync();
  const clientB = new FirebaseTrackerSync();
  const results = await Promise.allSettled([
    clientA.commitCloudState(ACCOUNT_A, accountState('account-1', 'Google', 0)),
    clientB.commitCloudState(ACCOUNT_A, accountState('account-1', 'Microsoft', 0)),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 1);
});

test('upgrades legacy cloud data without a revision', async () => {
  const legacyPayload = cloudState('account-1', 'Legacy tracker');
  delete legacyPayload.revision;
  firebase.__setDocument('trackerData/account-a', legacyPayload);
  firebase.__setDocument('users/account-a', {
    email: ACCOUNT_A.email,
    trackerData: legacyPayload,
  });

  const client = new FirebaseTrackerSync();

  await client.commitCloudState(
    ACCOUNT_A,
    accountState('account-1', 'Upgraded tracker', 0)
  );

  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 1);
  assert.equal(firebase.__getDocument('users/account-a').trackerData.revision, 1);
});

test('does not partially update compatibility documents when a transaction fails', async () => {
  seedCloudState(2, 'Stable cloud data');
  const beforePrimary = firebase.__getDocument('trackerData/account-a');
  const beforeCompatible = firebase.__getDocument('users/account-a');
  firebase.__setFailWrites(true);

  await assert.rejects(
    new FirebaseTrackerSync().commitCloudState(
      ACCOUNT_A,
      accountState('account-1', 'Uncommitted data', 2)
    ),
    /simulated-write-failure/
  );

  assert.deepEqual(firebase.__getDocument('trackerData/account-a'), beforePrimary);
  assert.deepEqual(firebase.__getDocument('users/account-a'), beforeCompatible);
  assert.deepEqual(firebase.__getWrites(), []);
});

test('cloud conflict preserves local state and cloud base revision', async () => {
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  const localState = accountState('account-1', 'Local work', 4);
  assert.equal(Storage.save(localState), true);
  seedCloudState(5, 'Remote work');

  await assert.rejects(
    firebaseTrackerSync.syncCurrentLocalState(ACCOUNT_A),
    (error) => error.code === 'sync/cloud-conflict'
  );

  const persisted = Storage.load();
  assert.equal(persisted.data['account-1'].title, 'Local work');
  assert.equal(persisted.cloudRevision, 4);
  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 5);
});

test('stale tracker deletion is rejected by the cloud revision check', async () => {
  Storage.useAccountWorkspace(ACCOUNT_A.uid);
  const localState = accountState('account-1', 'Local tracker', 4);
  assert.equal(Storage.save(localState), true);
  seedCloudState(5, 'Remote tracker');

  await assert.rejects(
    firebaseTrackerSync.deleteTracker(ACCOUNT_A, 'account-1'),
    (error) => error.code === 'sync/cloud-conflict'
  );

  assert.equal(firebase.__getDocument('trackerData/account-a').revision, 5);
  assert.equal(
    JSON.parse(firebase.__getDocument('trackerData/account-a').data)['account-1'].title,
    'Remote tracker'
  );
  assert.deepEqual(Storage.load().data, {});
});
