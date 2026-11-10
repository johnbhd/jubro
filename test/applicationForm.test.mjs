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
window.location = { pathname: '/board/', search: '', hash: '' };
window.history = { replaceState() {} };

const { Storage } = await import('../js/storage/storage.js');
const { createDefaultTracker } = await import('../js/tracker/defaultTracker.js');
const { trackerStateMethods } = await import('../js/main/trackerState.js');
const { jobSearchMethods } = await import('../js/main/jobSearch.js');
const { jobSearchManagementMethods } = await import('../js/main/jobSearchManagement.js');
const { applicationFormMethods } = await import('../js/main/applicationForm.js');
const firebase = await import('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js');

function app() {
  const instance = {
    ...trackerStateMethods,
    ...jobSearchMethods,
    ...jobSearchManagementMethods,
    ...applicationFormMethods,
    state: Storage.load(),
    eventsInitialized: true,
    refresh() {},
    showToast(message, options) {
      this.lastToast = { message, options };
    },
    closeSearchSpecificUI() {},
    syncs: 0,
    syncLocalStateToFirebase() { this.syncs += 1; },
  };
  instance.resolveBoardSearch();
  return instance;
}

test.beforeEach(async () => {
  await firebase.__emitAuth(null);
  localStorage.values.clear();
  Storage.useGuestWorkspace();
});

test('custom schema without Company or Position accepts meaningful text but not only automatic dates', () => {
  const instance = app();
  instance.getTracker().columns = [
    { name: 'Opportunity', type: 'text' },
    { name: 'Date', type: 'date' },
  ];
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  assert.throws(() => instance.addApplicationDraft(draft, context), /description/i);
  draft[0].value = 'Custom opportunity';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.equal(instance.getTracker().rows[0][0].value, 'Custom opportunity');
});

test('Add thrown persistence restores canonical rows', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Not saved';
  const originalSave = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  try {
    assert.equal(instance.addApplicationDraft(draft, context), false);
    assert.equal(instance.getTracker().rows.length, 0);
    assert.equal(instance.state.revision, 1);
  } finally {
    localStorage.setItem = originalSave;
  }
});

test('account Add saves one revision and one logical sync without a guide in exported data', async () => {
  firebase.__resetFirebase();
  const user = { uid: 'add-account', email: 'add@example.test' };
  await firebase.__emitAuth(user);
  Storage.useAccountWorkspace(user.uid);
  const instance = app();
  let pending;
  instance.syncLocalStateToFirebase = function () {
    pending = trackerStateMethods.syncLocalStateToFirebase.call(this);
    return pending;
  };
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Real Company';
  instance.addApplicationDraft(draft, context);
  await pending;
  assert.equal(Storage.load().revision, 2);
  assert.equal(firebase.__getWrites().length, 2);
  const cloudData = JSON.parse(firebase.__getDocument('trackerData/' + user.uid).data);
  assert.equal(cloudData[instance.state.active].rows.length, 1);
  assert.equal(cloudData[instance.state.active].rows[0][0].value, 'Real Company');
  assert.equal(JSON.stringify(cloudData).includes('EXAMPLE'), false);
});

test('Add draft has no fake values and opening a draft performs no save', () => {
  const instance = app();
  const draft = instance.createApplicationDraft(new Date(2026, 10, 8, 23, 30));
  assert.deepEqual(draft.map(cell => cell.value), ['', '', '', '', '2026-11-08', '', '', '', '', '']);
  assert.equal(instance.state.revision, 1);
  assert.equal(instance.getTracker().rows.length, 0);
});

test('Add rejects missing identity, invalid date and removed select options without mutation', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  assert.throws(() => instance.addApplicationDraft(draft, context), /company or position/i);
  draft[0].value = 'Google';
  draft[4].value = '2026-02-30';
  assert.throws(() => instance.addApplicationDraft(draft, context), /date/i);
  draft[4].value = '';
  draft[3].value = 'Removed option';
  assert.throws(() => instance.addApplicationDraft(draft, context), /option/i);
  assert.equal(instance.getTracker().rows.length, 0);
  assert.equal(instance.state.revision, 1);
});

test('Add creates exactly one normalized row using renamed canonical options', () => {
  const instance = app();
  instance.getTracker().columns[3].options[0].label = 'Submitted';
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[1].value = 'Frontend developer';
  draft[3].value = 'Submitted';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.equal(instance.state.revision, 2);
  assert.equal(instance.getTracker().rows.length, 1);
  assert.equal(instance.getTracker().rows[0][0].value, '');
  assert.equal(instance.getTracker().rows[0][3].value, 'Submitted');
  assert.equal(instance.syncs, 2);
  assert.throws(() => instance.addApplicationDraft(draft, context), /changed/i);
  assert.equal(instance.getTracker().rows.length, 1);
});

test('Add preserves custom fields and rejects schema or search changes', () => {
  const instance = app();
  instance.getTracker().columns.push({ name: 'Remote', type: 'checkbox' });
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  const customIndex = instance.getTracker().columns.length - 1;
  draft[0].value = 'Company';
  draft[customIndex].value = true;
  instance.addApplicationDraft(draft, context);
  assert.deepEqual(instance.getTracker().rows[0][customIndex], { value: true, type: 'checkbox' });
  const nextContext = instance.captureApplicationContext();
  instance.getTracker().columns[0].name = 'Changed schema';
  assert.throws(() => instance.addApplicationDraft(draft, nextContext), /changed/i);
});

