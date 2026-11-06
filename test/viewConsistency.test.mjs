import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.document = new EventTarget();
globalThis.document.getElementById = () => null;

const { trackerActionMethods } = await import('../js/main/trackerActions.js');

test('does not redraw a rejected persisted mutation', () => {
  let rendered = false;
  let reloaded = false;

  const app = {
    getTracker() {
      return { title: 'Tracker', columns: [], rows: [] };
    },
    renderKanban() {
      rendered = true;
    },
    reloadStateFromStorage() {
      reloaded = true;
    },
    save() {
      return false;
    },
  };

  assert.equal(trackerActionMethods.refresh.call(app), false);
  assert.equal(rendered, false);
  assert.equal(reloaded, true);
});

test('does not save when refresh only updates Kanban', () => {
  let saveCalls = 0;

  const app = {
    dashboardModal: null,
    getTracker() {
      return { title: 'Tracker', columns: [], rows: [] };
    },
    renderKanban() {},
    renderSelectTextSortOptions() {},
    renderSelectValueFilterOptions() {},
    updateSelectTextSortVisibility() {},
    applySearchFilter() {},
    titleInput: { value: '' },
    save() {
      saveCalls += 1;
    },
  };

  trackerActionMethods.refresh.call(app, { persist: false });
  assert.equal(saveCalls, 0);
});

test('does not redraw a rejected application move', () => {
  let refreshCalls = 0;
  let reloadCalls = 0;
  const tracker = {
    columns: [{ name: 'Company', type: 'text' }],
    rows: [[{ value: 'Alpha', type: 'text' }], [{ value: 'Beta', type: 'text' }]],
  };

  const app = {
    getTracker() {
      return tracker;
    },
    reloadStateFromStorage() {
      reloadCalls += 1;
    },
    refresh() {
      refreshCalls += 1;
    },
    save() {
      return false;
    },
  };

  assert.equal(trackerActionMethods.moveApplication.call(app, 0, 1), false);
  assert.equal(refreshCalls, 0);
  assert.equal(reloadCalls, 1);
});
