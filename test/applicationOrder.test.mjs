import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
globalThis.document.getElementById = () => null;

const { trackerActionMethods } = await import('../js/main/trackerActions.js');

function fixture() {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Status', type: 'select', options: ['Applied', 'Interview'] },
    ],
    rows: [
      ['Google', { value: 'Applied', type: 'select', note: 'keep' }],
      ['Hidden', 'Interview'],
      ['Meta', 'Applied'],
      ['Microsoft', 'Interview'],
      ['Blank', ''],
    ],
  };
  let saves = 0;
  let redraws = 0;
  let reloads = 0;
  let manual = 0;
  const app = {
    ...trackerActionMethods,
    getTracker: () => tracker,
    save: () => { saves += 1; return true; },
    refresh: (options) => { assert.deepEqual(options, { persist: false }); redraws += 1; },
    reloadStateFromStorage: () => { reloads += 1; },
    setListManualSort: () => { manual += 1; },
    clearSortControls: () => assert.fail('Filters must remain active'),
  };
  return {
    app, tracker,
    names: () => tracker.rows.map(row => row[0]),
    counts: () => ({ saves, redraws, reloads, manual }),
  };
}

test('inserts above and below cards while preserving every other row', () => {
  const f = fixture();
  const originalRows = [...f.tracker.rows];
  assert.equal(f.app.repositionApplication({ sourceIndex: 3, targetIndex: 0, placement: 'before' }), true);
  assert.deepEqual(f.names(), ['Microsoft', 'Google', 'Hidden', 'Meta', 'Blank']);
  assert.equal(f.app.repositionApplication({ sourceIndex: 0, targetIndex: 3, placement: 'after' }), true);
  assert.deepEqual(f.names(), ['Google', 'Hidden', 'Meta', 'Microsoft', 'Blank']);
  assert.deepEqual(f.tracker.rows, originalRows);
  assert.deepEqual(f.counts(), { saves: 2, redraws: 2, reloads: 0, manual: 2 });
});

test('changes status and position atomically with one save and preserves cell metadata', () => {
  const f = fixture();
  assert.equal(f.app.repositionApplication({ sourceIndex: 0, targetIndex: 3, placement: 'after', statusValue: 'Interview' }), true);
  assert.deepEqual(f.names(), ['Hidden', 'Meta', 'Microsoft', 'Google', 'Blank']);
  assert.deepEqual(f.tracker.rows[3][1], { value: 'Interview', type: 'select', note: 'keep' });
  assert.deepEqual(f.counts(), { saves: 1, redraws: 1, reloads: 0, manual: 1 });
});

test('column append uses the last underlying destination card, including hidden rows', () => {
  const f = fixture();
  f.app.repositionApplication({ sourceIndex: 0, statusValue: 'Interview' });
  assert.deepEqual(f.names(), ['Hidden', 'Meta', 'Microsoft', 'Google', 'Blank']);
});

test('blank fallback and empty destination keep canonical status semantics', () => {
  const f = fixture();
  f.app.repositionApplication({ sourceIndex: 0, statusValue: '' });
  assert.equal(f.tracker.rows.at(-1)[1].value, '');
  f.tracker.columns[1].options.push('Offer');
  f.app.repositionApplication({ sourceIndex: 0, statusValue: 'Offer' });
  assert.equal(f.tracker.rows.at(-1)[0], 'Hidden');
  assert.equal(f.tracker.rows.at(-1)[1].value, 'Offer');
});

test('invalid indices, placement, statuses, and unchanged positions never save', () => {
  const f = fixture();
  for (const move of [
    { sourceIndex: -1, targetIndex: 0 },
    { sourceIndex: 0, targetIndex: 99 },
    { sourceIndex: 0, targetIndex: 1, placement: 'invalid' },
    { sourceIndex: 0, targetIndex: 1, statusValue: 'Unknown' },
    { sourceIndex: 0, targetIndex: 0 },
    { sourceIndex: 0, targetIndex: 1, placement: 'before' },
  ]) {
    assert.equal(f.app.repositionApplication(move), false);
  }
  assert.deepEqual(f.counts(), { saves: 0, redraws: 0, reloads: 0, manual: 0 });
});

test('appending the last card in its existing status column is a no-op', () => {
  const f = fixture();
  assert.equal(f.app.repositionApplication({ sourceIndex: 2, statusValue: 'Applied' }), false);
  assert.deepEqual(f.names(), ['Google', 'Hidden', 'Meta', 'Microsoft', 'Blank']);
  f.tracker.rows = [['Only', 'Applied'], ['Elsewhere', 'Interview']];
  assert.equal(f.app.repositionApplication({ sourceIndex: 0, statusValue: 'Applied' }), false);
  assert.deepEqual(f.names(), ['Only', 'Elsewhere']);
  assert.equal(f.counts().saves, 0);
});

test('status-only change does not replace the List sort preference', () => {
  const f = fixture();
  f.app.repositionApplication({ sourceIndex: 0, targetIndex: 1, placement: 'before', statusValue: 'Interview' });
  assert.deepEqual(f.counts(), { saves: 1, redraws: 1, reloads: 0, manual: 0 });
});