test('Add saves Next Action and Next Action Date as typed optional data', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Google';
  draft[1].value = 'Software Engineer';
  draft[8].value = 'Follow up with recruiter';
  draft[9].value = '2026-11-15';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.equal(instance.getTracker().rows.length, 1);
  assert.deepEqual(instance.getTracker().rows[0][8], { value: 'Follow up with recruiter', type: 'text' });
  assert.deepEqual(instance.getTracker().rows[0][9], { value: '2026-11-15', type: 'date' });

  // Adding with empty Next Action and Next Action Date
  const nextContext = instance.captureApplicationContext();
  const draft2 = instance.createApplicationDraft();
  draft2[0].value = 'Meta';
  draft2[1].value = 'Product Designer';
  draft2[8].value = '';
  draft2[9].value = '';
  assert.equal(instance.addApplicationDraft(draft2, nextContext), true);
  assert.equal(instance.getTracker().rows.length, 2);
  // unshift puts the newest row at index 0
  assert.deepEqual(instance.getTracker().rows[0][8], { value: '', type: 'text' });
  assert.deepEqual(instance.getTracker().rows[0][9], { value: '', type: 'date' });
  assert.deepEqual(instance.getTracker().rows[1][8], { value: 'Follow up with recruiter', type: 'text' });
  assert.deepEqual(instance.getTracker().rows[1][9], { value: '2026-11-15', type: 'date' });

  // Invalid date for Next Action Date should throw
  const invalidContext = instance.captureApplicationContext();
  const draft3 = instance.createApplicationDraft();
  draft3[0].value = 'Netflix';
  draft3[9].value = 'not-a-valid-date';
  assert.throws(() => instance.addApplicationDraft(draft3, invalidContext), /date/i);
});

test('Add saves Work Setup and Employment Type as optional select data', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Stripe';
  draft[1].value = 'Backend Engineer';
  draft[6].value = 'Remote';
  draft[7].value = 'Full-time';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.equal(instance.getTracker().rows.length, 1);
  assert.deepEqual(instance.getTracker().rows[0][6], { value: 'Remote', type: 'select' });
  assert.deepEqual(instance.getTracker().rows[0][7], { value: 'Full-time', type: 'select' });

  // Adding with empty Work Setup and Employment Type
  const nextContext = instance.captureApplicationContext();
  const draft2 = instance.createApplicationDraft();
  draft2[0].value = 'Vercel';
  draft2[1].value = 'DevRel';
  assert.equal(draft2[6].value, '');
  assert.equal(draft2[7].value, '');
  assert.equal(instance.addApplicationDraft(draft2, nextContext), true);
  assert.equal(instance.getTracker().rows.length, 2);
  assert.deepEqual(instance.getTracker().rows[0][6], { value: '', type: 'select' });
  assert.deepEqual(instance.getTracker().rows[0][7], { value: '', type: 'select' });

  // Adding with invalid option for Work Setup throws error
  const invalidContext1 = instance.captureApplicationContext();
  const draft3 = instance.createApplicationDraft();
  draft3[0].value = 'Airbnb';
  draft3[6].value = 'WFH Only';
  assert.throws(() => instance.addApplicationDraft(draft3, invalidContext1), /Work Setup/i);

  // Adding with invalid option for Employment Type throws error
  const invalidContext2 = instance.captureApplicationContext();
  const draft4 = instance.createApplicationDraft();
  draft4[0].value = 'Airbnb';
  draft4[7].value = 'Volunteer';
  assert.throws(() => instance.addApplicationDraft(draft4, invalidContext2), /Employment Type/i);
});

test('legacy 8-column tracker remains functional without errors', () => {
  const instance = app();
  instance.getTracker().columns = [
    { name: 'Company', type: 'text' },
    { name: 'Position', type: 'text' },
    { name: 'Platform', type: 'select', options: ['LinkedIn'] },
    { name: 'Status', type: 'select', options: ['Applied'] },
    { name: 'Date', type: 'date' },
    { name: 'Link', type: 'text' },
    { name: 'Next Action', type: 'text' },
    { name: 'Next Action Date', type: 'date' },
  ];
  instance.getTracker().rows = [
    [
      { value: 'Legacy Co', type: 'text' },
      { value: 'Engineer', type: 'text' },
      { value: 'LinkedIn', type: 'select' },
      { value: 'Applied', type: 'select' },
      { value: '2026-11-01', type: 'date' },
      { value: '', type: 'text' },
      { value: 'Follow up', type: 'text' },
      { value: '2026-11-10', type: 'date' },
    ]
  ];
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  assert.equal(draft.length, 8);
  draft[0].value = 'New Legacy Application';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.equal(instance.getTracker().rows.length, 2);
  assert.equal(instance.getTracker().rows[0].length, 8);
});

test('Add rejected persistence restores canonical rows instead of showing a fake saved card', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Not saved';
  const newer = Storage.load();
  newer.data[newer.active].title = 'Other tab';
  Storage.save(newer);
  assert.equal(instance.addApplicationDraft(draft, context), false);
  assert.equal(instance.getTracker().rows.length, 0);
  assert.equal(instance.getTracker().title, 'Other tab');
});

test('Add application triggers success toast with success: true', () => {
  const instance = app();
  const context = instance.captureApplicationContext();
  const draft = instance.createApplicationDraft();
  draft[0].value = 'Toast Corp';
  assert.equal(instance.addApplicationDraft(draft, context), true);
  assert.deepEqual(instance.lastToast, {
    message: 'Application added.',
    options: { success: true },
  });
});
