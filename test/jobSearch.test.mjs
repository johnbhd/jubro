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
const { jobSearchManagementMethods } = await import('../js/main/jobSearchManagement.js');
const { authService } = await import('../js/auth/firebaseAuth.js');
const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js');

function app() {
  return {
    ...trackerStateMethods,
    ...jobSearchMethods,
    ...jobSearchManagementMethods,
    state: Storage.load(),
    syncs: 0,
    eventsInitialized: true,
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

test('create and rename validate names and save one canonical mutation each', () => {
  const instance = app();
  instance.resolveBoardSearch();
  assert.throws(() => instance.changeJobSearch('create', { title: '  ' }), /name/i);
  assert.equal(instance.state.revision, 1);
  assert.throws(() => instance.changeJobSearch('create', { title: 'my job search' }), /already/i);
  instance.changeJobSearch('create', { title: ' Internship Search ' });
  const id = instance.state.active;
  assert.equal(instance.getTracker().title, 'Internship Search');
  assert.deepEqual(instance.getTracker().rows, []);
  assert.equal(instance.state.revision, 2);
  const before = structuredClone(instance.getTracker());
  instance.changeJobSearch('rename', { key: id, title: 'Summer' });
  assert.deepEqual(instance.getTracker(), { ...before, title: 'Summer' });
  assert.equal(instance.state.revision, 3);
  assert.equal(instance.changeJobSearch('rename', { key: id, title: ' Summer ' }), false);
  assert.equal(instance.state.revision, 3);
});

test('duplicate deep copies applications and schema with new ID and unique title', () => {
  const instance = app();
  instance.resolveBoardSearch();
  const sourceKey = instance.state.active;
  instance.getTracker().rows.push([{ value: 'Actual application', type: 'text' }]);
  Storage.save(instance.state);
  const before = structuredClone(instance.getTracker());
  instance.changeJobSearch('duplicate', { key: sourceKey });
  assert.notEqual(instance.state.active, sourceKey);
  assert.equal(instance.getTracker().title, 'My Job Search (copy)');
  assert.deepEqual(instance.state.data[sourceKey], before);
  instance.getTracker().rows[0][0].value = 'Independent copy';
  assert.equal(instance.state.data[sourceKey].rows[0][0].value, 'Actual application');
  instance.changeJobSearch('duplicate', { key: sourceKey });
  assert.equal(instance.getTracker().title, 'My Job Search (copy 2)');
});

test('delete nonactive, active, and final searches each saves once with valid active', () => {
  const instance = app();
  instance.resolveBoardSearch();
  const first = instance.state.active;
  instance.changeJobSearch('create', { title: 'Second' });
  const second = instance.state.active;
  instance.changeJobSearch('delete', { key: first });
  assert.equal(instance.state.active, second);
  assert.equal(instance.state.revision, 3);
  instance.changeJobSearch('create', { title: 'Third' });
  instance.changeJobSearch('delete', { key: instance.state.active });
  assert.equal(instance.state.active, second);
  instance.changeJobSearch('delete', { key: second });
  assert.equal(instance.state.revision, 6);
  assert.equal(Object.keys(instance.state.data).length, 1);
  assert.equal(instance.getTracker().title, 'My Job Search');
  assert.deepEqual(instance.getTracker().rows, []);
  assert.notEqual(instance.state.active, second);
});

test('stale dialog context and missing target never mutate canonical state', () => {
  const instance = app();
  instance.resolveBoardSearch();
  const context = instance.captureJobSearchContext();
  instance.changeJobSearch('create', { title: 'Second' });
  const before = JSON.stringify(instance.state);
  assert.throws(() => instance.changeJobSearch('rename', {
    key: context.key, title: 'Stale', context,
  }), /changed/i);
  assert.throws(() => instance.changeJobSearch('delete', { key: 'missing' }), /exist/i);
  assert.equal(JSON.stringify(instance.state), before);
});

test('management rejects stale storage and thrown writes without displaying an unsaved search', () => {
  const instance = app();
  instance.resolveBoardSearch();
  const otherTab = Storage.load();
  otherTab.data[otherTab.active].title = 'Newer title';
  Storage.save(otherTab);
  assert.equal(instance.changeJobSearch('create', { title: 'Must not persist' }), false);
  assert.equal(Object.keys(instance.state.data).length, 1);
  assert.equal(instance.getTracker().title, 'Newer title');
  const originalSave = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  try {
    assert.equal(instance.changeJobSearch('delete', { key: instance.state.active }), false);
    assert.equal(instance.getTracker().title, 'Newer title');
  } finally {
    localStorage.setItem = originalSave;
  }
});

test('each account management action uses one revision and one logical cloud transaction', async () => {
  firebase.__resetFirebase();
  const user = { uid: 'management-account', email: 'management@example.test' };
  await firebase.__emitAuth(user);
  Storage.useAccountWorkspace(user.uid);
  const instance = app();
  let pending;
  instance.syncLocalStateToFirebase = function () {
    pending = trackerStateMethods.syncLocalStateToFirebase.call(this);
    return pending;
  };
  instance.resolveBoardSearch();
  await pending;
  for (const action of ['create', 'rename', 'duplicate', 'delete']) {
    const revision = instance.state.revision;
    const writes = firebase.__getWrites().length;
    instance.changeJobSearch(action, {
      key: instance.state.active,
      title: action === 'create' ? 'Account search' : 'Renamed account search',
    });
    await pending;
    assert.equal(instance.state.revision, revision + 1);
    // Existing compatibility sync stores two documents in one transaction.
    assert.equal(firebase.__getWrites().length, writes + 2);
    const cloud = firebase.__getDocument('trackerData/' + user.uid);
    assert.equal(cloud.active, instance.state.active);
    assert.deepEqual(JSON.parse(cloud.data), instance.state.data);
  }
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
