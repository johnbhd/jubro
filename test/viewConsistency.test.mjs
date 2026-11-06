import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
globalThis.document.getElementById = () => null;

const { trackerActionMethods } = await import('../js/main/trackerActions.js');

test('does not redraw a rejected persisted mutation', () => {
  let reloaded = false;

  const app = {
    getTracker() {
      return {
        title: 'Tracker',
        columns: [],
        rows: [],
      };
    },
    reloadStateFromStorage() {
      reloaded = true;
    },
    save() {
      return false;
    },
  };

  assert.equal(trackerActionMethods.refresh.call(app), false);
  assert.equal(reloaded, true);
});

test('does not save when refresh only updates a view', () => {
  let saveCalls = 0;

  const app = {
    dashboardModal: null,
    getTracker() {
      return {
        title: 'Tracker',
        columns: [],
        rows: [],
      };
    },
    renderKanban() {},
    renderListView() {},
    renderSelectTextSortOptions() {},
    renderSelectValueFilterOptions() {},
    updateBoardView() {},
    updateListFilterChipStyles() {},
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

test('does not redraw a rejected row move', () => {
  let refreshCalls = 0;
  let reloadCalls = 0;

  const app = {
    clearSortControls() {},
    getTracker() {
      return {
        columns: [],
        rows: [],
      };
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

  assert.equal(
    trackerActionMethods.persistRowMove.call(app),
    false
  );
  assert.equal(refreshCalls, 0);
  assert.equal(reloadCalls, 1);
});

test('shows a creation toast after a successful Add Application save', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
    ],
    rows: [],
  };
  let toastMessage = '';

  const app = {
    getTracker() {
      return tracker;
    },
    getColumnIndexByNames() {
      return 0;
    },
    getDateColumnIndex() {
      return -1;
    },
    refresh() {
      return true;
    },
    showToast(message) {
      toastMessage = message;
    },
  };

  assert.equal(
    trackerActionMethods.addRow.call(app, {
      useJobDefaults: true,
      insertAtStart: true,
    }),
    true,
  );
  assert.equal(tracker.rows.length, 1);
  assert.equal(toastMessage, 'New application created.');
});
