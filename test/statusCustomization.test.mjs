import assert from 'node:assert/strict';
import test from 'node:test';
import { getKanbanColumns, kanbanMethods } from '../js/main/kanban.js';
import { normalizeSingleTrackerImport } from '../js/services/trackerData.js';
import { trackerUtilityMethods } from '../js/main/trackerUtils.js';

function tracker() {
  return {
    id: '1',
    title: 'Jobs',
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Status', type: 'select', options: ['Applied', 'Interview', 'Rejected'] },
    ],
    rows: [
      ['Google', { value: 'Applied', type: 'select', preserved: true }],
      ['Meta', ' applied '],
      ['Microsoft', { value: 'Interview', type: 'select' }],
      ['Blank', { value: '', type: 'select' }],
    ],
  };
}

async function createApp() {
  const { statusSettingsMethods } = await import('../js/main/statusSettings.js');
  const original = tracker();
  return {
    ...trackerUtilityMethods,
    ...kanbanMethods,
    ...statusSettingsMethods,
    tracker: original,
    saved: structuredClone(original),
    saves: 0,
    refreshes: 0,
    activeListFilters: { 1: 'Applied' },
    selectTextSortSelect: { value: '1' },
    selectValueFilterSelect: { value: 'Applied' },
    getTracker() { return this.tracker; },
    save() {
      this.saves += 1;
      this.saved = structuredClone(this.tracker);
      return true;
    },
    refresh(options) {
      assert.deepEqual(options, { persist: false });
      this.refreshes += 1;
    },
    reloadStateFromStorage() {
      this.tracker = structuredClone(this.saved);
      this.refresh({ persist: false });
    },
  };
}

test('legacy status colors derive from labels without mutating the tracker', () => {
  const value = tracker();
  const before = structuredClone(value);
  assert.deepEqual(getKanbanColumns(value).slice(0, 3).map((column) => column.color), [
    '#3b82f6', '#22c55e', '#ef4444',
  ]);
  assert.deepEqual(value, before);
});

test('controlled colors round-trip imports and share presentation with List and filters', () => {
  const value = tracker();
  value.columns[1].options[1] = { label: 'Interview', color: 'purple' };
  const imported = normalizeSingleTrackerImport(JSON.parse(JSON.stringify(value)));
  assert.deepEqual(imported.columns[1].options[1], { label: 'Interview', color: 'purple' });
  assert.equal(getKanbanColumns(imported)[1].color, '#a855f7');
  assert.equal(trackerUtilityMethods.getDashboardOptions(imported.columns[1])[1].color, '#a855f7');
});

test('legacy strings and hex colors remain importable; arbitrary CSS and unknown keys fail', () => {
  const value = tracker();
  value.columns[1].options[0] = { label: 'Applied', color: '#123456' };
  assert.equal(normalizeSingleTrackerImport(value).columns[1].options[0].color, '#123456');
  assert.equal(getKanbanColumns(normalizeSingleTrackerImport(value))[1].color, '#22c55e');
  for (const color of ['chartreuse', 'rgb(1,2,3)', 'linear-gradient(red,blue)', '__proto__', {}]) {
    value.columns[1].options[0] = { label: 'Applied', color };
    assert.throws(() => normalizeSingleTrackerImport(value), /color/i);
  }
});

test('rename atomically updates matching object and primitive cells and active filters', async () => {
  const app = await createApp();
  assert.equal(app.updateStatusOption(0, { label: ' Submitted ' }), true);
  assert.equal(app.tracker.columns[1].options[0].label, 'Submitted');
  assert.deepEqual(app.tracker.rows[0], ['Google', {
    value: 'Submitted', type: 'select', preserved: true,
  }]);
  assert.equal(app.tracker.rows[1][1].value, 'Submitted');
  assert.equal(app.tracker.rows[2][1].value, 'Interview');
  assert.equal(app.tracker.rows[3][1].value, '');
  assert.equal(app.activeListFilters[1], 'Submitted');
  assert.equal(app.selectValueFilterSelect.value, 'Submitted');
  assert.equal(app.saves, 1);
  assert.equal(app.refreshes, 1);
});

test('blank, duplicate, fallback and invalid index edits do not mutate or save', async () => {
  const app = await createApp();
  const before = structuredClone(app.tracker);
  for (const [index, changes] of [
    [0, { label: '   ' }], [1, { label: ' applied ' }],
    [-1, { label: 'Bad' }], [3, { label: 'No status' }],
    [0, { color: 'url(evil)' }],
  ]) {
    assert.throws(() => app.updateStatusOption(index, changes));
  }
  assert.deepEqual(app.tracker, before);
  assert.equal(app.saves, 0);
});

