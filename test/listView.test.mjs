import assert from 'node:assert/strict';
import test from 'node:test';

const { trackerListViewMethods } = await import('../js/main/trackerListView.js');

function createClassList() {
  const values = new Set();

  return {
    toggle(name, force) {
      if (force === undefined) {
        if (values.has(name)) {
          values.delete(name);
        } else {
          values.add(name);
        }
      } else if (force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    },
    contains(name) {
      return values.has(name);
    },
  };
}

test('switches between Board and List without changing canonical tracker state', () => {
  const previousDocument = globalThis.document;
  const tracker = {
    rows: [[{ value: 'Google', type: 'text' }]],
  };
  const app = {
    ...trackerListViewMethods,
    viewSelect: { value: 'kanban' },
    kanbanView: { classList: createClassList() },
    listView: { classList: createClassList() },
    state: { active: 'tracker', data: { tracker } },
    saveBoardViewPreference() {},
    applySearchFilter() {},
  };

  globalThis.document = {
    querySelectorAll() {
      return [];
    },
  };

  try {
    trackerListViewMethods.setBoardView.call(app, 'list');
  } finally {
    globalThis.document = previousDocument;
  }

  assert.equal(app.viewSelect.value, 'list');
  assert.equal(app.kanbanView.classList.contains('hidden'), true);
  assert.equal(app.listView.classList.contains('hidden'), false);
  assert.equal(app.state.data.tracker.rows[0][0].value, 'Google');
});
