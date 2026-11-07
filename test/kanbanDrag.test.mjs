import assert from 'node:assert/strict';
import test from 'node:test';
import { createKanbanDrag } from '../js/main/kanbanDrag.js';

class Element extends EventTarget {
  constructor(document) {
    super();
    this.ownerDocument = document;
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
    };
    this.isConnected = true;
    this.style = {};
  }

  contains(node) { return node.isConnected; }
  closest() { return null; }
  getBoundingClientRect() { return { left: 0, right: 600, top: 0, bottom: 700 }; }
  cloneNode() { return new Element(this.ownerDocument); }
  setAttribute() {}
  querySelectorAll() { return []; }
  appendChild() {}
  remove() { this.isConnected = false; }
}

function fixture({ fine = true } = {}) {
  const document = new EventTarget();
  document.defaultView = new EventTarget();
  let nextFrame;
  Object.assign(document.defaultView, {
    matchMedia: () => ({ matches: fine }),
    requestAnimationFrame: (callback) => { nextFrame = callback; return 1; },
    cancelAnimationFrame() { nextFrame = null; },
  });
  const root = new Element(document);
  Object.assign(root, { scrollLeft: 0, scrollWidth: 1200, clientWidth: 600 });
  const card = new Element(document);
  const column = new Element(document);
  document.body = new Element(document);
  document.documentElement = new Element(document);
  document.elementFromPoint = () => column;
  const row = ['Google', 'Applied'];
  const tracker = { rows: [row] };
  const moves = [];
  const messages = [];
  const app = {
    kanbanColumns: root,
    getTracker: () => tracker,
    moveKanbanRow: (...args) => { moves.push(args); return true; },
    showToast: (message) => messages.push(message),
  };
  const drag = createKanbanDrag(app, tracker);
  drag.attachCard(card, 0);
  drag.attachColumn(column, 'Interview');
  const data = new Map();
  const transfer = {
    setData: (key, value) => data.set(key, value),
    getData: (key) => data.get(key) || '',
  };
  function fire(target, name, extra = {}) {
    const event = new Event(name, { cancelable: true });
    Object.assign(event, { dataTransfer: transfer, clientX: 200, clientY: 100 }, extra);
    target.dispatchEvent(event);
    return event;
  }
  return {
    root, card, column, tracker, moves, messages, app, drag, transfer, fire, document,
    stepFrame: () => nextFrame?.(),
  };
}

test('desktop drag commits once on another column and clears visual state', () => {
  const f = fixture();
  f.fire(f.card, 'dragstart');
  assert.deepEqual(f.moves, []);
  f.fire(f.column, 'dragover');
  assert.equal(f.column.classes.has('is-drop-target'), true);
  f.fire(f.column, 'drop');
  f.fire(f.column, 'drop');
  assert.deepEqual(f.moves, [[0, 'Interview']]);
  assert.equal(f.card.classes.has('is-dragging'), false);
  assert.equal(f.column.classes.has('is-drop-target'), false);
  assert.equal(f.messages.length, 1);
  f.drag.destroy();
});

test('external text drops cannot move an application', () => {
  const f = fixture();
  f.transfer.setData('text/plain', '0');
  f.fire(f.column, 'drop');
  assert.deepEqual(f.moves, []);
  f.drag.destroy();
});

test('mouse dragging works even when capability queries report no fine pointer', () => {
  const f = fixture({ fine: false });
  assert.equal(f.card.draggable, true);
  f.drag.destroy();
});

test('changed rows and tracker snapshots invalidate a drag', () => {
  for (const replace of ['row', 'tracker', 'view']) {
    const f = fixture();
    f.fire(f.card, 'dragstart');
    if (replace === 'row') f.tracker.rows[0] = ['Another application', 'Applied'];
    if (replace === 'tracker') f.app.getTracker = () => ({ rows: f.tracker.rows });
    if (replace === 'view') f.app.viewSelect = { value: 'list' };
    f.fire(f.column, 'drop');
    assert.deepEqual(f.moves, [], replace);
    f.drag.destroy();
  }
});

