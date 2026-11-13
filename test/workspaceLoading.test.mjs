import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceLoading } from '../js/main/workspaceLoading.js';

function fixture() {
  const elements = new Map();
  function element() {
    return {
      hidden: false,
      inert: false,
      attributes: new Map(),
      children: [],
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      removeAttribute(name) {
        this.attributes.delete(name);
      },
      hasAttribute(name) {
        return this.attributes.has(name);
      },
      append(...children) {
        this.children.push(...children);
      },
      addEventListener() {},
    };
  }
  for (const id of ['appBody', 'workspaceLoading', 'boardWorkspace', 'appNavbar']) {
    elements.set(id, element());
  }
  globalThis.document = {
    documentElement: { dataset: {} },
    getElementById: (id) => elements.get(id),
    createElement: element,
  };
  globalThis.localStorage = { getItem: () => null };
  elements.get('boardWorkspace').parentElement = element();
  return { elements, loading: new WorkspaceLoading() };
}

test('loading hides data-dependent UI, marks busy, and releases controls without forcing hidden views open', () => {
  const { elements, loading } = fixture();
  const token = loading.begin();
  assert.equal(loading.isLoading, true);
  assert.equal(elements.get('workspaceLoading').hidden, false);
  assert.equal(elements.get('boardWorkspace').attributes.get('aria-busy'), 'true');
  assert.equal(elements.get('appNavbar').inert, true);
  elements.get('boardWorkspace').hidden = true;
  assert.equal(loading.finish(token), true);
  assert.equal(loading.isLoading, false);
  assert.equal(elements.get('workspaceLoading').hidden, true);
  assert.equal(elements.get('boardWorkspace').attributes.get('aria-busy'), 'false');
  assert.equal(elements.get('appNavbar').inert, false);
  assert.equal(elements.get('boardWorkspace').hidden, true);
});

test('stale completion cannot dismiss a newer loading state', () => {
  const { loading } = fixture();
  const first = loading.begin();
  const second = loading.begin();
  assert.equal(loading.isCurrent(first), false);
  assert.equal(loading.finish(first), false);
  assert.equal(loading.isLoading, true);
  assert.equal(loading.finish(second), true);
  assert.equal(loading.isLoading, false);
});

test('loading uses the current saved view without persisting preferences', () => {
  const { loading } = fixture();
  globalThis.localStorage = { getItem: () => 'list' };
  loading.begin();
  assert.equal(document.documentElement.dataset.loadingView, 'list');
  globalThis.localStorage = { getItem: () => 'invalid' };
  loading.begin();
  assert.equal(document.documentElement.dataset.loadingView, 'kanban');
});

test('unavailable preferences keep the initial safe view and do not block loading', () => {
  const { loading } = fixture();
  document.documentElement.dataset.loadingView = 'list';
  globalThis.localStorage = {
    getItem() {
      throw new Error('Storage unavailable');
    },
  };
  const token = loading.begin();
  assert.equal(document.documentElement.dataset.loadingView, 'list');
  assert.equal(loading.finish(token), true);
});

test('unexpected startup failure clears skeleton and shows a safe retry without exposing workspace', () => {
  const { elements, loading } = fixture();
  const token = loading.begin();
  loading.showError(token);
  assert.equal(loading.isLoading, false);
  assert.equal(elements.get('boardWorkspace').hidden, true);
  assert.equal(elements.get('appNavbar').hidden, true);
  const panel = elements.get('boardWorkspace').parentElement.children[0];
  assert.equal(panel.attributes.get('role'), 'alert');
  assert.equal(panel.children[1].textContent, 'Retry');
});
