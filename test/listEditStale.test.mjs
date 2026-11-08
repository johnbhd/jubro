import assert from 'node:assert/strict';
import test from 'node:test';

const { listEditMethods } = await import('../js/main/listView/editModal.js');

test('stale edit restores canonical data while preserving uncommitted input', async () => {
  globalThis.localStorage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, String(value)); },
  };
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  const { Storage } = await import('../js/storage/storage.js');
  const { trackerStateMethods } = await import('../js/main/trackerState.js');
  Storage.useGuestWorkspace();
  const state = {
    active: 'one',
    data: { one: {
      id: 'one', title: 'Search',
      columns: [{ name: 'Company', type: 'text' }],
      rows: [[{ value: 'Original', type: 'text' }]],
    } },
  };
  Storage.save(state);
  const input = {
    dataset: { fieldKey: '0' },
    value: 'Unsaved Draft',
  };
  let closed = false;
  let rendered = false;

  document.querySelectorAll = () => [input];

  const editor = {
    ...listEditMethods,
    ...trackerStateMethods,
    state,
    activeListEditRowIndex: 0,
    applySearchFilter() {},
    closeListEditModal() {
      closed = true;
    },
    ensureListEditColumn(_tracker, field) {
      return field.index;
    },
    getListEditFieldType() {
      return 'text';
    },
    getListEditFields() {
      return [{ key: '0', index: 0 }];
    },
    refresh() {
      rendered = true;
    },
  };

  const newer = Storage.load();
  newer.data.one.rows[0][0].value = 'Newer saved value';
  Storage.save(newer);

  editor.saveListEditModal();

  assert.equal(closed, false);
  assert.equal(rendered, true);
  assert.equal(input.value, 'Unsaved Draft');
  assert.equal(editor.getTracker().rows[0][0].value, 'Newer saved value');
  assert.equal(Storage.load().revision, 2);
});

test('saves a List checkbox editor as a Boolean', () => {
  const row = [{ value: false, type: 'checkbox' }];
  const input = {
    dataset: { fieldKey: '0' },
    type: 'checkbox',
    checked: true,
    value: 'on',
  };

  globalThis.document = {
    querySelectorAll() {
      return [input];
    },
  };

  const editor = {
    ...listEditMethods,
    activeListEditRowIndex: 0,
    applySearchFilter() {},
    closeListEditModal() {},
    ensureListEditColumn(_tracker, field) {
      return field.index;
    },
    getListEditFieldType() {
      return 'checkbox';
    },
    getListEditFields() {
      return [{ key: '0', index: 0 }];
    },
    getTracker() {
      return {
        columns: [{ name: 'Done', type: 'checkbox' }],
        rows: [row],
      };
    },
    refresh() {},
    renderListView() {},
    save() {
      return true;
    },
  };

  editor.saveListEditModal();

  assert.equal(row[0].value, true);
  assert.equal(typeof row[0].value, 'boolean');
});

test('refreshes both views after a successful List edit', () => {
  const row = [{ value: 'Original', type: 'text' }];
  const input = {
    dataset: { fieldKey: '0' },
    value: 'Updated',
  };
  let refreshOptions = null;

  globalThis.document = {
    querySelectorAll() {
      return [input];
    },
  };

  const editor = {
    ...listEditMethods,
    activeListEditRowIndex: 0,
    applySearchFilter() {},
    closeListEditModal() {},
    ensureListEditColumn(_tracker, field) {
      return field.index;
    },
    getListEditFieldType() {
      return 'text';
    },
    getListEditFields() {
      return [{ key: '0', index: 0 }];
    },
    getTracker() {
      return {
        columns: [{ name: 'Company', type: 'text' }],
        rows: [row],
      };
    },
    refresh(options) {
      refreshOptions = options;
    },
    renderListView() {},
    save() {
      return true;
    },
  };

  editor.saveListEditModal();

  assert.deepEqual(refreshOptions, { persist: false });
});
