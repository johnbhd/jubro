import assert from 'node:assert/strict';
import test from 'node:test';

const { applicationEditorMethods } = await import('../js/main/applicationEditor.js');

test('keeps application editor input when a stale save is rejected', () => {
  const row = [{ value: 'Original', type: 'text' }];
  const input = {
    dataset: { fieldKey: '0' },
    value: 'Unsaved Draft',
  };
  let closed = false;

  globalThis.document = {
    querySelectorAll() {
      return [input];
    },
  };

  const editor = {
    ...applicationEditorMethods,
    activeApplicationEditRowIndex: 0,
    closeApplicationEditModal() {
      closed = true;
    },
    getApplicationEditFieldType() {
      return 'text';
    },
    getApplicationEditFields() {
      return [{ key: '0', index: 0 }];
    },
    getTracker() {
      return {
        columns: [{ name: 'Company', type: 'text' }],
        rows: [row],
      };
    },
    save() {
      return false;
    },
  };

  editor.saveApplicationEditModal();

  assert.equal(closed, false);
  assert.equal(input.value, 'Unsaved Draft');
});

test('saves application checkbox editor as a Boolean', () => {
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
    ...applicationEditorMethods,
    activeApplicationEditRowIndex: 0,
    closeApplicationEditModal() {},
    getApplicationEditFieldType() {
      return 'checkbox';
    },
    getApplicationEditFields() {
      return [{ key: '0', index: 0 }];
    },
    getTracker() {
      return {
        columns: [{ name: 'Done', type: 'checkbox' }],
        rows: [row],
      };
    },
    refresh() {},
    save() {
      return true;
    },
  };

  editor.saveApplicationEditModal();

  assert.equal(row[0].value, true);
  assert.equal(typeof row[0].value, 'boolean');
});

test('refreshes Kanban after a successful application edit', () => {
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
    ...applicationEditorMethods,
    activeApplicationEditRowIndex: 0,
    closeApplicationEditModal() {},
    getApplicationEditFieldType() {
      return 'text';
    },
    getApplicationEditFields() {
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
    save() {
      return true;
    },
  };

  editor.saveApplicationEditModal();

  assert.deepEqual(refreshOptions, { persist: false });
  assert.equal(row[0].value, 'Updated');
});