test('Escape, dragend, redraw cleanup, and outside drops do not save', () => {
  for (const reason of ['escape', 'end', 'destroy', 'outside']) {
    const f = fixture();
    f.fire(f.card, 'dragstart');
    if (reason === 'escape') f.fire(f.document, 'keydown', { key: 'Escape' });
    if (reason === 'end') f.fire(f.card, 'dragend');
    if (reason === 'destroy') f.drag.destroy();
    if (reason === 'outside') f.fire(f.document, 'drop');
    f.fire(f.column, 'drop');
    assert.deepEqual(f.moves, [], reason);
    f.drag.destroy();
  }
});

test('interactive controls never start native card dragging', () => {
  const f = fixture();
  f.card.closest = () => f.card;
  const event = f.fire(f.card, 'dragstart');
  assert.equal(event.defaultPrevented, true);
  f.fire(f.column, 'drop');
  assert.deepEqual(f.moves, []);
  f.drag.destroy();
});

test('native drag cannot start from a control when dragstart targets the ancestor card', () => {
  const f = fixture();
  f.card.closest = () => f.card;
  f.fire(f.card, 'pointerdown');
  f.card.closest = () => null;
  const event = f.fire(f.card, 'dragstart');
  assert.equal(event.defaultPrevented, true);
  f.drag.destroy();
});

test('same-column and invalid-token drops do not move a card', () => {
  for (const reason of ['same', 'token']) {
    const f = fixture();
    f.card.closest = selector => selector === '[data-kanban-status]'
      ? { dataset: { kanbanStatus: 'Interview' } } : null;
    f.fire(f.card, 'dragstart');
    if (reason === 'token') f.transfer.setData('application/x-jubro-card', 'untrusted');
    f.fire(f.column, 'drop');
    assert.deepEqual(f.moves, [], reason);
    f.drag.destroy();
  }
});

test('edge scrolling stays within 12px per frame and stops when canceled', () => {
  const f = fixture();
  f.fire(f.card, 'dragstart', { clientX: 600 });
  f.stepFrame();
  assert.equal(f.root.scrollLeft, 12);
  f.fire(f.card, 'dragend');
  f.stepFrame();
  assert.equal(f.root.scrollLeft, 12);
  assert.deepEqual(f.moves, []);
  f.drag.destroy();
});

test('touch holds activate at 300ms and commit only on release', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  const touch = { identifier: 7, clientX: 200, clientY: 100 };
  f.fire(f.card, 'touchstart', { touches: [touch] });
  t.mock.timers.tick(299);
  assert.equal(f.card.classes.has('is-dragging'), false);
  t.mock.timers.tick(1);
  assert.equal(f.card.classes.has('is-dragging'), true);
  assert.deepEqual(f.moves, []);
  const move = f.fire(f.document, 'touchmove', { touches: [{ ...touch, clientX: 300 }] });
  assert.equal(move.defaultPrevented, true);
  f.fire(f.document, 'touchend', { touches: [], changedTouches: [touch] });
  assert.deepEqual(f.moves, [[0, 'Interview']]);
  f.drag.destroy();
});

test('swipes before hold, multiple touches, and touchcancel never move cards', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const reason of ['swipe', 'multi', 'cancel']) {
    const f = fixture();
    const touch = { identifier: 7, clientX: 200, clientY: 100 };
    f.fire(f.card, 'touchstart', { touches: [touch] });
    if (reason === 'swipe') {
      const move = f.fire(f.document, 'touchmove', { touches: [{ ...touch, clientX: 209 }] });
      assert.equal(move.defaultPrevented, false);
    }
    if (reason === 'multi') f.fire(f.document, 'touchstart', { touches: [touch, { identifier: 8 }] });
    if (reason === 'cancel') f.fire(f.document, 'touchcancel');
    t.mock.timers.tick(300);
    assert.equal(f.card.classes.has('is-dragging'), false, reason);
    f.fire(f.document, 'touchend', { touches: [], changedTouches: [touch] });
    assert.deepEqual(f.moves, [], reason);
    f.drag.destroy();
  }
});