test('move left/right reorders actual options once and preserves all row values', async () => {
  const app = await createApp();
  const rows = structuredClone(app.tracker.rows);
  assert.equal(app.updateStatusOption(2, { direction: -1 }), true);
  assert.deepEqual(app.tracker.columns[1].options, ['Applied', 'Rejected', 'Interview']);
  assert.equal(app.saves, 1);
  assert.equal(app.updateStatusOption(1, { direction: 1 }), true);
  assert.deepEqual(app.tracker.columns[1].options, ['Applied', 'Interview', 'Rejected']);
  assert.deepEqual(app.tracker.rows, rows);
  assert.equal(app.saves, 2);
  assert.equal(app.updateStatusOption(0, { direction: -1 }), false);
  assert.equal(app.updateStatusOption(2, { direction: 1 }), false);
  assert.equal(app.saves, 2);
});

test('color changes persist a key without altering names, order or application values', async () => {
  const app = await createApp();
  const rows = structuredClone(app.tracker.rows);
  assert.equal(app.updateStatusOption(1, { color: 'purple' }), true);
  assert.deepEqual(app.tracker.columns[1].options, [
    'Applied', { label: 'Interview', color: 'purple' }, 'Rejected',
  ]);
  assert.deepEqual(app.tracker.rows, rows);
  assert.equal(app.saves, 1);
  assert.equal(app.updateStatusOption(1, { color: 'purple' }), false);
  assert.equal(app.saves, 1);
});

test('delete status choice removes option, clears affected row statuses, updates filters, and saves', async () => {
  const app = await createApp();
  // Add a row with Rejected status
  app.tracker.rows.push(['Apple', { value: 'Rejected', type: 'select' }]);
  app.activeListFilters[1] = 'Rejected';

  assert.equal(app.deleteStatusOption(2), true);
  assert.deepEqual(app.tracker.columns[1].options, ['Applied', 'Interview']);
  assert.equal(app.tracker.rows[4][1].value, '');
  assert.equal(app.activeListFilters[1], undefined);
  assert.equal(app.saves, 1);
  assert.equal(app.refreshes, 1);

  // Deleting down to 1 option succeeds
  assert.equal(app.deleteStatusOption(1), true);
  assert.deepEqual(app.tracker.columns[1].options, ['Applied']);
  assert.equal(app.saves, 2);

  // Deleting the final option throws and rejects mutation
  assert.throws(() => app.deleteStatusOption(0), /at least one status/i);
  assert.deepEqual(app.tracker.columns[1].options, ['Applied']);
  assert.equal(app.saves, 2);
});

test('custom hex color saves once and round-trips through shared status presentation', async () => {
  const app = await createApp();
  const rows = structuredClone(app.tracker.rows);
  assert.equal(app.updateStatusOption(2, { color: '#D946EF' }), true);
  assert.deepEqual(app.tracker.columns[1].options, [
    'Applied', 'Interview', { label: 'Rejected', color: '#D946EF' },
  ]);
  assert.deepEqual(app.tracker.rows, rows);
  assert.equal(app.saves, 1);
  const imported = normalizeSingleTrackerImport(JSON.parse(JSON.stringify(app.saved)));
  assert.equal(getKanbanColumns(imported)[2].color, '#D946EF');
  assert.equal(trackerUtilityMethods.getDashboardOptions(imported.columns[1])[2].color, '#D946EF');
});

test('invalid custom colors are rejected before mutation and have safe display fallbacks', async () => {
  const app = await createApp();
  const before = structuredClone(app.tracker);
  for (const color of ['#bad', '#12345G', '#12345678', 'rgb(1,2,3)', 'url(evil)', 'linear-gradient(red,blue)']) {
    assert.throws(() => app.updateStatusOption(2, { color }), /color/i);
    const imported = structuredClone(before);
    imported.columns[1].options[2] = { label: 'Rejected', color };
    assert.throws(() => normalizeSingleTrackerImport(imported), /color/i);
    assert.equal(getKanbanColumns(imported)[2].color, '#ef4444');
  }
  assert.deepEqual(app.tracker, before);
  assert.equal(app.saves, 0);
});

