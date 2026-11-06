import assert from 'node:assert/strict';
import test from 'node:test';

const { listEditMethods } = await import('../js/main/listView/editModal.js');

test('keeps the edit modal open when a stale save is rejected', () => {
  const row = [{ value: 'Original', type: 'text' }];
  const input = {
    dataset: { fieldKey: '0' },
    value: 'Unsaved Draft',
  };
  let closed = false;
  let rendered = false;

  globalThis.document = {
    querySelectorAll() {
      return [input];
    },
  };

  const editor = {
    ...listEditMethods,
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
    getTracker() {
      return {
        columns: [{ name: 'Company', type: 'text' }],
        rows: [row],
      };
    },
    renderListView() {
      rendered = true;
    },
    save() {
      return false;
    },
  };

  editor.saveListEditModal();

  assert.equal(closed, false);
  assert.equal(rendered, false);
  assert.equal(input.value, 'Unsaved Draft');
});
