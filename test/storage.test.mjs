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

const {
  ACCOUNT_STORAGE_PREFIX,
  STORAGE_KEY,
  Storage,
} = await import('../js/storage/storage.js');

function stateWith(title) {
  return {
    active: '1',
    data: {
      1: {
        id: '1',
        title,
        columns: [],
        rows: [],
      },
    },
  };
}

test.beforeEach(() => {
  localStorage.clear();
  Storage.useGuestWorkspace();
});

test('classifies legacy flextracker_data as revision-zero guest data', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWith('Legacy Guest')));

  const state = Storage.load();

  assert.equal(state.ownerType, 'guest');
  assert.equal(state.ownerId, null);
  assert.equal(state.revision, 0);
  assert.equal(state.legacyUnowned, true);
  assert.equal(state.data['1'].title, 'Legacy Guest');
});

test('keeps guest and account workspaces isolated by Firebase UID', () => {
  const guestState = stateWith('Guest');
  assert.equal(Storage.save(guestState), true);

  Storage.useAccountWorkspace('account-a');
  const accountAState = stateWith('Account A');
  assert.equal(Storage.save(accountAState), true);

  Storage.useAccountWorkspace('account-b');
  assert.deepEqual(Storage.load().data, {});
  const accountBState = stateWith('Account B');
  assert.equal(Storage.save(accountBState), true);

  Storage.useAccountWorkspace('account-a');
  assert.equal(Storage.load().data['1'].title, 'Account A');

  Storage.useGuestWorkspace();
  assert.equal(Storage.load().data['1'].title, 'Guest');
  assert.ok(localStorage.getItem(`${ACCOUNT_STORAGE_PREFIX}${encodeURIComponent('account-b')}`));
});

test('increments revision and updates the caller state after each save', () => {
  const state = Storage.load();
  state.data = stateWith('First').data;
  state.active = '1';

  assert.equal(Storage.save(state), true);
  assert.equal(state.revision, 1);

  state.data['1'].title = 'Second';
  assert.equal(Storage.save(state), true);
  assert.equal(state.revision, 2);
  assert.equal(Storage.load().data['1'].title, 'Second');
});

test('rejects a stale whole-state save without changing newer storage', () => {
  const staleState = Storage.load();
  const newerState = stateWith('Newer tab');
  newerState.ownerType = 'guest';
  newerState.ownerId = null;
  newerState.revision = 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newerState));

  staleState.data = stateWith('Stale tab').data;
  staleState.active = '1';

  assert.equal(Storage.save(staleState), false);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).data['1'].title, 'Newer tab');
});

test('announces a newer storage revision from another tab', () => {
  Storage.load();
  let detail = null;
  document.addEventListener('jubro:external-storage-change', (event) => {
    detail = event.detail;
  }, { once: true });

  const newerState = {
    ...stateWith('Other tab'),
    ownerType: 'guest',
    ownerId: null,
    revision: 1,
  };
  const event = new Event('storage');
  Object.defineProperties(event, {
    key: { value: STORAGE_KEY },
    newValue: { value: JSON.stringify(newerState) },
  });
  window.dispatchEvent(event);

  assert.deepEqual(detail, {
    ownerType: 'guest',
    ownerId: null,
    loadedRevision: 0,
    currentRevision: 1,
  });
});

test('clears only the transferred guest revision', () => {
  const guestState = stateWith('Transfer me');
  assert.equal(Storage.save(guestState), true);
  const transferredRevision = guestState.revision;

  Storage.useAccountWorkspace('account-a');

  assert.equal(Storage.clearGuestAfterTransfer(transferredRevision), true);
  assert.deepEqual(Storage.loadGuest().data, {});
  assert.equal(Storage.loadGuest().revision, transferredRevision + 1);
});
