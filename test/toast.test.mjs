import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeFlashToast, setFlashToast } from '../js/toast.js';

const entries = new Map();
globalThis.sessionStorage = {
  getItem: (key) => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, value),
  removeItem: (key) => entries.delete(key),
};

test.beforeEach(() => entries.clear());

for (const message of ['Login successful', 'Logout successful']) {
  test(message + ' flash is consumed exactly once', () => {
    assert.equal(setFlashToast(message), true);
    assert.deepEqual(consumeFlashToast(), { type: 'success', message });
    assert.equal(entries.size, 0);
    assert.equal(consumeFlashToast(), null);
  });
}

test('malformed or untrusted flash payload is removed without rendering', () => {
  for (const raw of ['{', 'null', '{"type":"error","message":"Login successful"}', '{"type":"success","message":"<img src=x>"}']) {
    entries.set('jubro_flash_toast', raw);
    assert.equal(consumeFlashToast(), null);
    assert.equal(entries.size, 0);
  }
  assert.equal(setFlashToast('untrusted message'), false);
  assert.equal(entries.size, 0);
});

test('unavailable session storage does not break auth navigation or page startup', () => {
  const available = globalThis.sessionStorage;
  globalThis.sessionStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  try {
    assert.equal(setFlashToast('Login successful'), false);
    assert.equal(consumeFlashToast(), null);
  } finally {
    globalThis.sessionStorage = available;
  }
});
