import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); },
};
globalThis.document = new EventTarget();
document.querySelectorAll = () => [];
document.getElementById = () => null;
globalThis.window = new EventTarget();
window.location = { search: '', pathname: '/board/', hash: '' };
window.history = { replaceState(_state, _title, path) { window.lastPath = path; } };

const { Storage } = await import('../js/storage/storage.js');
const { createDefaultTracker } = await import('../js/tracker/defaultTracker.js');
const { trackerStateMethods } = await import('../js/main/trackerState.js');
const { jobSearchMethods } = await import('../js/main/jobSearch.js');
const { authService } = await import('../js/auth/firebaseAuth.js');
const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js');

function app() {
  return {
    ...trackerStateMethods,
    ...jobSearchMethods,
    state: Storage.load(),
    syncs: 0,
    syncLocalStateToFirebase() { this.syncs += 1; },
    refresh() {},
    renderJobSearchSelector() {},
    showToast() {},
    closeSearchSpecificUI() {},
  };
}

test.beforeEach(async () => {
  await firebase.__emitAuth(null);
  localStorage.values.clear();
  Storage.useGuestWorkspace();
  window.location.search = '';
});

test('failed empty account cannot open, confirmed empty account and owned cache can', async () => {
  await firebase.__emitAuth({ uid: 'account-a' });
  Storage.useAccountWorkspace('account-a');
  authService.syncedUserId = null;
  const instance = app();
  assert.equal(instance.canOpenWorkspace(), false);
  assert.equal(localStorage.values.size, 0);
  authService.syncedUserId = 'account-a';
  assert.equal(instance.canOpenWorkspace(), true);
  instance.resolveBoardSearch();
  assert.equal(instance.getTracker().rows.length, 0);
  assert.equal(instance.state.ownerId, 'account-a');
  authService.syncedUserId = null;
  assert.equal(instance.canOpenWorkspace(), true);
  Storage.useAccountWorkspace('account-b');
  assert.equal(instance.canOpenWorkspace(), false);
});

test('valid explicit link wins and stale selection cannot overwrite another tab', () => {
  const instance = app();
  instance.state.data = { a: createDefaultTracker('a'), b: createDefaultTracker('b') };
  instance.state.active = 'a';
  Storage.save(instance.state);
  window.location.search = '?tracker=b';
  instance.resolveBoardSearch();
  assert.equal(instance.state.active, 'b');
  assert.equal(Storage.load().active, 'b');
  const otherTab = Storage.load();
  otherTab.data.a.title = 'Changed elsewhere';
  Storage.save(otherTab);
  instance.reloadStateFromStorage = function () { this.state = Storage.load(); };
  assert.equal(instance.switchJobSearch('a'), false);
  assert.equal(instance.state.active, 'b');
  assert.equal(instance.state.data.a.title, 'Changed elsewhere');
});

test('first entry creates one empty search and refresh creates no duplicate or revision', () => {
  const first = app();
  first.resolveBoardSearch();
  assert.equal(Object.keys(first.state.data).length, 1);
  assert.equal(first.getTracker().title, 'My Job Search');
  assert.deepEqual(first.getTracker().rows, []);
  assert.equal(first.state.revision, 1);
  const second = app();
  second.resolveBoardSearch();
  assert.equal(second.state.revision, 1);
  assert.equal(Object.keys(second.state.data).length, 1);
});

test('new tracker preserves schema without creating sample applications', () => {
  const tracker = createDefaultTracker('1');
  assert.deepEqual(tracker.columns.map(column => column.name), [
    'Company', 'Position', 'Platform', 'Status', 'Date', 'Link',
  ]);
  assert.deepEqual(tracker.rows, []);
});

test('selection persists once, preserves rows, and invalid URL recovers to active', () => {
  const instance = app();
  instance.state.data = { a: createDefaultTracker('a'), b: createDefaultTracker('b') };
  instance.state.active = 'a';
  Storage.save(instance.state);
  const before = JSON.stringify(instance.state.data);
  assert.equal(instance.switchJobSearch('b'), true);
  assert.equal(instance.state.active, 'b');
  assert.equal(instance.state.revision, 2);
  assert.equal(instance.syncs, 1);
  assert.equal(JSON.stringify(instance.state.data), before);
  assert.equal(instance.switchJobSearch('b'), false);
  window.location.search = '?tracker=deleted';
  instance.resolveBoardSearch();
  assert.equal(instance.state.active, 'b');
  assert.equal(instance.state.revision, 2);
  assert.equal(window.lastPath, '/board/?tracker=b');
});
