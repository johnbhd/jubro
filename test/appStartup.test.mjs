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
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
globalThis.document.documentElement = {
  classList: {
    toggle() {},
  },
};
globalThis.document.getElementById = (id) => (
  id === 'jubroStorageNotice' ? {} : null
);

const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js');

test('app startup has no synthetic Firestore connection write', async () => {
  firebase.__resetFirebase();
  await import(`../js/app.js?startup-test=${Date.now()}`);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(firebase.__getWrites(), []);
});