test('existing custom colors remain unchanged when the same value is saved', async () => {
  const app = await createApp();
  app.tracker.columns[1].options[2] = { label: 'Rejected', color: '#D946EF' };
  assert.equal(app.updateStatusOption(2, { color: '#D946EF' }), false);
  assert.equal(app.saves, 0);
});

test('rejected save restores canonical status and filters', async () => {
  const app = await createApp();
  app.save = () => false;
  assert.equal(app.updateStatusOption(0, { label: 'Submitted' }), false);
  assert.deepEqual(app.tracker, tracker());
  assert.equal(app.activeListFilters[1], 'Applied');
  assert.equal(app.selectValueFilterSelect.value, 'Applied');
});

test('drag/status movement after rename uses current labels', async () => {
  const app = await createApp();
  app.updateStatusOption(0, { label: 'Submitted' });
  assert.equal(app.moveKanbanRow(2, 'Submitted'), true);
  assert.equal(app.tracker.rows[2][1].value, 'Submitted');
  assert.equal(app.moveKanbanRow(2, 'Applied'), false);
  assert.equal(app.saves, 2);
});

test('legacy rename preserves its visual accent and custom fallback is stable', async () => {
  const app = await createApp();
  app.updateStatusOption(0, { label: 'Submitted' });
  assert.equal(getKanbanColumns(app.tracker)[0].color, '#3b82f6');
  app.tracker.columns[1].options = ['Wishlist', 'Technical Test'];
  const first = getKanbanColumns(app.tracker).slice(0, 2);
  app.tracker.columns[1].options.reverse();
  const second = getKanbanColumns(app.tracker).slice(0, 2).reverse();
  assert.deepEqual(first, second);
  assert.match(first[0].color, /^#[0-9a-f]{6}$/);
});

test('thrown storage errors also restore the canonical tracker', async () => {
  const app = await createApp();
  app.save = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => app.updateStatusOption(0, { label: 'Submitted' }), /Quota exceeded/);
  assert.deepEqual(app.tracker, tracker());
});

test('full backup export/import preserves color keys and strips untrusted style properties', async () => {
  const { JSONService } = await import('../js/services/jsonService.js');
  const service = new JSONService();
  const value = tracker();
  value.columns[1].options[0] = { label: 'Applied', color: 'blue', style: 'url(evil)' };
  value.columns[1].options[1] = { label: 'Interview', color: '#D946EF' };
  let text;
  service.downloadJson = (data) => { text = JSON.stringify(data); };
  service.exportAll({ active: '1', data: { 1: value } });
  const result = service.parseFullBackupText(text);
  assert.deepEqual(result.data['1'].columns[1].options[0], { label: 'Applied', color: 'blue' });
  assert.deepEqual(result.data['1'].columns[1].options[1], { label: 'Interview', color: '#D946EF' });
});

test('real storage and sync create one revision and one logical upload per customization', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const { Storage } = await import('../js/storage/storage.js');
  const { trackerStateMethods } = await import('../js/main/trackerState.js');
  const { firebaseTrackerSync } = await import('../js/storage/firebaseTrackerSync.js');
  const { __resetFirebase, __getWrites } = await import('./fixtures/firebase.mjs');
  __resetFirebase();
  const user = { uid: 'status-test', email: 'status@example.invalid' };
  Storage.useAccountWorkspace(user.uid);
  const state = Storage.load();
  state.active = '1';
  state.data['1'] = tracker();
  Storage.save(state);
  const app = await createApp();
  app.state = state;
  app.getTracker = () => state.data['1'];
  app.cancelScheduledTitleSync = () => {};
  app.save = trackerStateMethods.save;
  app.syncLocalStateToFirebase = () => {
    app.pendingSync = firebaseTrackerSync.syncCurrentLocalState(user);
    return app.pendingSync;
  };
  const initialRevision = state.revision;

  for (const [index, changes] of [
    [0, { label: 'Submitted' }], [1, { color: 'purple' }], [2, { direction: -1 }],
    [2, { color: '#D946EF' }],
  ]) {
    assert.equal(app.updateStatusOption(index, changes), true);
    await app.pendingSync;
  }

  assert.equal(Storage.load().revision, initialRevision + 4);
  assert.equal(__getWrites().length, 8, 'Four logical uploads each write two compatibility documents.');
  const saved = Storage.load().data['1'];
  assert.deepEqual(saved.columns[1].options, [
    { label: 'Submitted', color: 'blue' }, 'Rejected', { label: 'Interview', color: '#D946EF' },
  ]);
  assert.equal(saved.rows[0][1].value, 'Submitted');
});
