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

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();

const { Storage } = await import('../js/storage/storage.js');
const { trackerStateMethods } = await import('../js/main/trackerState.js');

test.beforeEach(() => {
  localStorage.clear();
  Storage.useGuestWorkspace();
});

test('local-only saves do not start a cloud sync', () => {
  const app = {
    ...trackerStateMethods,
    state: {
      active: null,
      data: {},
    },
    syncCalls: 0,
    syncLocalStateToFirebase() {
      this.syncCalls += 1;
      return Promise.resolve();
    },
  };

  assert.equal(app.save({ sync: false }), true);
  assert.equal(app.syncCalls, 0);
});

test('flushes repeated title sync scheduling as one sync', async () => {
  const app = {
    ...trackerStateMethods,
    syncCalls: 0,
    syncLocalStateToFirebase() {
      this.syncCalls += 1;
      return Promise.resolve();
    },
  };

  app.scheduleTitleSync();
  app.scheduleTitleSync();

  await app.flushScheduledTitleSync();

  assert.equal(app.syncCalls, 1);
});
