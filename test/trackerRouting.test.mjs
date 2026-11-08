import assert from 'node:assert/strict';
import test from 'node:test';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
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

const windowTarget = new EventTarget();
windowTarget.location = {
  search: '',
  pathname: '/board/',
  hash: '',
  href: 'https://example.test/board/',
};
windowTarget.history = {
  replaceState(_state, _title, path) {
    windowTarget.replacedPath = path;
  },
};

globalThis.window = windowTarget;
globalThis.document = new EventTarget();
globalThis.document.getElementById = () => null;
globalThis.localStorage = new MemoryStorage();

const firebase = await import('../test/fixtures/firebase.mjs');
const { Storage } = await import('../js/storage/storage.js');
const {
  resolveTrackerTarget,
  trackerStateMethods,
} = await import('../js/main/trackerState.js');
const { TrackerApp } = await import('../js/main/main.js');

function createTracker(id, title = `Tracker ${id}`) {
  return {
    id,
    title,
    columns: [],
    rows: [],
  };
}

function createState(active = '1', data = {
  1: createTracker('1'),
  2: createTracker('2'),
}) {
  return {
    active,
    data,
  };
}

test('resolves an explicit tracker by storage key', () => {
  const result = resolveTrackerTarget(
    createState(),
    '?tracker=2',
  );

  assert.deepEqual(result, {
    status: 'valid',
    key: '2',
  });
});

test('resolves historical tracker IDs without requiring a new ID format', () => {
  const state = createState('legacy-key', {
    'legacy-key': createTracker('legacy-id'),
  });

  const result = resolveTrackerTarget(
    state,
    '?tracker=legacy-id',
  );

  assert.deepEqual(result, {
    status: 'valid',
    key: 'legacy-key',
  });
});

test('resolves a missing query from the active tracker', () => {
  const result = resolveTrackerTarget(createState(), '');

  assert.deepEqual(result, {
    status: 'missing',
    key: '1',
  });
});

test('does not resolve an invalid target to the active tracker', () => {
  const result = resolveTrackerTarget(
    createState(),
    '?tracker=does-not-exist',
  );

  assert.deepEqual(result, {
    status: 'invalid',
    key: null,
  });
});

test('handles empty, malformed, and duplicate tracker parameters safely', () => {
  assert.deepEqual(
    resolveTrackerTarget(createState(), '?tracker='),
    { status: 'invalid', key: null },
  );

  assert.deepEqual(
    resolveTrackerTarget(createState(), '?tracker=%20'),
    { status: 'invalid', key: null },
  );

  assert.deepEqual(
    resolveTrackerTarget(createState(), '?tracker=%ZZ'),
    { status: 'invalid', key: null },
  );

  assert.deepEqual(
    resolveTrackerTarget(createState(), '?tracker=2&tracker=1'),
    { status: 'valid', key: '2' },
  );
});

test('returns an explicit empty result when the workspace has no trackers', () => {
  const result = resolveTrackerTarget(
    { active: null, data: {} },
    '',
  );

  assert.deepEqual(result, {
    status: 'empty',
    key: null,
  });
});

test('resolves tracker targets only inside the current workspace', () => {
  globalThis.localStorage.clear();

  Storage.useAccountWorkspace('account-a');
  Storage.save({
    active: 'account-a-tracker',
    data: {
      'account-a-tracker': createTracker('account-a-tracker'),
    },
    revision: 0,
  });

  Storage.useAccountWorkspace('account-b');
  const accountBState = Storage.load();

  assert.deepEqual(
    resolveTrackerTarget(accountBState, '?tracker=account-a-tracker'),
    { status: 'invalid', key: null },
  );

  Storage.useGuestWorkspace();
  const guestState = {
    active: 'guest-tracker',
    data: {
      'guest-tracker': createTracker('guest-tracker'),
    },
  };

  assert.deepEqual(
    resolveTrackerTarget(guestState, '?tracker=account-a-tracker'),
    { status: 'invalid', key: null },
  );
});

test('invalid route resolution does not mutate active state or revision', () => {
  windowTarget.location.search = '?tracker=missing';

  const app = {
    state: {
      ...createState(),
      revision: 7,
    },
    ...trackerStateMethods,
  };

  const result = app.applyTrackerRoute();

  assert.deepEqual(result, {
    status: 'invalid',
    key: null,
  });
  assert.equal(app.state.active, '1');
  assert.equal(app.state.revision, 7);
});

test('canonicalizes a missing tracker query without saving workspace data', () => {
  windowTarget.location.search = '';
  windowTarget.replacedPath = null;

  const app = {
    state: createState(),
    ...trackerStateMethods,
  };

  const result = app.applyTrackerRoute();

  app.ensureCanonicalTrackerURL(result.key);

  assert.equal(result.status, 'missing');
  assert.equal(windowTarget.replacedPath, '/board/?tracker=1');
});

test('invalid Board target recovers to saved active without saving application contents', () => {
  firebase.__resetFirebase();
  globalThis.localStorage.clear();
  Storage.useGuestWorkspace();

  const initialState = {
    ...createState(),
    revision: 0,
  };

  Storage.save(initialState);
  windowTarget.location.search = '?tracker=missing';
  windowTarget.location.pathname = '/board/';
  windowTarget.location.href = 'https://example.test/board/?tracker=missing';

  const app = {
    ...trackerStateMethods,
    ...TrackerApp.prototype,
    state: Storage.load(),
    showToast() {},
  };
  app.resolveBoardSearch = TrackerApp.prototype.resolveBoardSearch;
  assert.equal(app.resolveBoardSearch(), true);

  const storedState = Storage.load();

  assert.equal(windowTarget.replacedPath, '/board/?tracker=1');
  assert.equal(storedState.active, '1');
  assert.equal(storedState.revision, 1);
  assert.deepEqual(firebase.__getWrites(), []);
});