test('missing Status allows row ordering but never creates a Status field', () => {
  const f = fixture();
  f.tracker.columns.pop();
  f.app.repositionApplication({ sourceIndex: 2, targetIndex: 0, placement: 'before' });
  assert.equal(f.names()[0], 'Meta');
  assert.equal(f.tracker.columns.length, 1);
  assert.equal(f.app.repositionApplication({ sourceIndex: 0, statusValue: 'Applied' }), false);
});

test('failed and thrown saves reload canonical state without redraw or preference changes', () => {
  for (const throws of [false, true]) {
    const f = fixture();
    f.app.save = () => {
      if (throws) throw new Error('Storage failed');
      return false;
    };
    const move = () => f.app.repositionApplication({ sourceIndex: 3, targetIndex: 0, placement: 'before' });
    if (throws) assert.throws(move, /Storage failed/);
    else assert.equal(move(), false);
    assert.deepEqual(f.counts(), { saves: 0, redraws: 0, reloads: 1, manual: 0 });
  }
});

test('keyboard movement uses only visible neighboring cards and stops at boundaries', () => {
  const f = fixture();
  const visible = [0, 2].map(index => ({
    dataset: { rowIndex: String(index) },
    classList: { contains: () => false },
  }));
  const hidden = { dataset: { rowIndex: '1' }, classList: { contains: () => true } };
  f.app.viewSelect = { value: 'list' };
  f.app.listCards = { querySelectorAll: () => [visible[0], hidden, visible[1]] };
  assert.equal(f.app.moveApplicationByDirection(0, -1), false);
  assert.equal(f.app.moveApplicationByDirection(0, 1), true);
  assert.deepEqual(f.names(), ['Hidden', 'Meta', 'Google', 'Microsoft', 'Blank']);
  assert.equal(f.counts().saves, 1);
});

test('date-sorted List buttons switch to Manual when saved order already matches the requested move', () => {
  for (const [sourceIndex, direction] of [[1, 1], [0, -1]]) {
    const f = fixture();
    f.tracker.rows = [['A', 'Applied'], ['B', 'Applied']];
    f.app.viewSelect = { value: 'list' };
    f.app.listSortSelect = { value: 'date-desc' };
    f.app.setListManualSort = () => { f.app.listSortSelect.value = 'manual'; };
    const cards = [1, 0].map(index => ({
      dataset: { rowIndex: String(index) },
      classList: { contains: () => false },
    }));
    f.app.listCards = { querySelectorAll: () => cards };
    assert.equal(f.app.moveApplicationByDirection(sourceIndex, direction), true);
    assert.equal(f.app.listSortSelect.value, 'manual');
    assert.deepEqual(f.names(), ['A', 'B']);
    assert.equal(f.counts().saves, 0);
    assert.equal(f.counts().redraws, 1);
  }
});

test('real storage persists shared order with one revision and one logical sync', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const { Storage } = await import('../js/storage/storage.js');
  const { trackerStateMethods } = await import('../js/main/trackerState.js');
  const { firebaseTrackerSync } = await import('../js/storage/firebaseTrackerSync.js');
  const { JSONService } = await import('../js/services/jsonService.js');
  const { groupKanbanRows } = await import('../js/main/kanban.js');
  const { listSortMethods } = await import('../js/main/listView/sorting.js');
  const { __resetFirebase, __getWrites } = await import('./fixtures/firebase.mjs');
  __resetFirebase();
  const f = fixture();
  const user = { uid: 'order-test', email: 'order@example.invalid' };
  Storage.useAccountWorkspace(user.uid);
  const state = Storage.load();
  state.active = 'order';
  state.data.order = { ...f.tracker, id: 'order', title: 'Order' };
  Storage.save(state);
  const initialRevision = state.revision;
  f.app.state = state;
  f.app.getTracker = () => state.data.order;
  f.app.cancelScheduledTitleSync = () => {};
  f.app.save = trackerStateMethods.save;
  f.app.syncLocalStateToFirebase = () => {
    f.app.pendingSync = firebaseTrackerSync.syncCurrentLocalState(user);
    return f.app.pendingSync;
  };
  assert.equal(f.app.repositionApplication({
    sourceIndex: 0, targetIndex: 3, placement: 'after', statusValue: 'Interview',
  }), true);
  await f.app.pendingSync;
  const saved = Storage.load();
  assert.equal(saved.revision, initialRevision + 1);
  assert.equal(__getWrites().length, 2, 'One logical upload writes two compatibility documents.');
  const service = new JSONService();
  let exported;
  service.downloadJson = value => { exported = JSON.stringify(value); };
  service.exportAll(saved);
  const imported = service.parseFullBackupText(exported).data.order;
  assert.deepEqual(imported.rows.map(row => row[0].value), ['Hidden', 'Meta', 'Microsoft', 'Google', 'Blank']);
  const interview = groupKanbanRows(imported).groups.find(group => group.value === 'Interview');
  assert.deepEqual(interview.rowIndexes, [0, 2, 3]);
  const list = listSortMethods.getSortedListRows.call({ listSortSelect: { value: 'manual' } }, imported);
  assert.deepEqual(list.map(item => item.rowIndex), [0, 1, 2, 3, 4]);
});
