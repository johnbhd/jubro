import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
globalThis.document.getElementById = () => null;

const { Table } = await import('../js/main/table.js');
const { trackerTableActionMethods } = await import('../js/main/trackerTableActions.js');

test('does not redraw a rejected persisted mutation', () => {
  const originalRender = Table.render;
  let rendered = false;
  let reloaded = false;

  Table.render = () => {
    rendered = true;
  };

  try {
    const app = {
      getTracker() {
        return {
          title: 'Tracker',
          columns: [],
          rows: [],
        };
      },
      renderKanban() {},
      reloadStateFromStorage() {
        reloaded = true;
      },
      save() {
        return false;
      },
    };

    assert.equal(trackerTableActionMethods.refresh.call(app), false);
    assert.equal(rendered, false);
    assert.equal(reloaded, true);
  } finally {
    Table.render = originalRender;
  }
});

test('does not save when refresh only updates a view', () => {
  const originalRender = Table.render;
  let saveCalls = 0;

  Table.render = () => {};

  try {
    const app = {
      dashboardModal: null,
      getTableRowsForRender() {
        return [];
      },
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

    trackerTableActionMethods.refresh.call(app, { persist: false });
    assert.equal(saveCalls, 0);
  } finally {
    Table.render = originalRender;
  }
});

test('does not redraw a rejected row or column move', () => {
  let refreshCalls = 0;
  let reloadCalls = 0;

  const app = {
    clearTableSortControls() {},
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
    trackerTableActionMethods.persistTableMove.call(app),
    false
  );
  assert.equal(refreshCalls, 0);
  assert.equal(reloadCalls, 1);
});
