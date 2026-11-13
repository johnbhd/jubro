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

test('unavailable theme storage replaces the startup skeleton with safe Retry', async () => {
  const elements = new Map();
  function element() {
    return {
      hidden: false,
      attributes: new Map(),
      children: [],
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      removeAttribute(name) {
        this.attributes.delete(name);
      },
      hasAttribute(name) {
        return this.attributes.has(name);
      },
      addEventListener() {},
      append(...children) {
        this.children.push(...children);
        for (const child of children) {
          if (child.id) {
            elements.set(child.id, child);
          }
        }
      },
    };
  }
  for (const id of ['appBody', 'workspaceLoading', 'boardWorkspace', 'appNavbar']) {
    elements.set(id, element());
  }
  elements.get('boardWorkspace').parentElement = element();
  document.documentElement.dataset = {};
  document.getElementById = (id) => elements.get(id) || null;
  document.createElement = element;
  localStorage.getItem = () => {
    throw new Error('Storage unavailable');
  };
  const originalError = console.error;
  const errors = [];
  console.error = (...message) => errors.push(message);
  try {
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(elements.get('workspaceLoading').hidden, true);
    assert.equal(elements.get('boardWorkspace').hidden, true);
    assert.equal(elements.get('workspaceRetry').children[1].textContent, 'Retry');
    assert.equal(errors.length, 1);
  } finally {
    console.error = originalError;
  }
});
