import assert from 'node:assert/strict';
import test from 'node:test';
import { createKanbanDrag, createListDrag } from '../js/main/kanbanDrag.js';

class Element extends EventTarget {
  constructor(document) {
    super();
    this.ownerDocument = document;
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
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
  card.contains = node => node === card;
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
    repositionApplication: ({ sourceIndex, statusValue }) => {
      moves.push([sourceIndex, statusValue]);
      return true;
    },
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

test('mouse pointer drag completes without depending on a native drop event', () => {
  const f = fixture();
  const mouse = { pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1 };
  f.fire(f.card, 'pointerdown', mouse);
  f.fire(f.document, 'pointermove', { ...mouse, clientX: 240 });
  assert.equal(f.card.classes.has('is-dragging'), true);
  assert.equal(f.card.draggable, false, 'Native dragging must not take over the pointer session');
  assert.deepEqual(f.moves, []);
  f.fire(f.document, 'pointerup', { ...mouse, buttons: 0, clientX: 300 });
  assert.deepEqual(f.moves, [[0, 'Interview']]);
  assert.equal(f.card.classes.has('is-dragging'), false);
  assert.equal(f.card.draggable, true);
  f.drag.destroy();
});

test('mouse clicks, secondary buttons, controls, and canceled pointer drags never save', () => {
  for (const reason of ['click', 'secondary', 'control', 'cancel', 'capture', 'outside']) {
    const f = fixture();
    const mouse = { pointerType: 'mouse', pointerId: 1, button: 0, buttons: 1 };
    if (reason === 'secondary') mouse.button = 2;
    if (reason === 'control') f.card.closest = selector => selector.startsWith('button') ? f.card : null;
    f.fire(f.card, 'pointerdown', mouse);
    if (reason !== 'click') f.fire(f.document, 'pointermove', { ...mouse, clientX: 240 });
    if (reason === 'cancel') f.fire(f.document, 'pointercancel', mouse);
    if (reason === 'capture') f.fire(f.card, 'lostpointercapture', mouse);
    if (reason === 'outside') f.document.elementFromPoint = () => null;
    f.fire(f.document, 'pointerup', { ...mouse, buttons: 0 });
    assert.deepEqual(f.moves, [], reason);
    assert.equal(f.card.classes.has('is-dragging'), false);
    assert.equal(f.card.draggable, true);
    f.drag.destroy();
  }
});

test('Manual List mouse dragging uses the same pointer release path', () => {
  const f = fixture();
  f.drag.destroy();
  f.app.listCards = f.root;
  f.app.viewSelect = { value: 'list' };
  f.app.listSortSelect = { value: 'manual' };
  const drag = createListDrag(f.app, f.tracker);
  const target = new Element(f.document);
  target.getBoundingClientRect = () => ({ top: 200, bottom: 300 });
  f.tracker.rows.push(['Meta', 'Applied']);
  drag.attachCard(f.card, 0);
  drag.attachCard(target, 1);
  f.document.elementFromPoint = () => target;
  const placements = [];
  f.app.repositionApplication = move => { placements.push(move); return true; };
  const mouse = { pointerType: 'mouse', pointerId: 2, button: 0, buttons: 1 };
  f.fire(f.card, 'pointerdown', mouse);
  f.fire(f.document, 'pointermove', { ...mouse, clientY: 280 });
  f.fire(f.document, 'pointerup', { ...mouse, buttons: 0, clientY: 280 });
  assert.deepEqual(placements, [{ sourceIndex: 0, targetIndex: 1, placement: 'after' }]);
  drag.destroy();
});

test('touchscreen Pointer Events activate the hold even without Touch Events', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  const touch = { pointerType: 'touch', pointerId: 4, button: 0, buttons: 1 };
  f.fire(f.card, 'pointerdown', touch);
  t.mock.timers.tick(300);
  assert.equal(f.card.classes.has('is-dragging'), true);
  f.fire(f.document, 'pointermove', { ...touch, clientX: 260 });
  f.fire(f.document, 'pointerup', { ...touch, buttons: 0, clientX: 300 });
  assert.deepEqual(f.moves, [[0, 'Interview']]);
  assert.equal(f.card.draggable, true);
  f.drag.destroy();
});

test('touch drag grips are allowed despite being buttons; other controls stay excluded', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  f.card.closest = selector => selector === '[data-application-drag-handle]' || selector.startsWith('button')
    ? f.card : null;
  const touch = { pointerType: 'touch', pointerId: 5, button: 0, buttons: 1 };
  f.fire(f.card, 'pointerdown', touch);
  f.fire(f.card, 'touchstart', { touches: [{ identifier: 7, clientX: 200, clientY: 100 }] });
  t.mock.timers.tick(300);
  assert.equal(f.card.classes.has('is-dragging'), true);
  f.fire(f.document, 'pointerup', { ...touch, buttons: 0 });
  f.fire(f.document, 'touchend', { touches: [], changedTouches: [{ identifier: 7 }] });
  assert.deepEqual(f.moves, [[0, 'Interview']]);
  f.drag.destroy();
});

test('drag grips support keyboard ordering and restore grip focus', () => {
  const f = fixture();
  f.card.closest = selector => selector === '[data-application-drag-handle]' ? f.card : null;
  const moves = [];
  let focused = false;
  f.app.moveApplicationByDirection = (index, direction) => { moves.push([index, direction]); return true; };
  f.root.querySelector = () => ({ focus: () => { focused = true; } });
  const event = f.fire(f.card, 'keydown', { key: 'ArrowDown' });
  assert.deepEqual(moves, [[0, 1]]);
  assert.equal(event.defaultPrevented, true);
  assert.equal(focused, true);
  f.drag.destroy();
});

test('pointer-only touch swipes and extra fingers cancel without blocking normal scrolling', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const reason of ['swipe', 'extra']) {
    const f = fixture();
    const touch = { pointerType: 'touch', pointerId: 4, button: 0, buttons: 1 };
    f.fire(f.card, 'pointerdown', touch);
    if (reason === 'swipe') {
      const event = f.fire(f.document, 'pointermove', { ...touch, clientY: 130 });
      assert.equal(event.defaultPrevented, false);
    } else {
      f.fire(f.document, 'pointerdown', { ...touch, pointerId: 5, isPrimary: false });
    }
    t.mock.timers.tick(300);
    f.fire(f.document, 'pointerup', { ...touch, buttons: 0 });
    assert.equal(f.card.classes.has('is-dragging'), false);
    assert.deepEqual(f.moves, []);
    assert.equal(f.card.draggable, true);
    f.drag.destroy();
  }
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
  f.card.closest = selector => selector.startsWith('button') ? f.card : null;
  const event = f.fire(f.card, 'dragstart');
  assert.equal(event.defaultPrevented, true);
  f.fire(f.column, 'drop');
  assert.deepEqual(f.moves, []);
  f.drag.destroy();
});

test('native drag cannot start from a control when dragstart targets the ancestor card', () => {
  const f = fixture();
  f.card.closest = selector => selector.startsWith('button') ? f.card : null;
  f.fire(f.card, 'pointerdown');
  f.card.closest = () => null;
  const event = f.fire(f.card, 'dragstart');
  assert.equal(event.defaultPrevented, true);
  f.drag.destroy();
});

test('invalid-token drops do not move a card', () => {
  for (const reason of ['token']) {
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

test('Board drops use card midpoint placement in the same column', () => {
  const f = fixture();
  const target = new Element(f.document);
  target.getBoundingClientRect = () => ({ top: 200, bottom: 300 });
  f.tracker.rows.push(['Meta', 'Interview']);
  f.drag.attachCard(target, 1);
  const placements = [];
  f.app.repositionApplication = move => { placements.push(move); return true; };
  for (const [y, placement] of [[220, 'before'], [280, 'after']]) {
    f.fire(f.card, 'dragstart');
    f.fire(f.column, 'dragover', { clientY: y });
    assert.equal(target.classes.has(`drop-${placement}`), true);
    f.fire(f.column, 'drop', { clientY: y });
    assert.deepEqual(placements.at(-1), {
      sourceIndex: 0, targetIndex: 1, placement, statusValue: 'Interview',
    });
    assert.equal(target.classes.has(`drop-${placement}`), false);
  }
  f.drag.destroy();
});

test('dropping on a lower card half anchors after that card, not before the next card', () => {
  const f = fixture();
  const target = new Element(f.document);
  target.getBoundingClientRect = () => ({ top: 200, bottom: 300 });
  target.contains = node => node === target;
  const next = new Element(f.document);
  next.getBoundingClientRect = () => ({ top: 320, bottom: 420 });
  f.tracker.rows.push(['Target', 'Interview'], ['Hidden elsewhere', 'Applied'], ['Next', 'Interview']);
  f.drag.attachCard(target, 1);
  f.drag.attachCard(next, 3);
  f.document.elementFromPoint = () => target;
  const placements = [];
  f.app.repositionApplication = move => { placements.push(move); return true; };
  f.fire(f.card, 'dragstart');
  f.fire(f.column, 'dragover', { clientY: 280 });
  assert.equal(target.classes.has('drop-after'), true);
  f.fire(f.column, 'drop', { clientY: 280 });
  assert.deepEqual(placements, [{ sourceIndex: 0, targetIndex: 1, placement: 'after', statusValue: 'Interview' }]);
  f.drag.destroy();
});

test('List dragging requires Manual and targets only visible cards', () => {
  const f = fixture();
  f.drag.destroy();
  f.app.listCards = f.root;
  f.app.viewSelect = { value: 'list' };
  f.app.listSortSelect = { value: 'date-desc' };
  assert.equal(createListDrag(f.app, f.tracker), null);
  f.app.listSortSelect.value = 'manual';
  const drag = createListDrag(f.app, f.tracker);
  const target = new Element(f.document);
  target.getBoundingClientRect = () => ({ top: 200, bottom: 300 });
  const hidden = new Element(f.document);
  hidden.classList.add('hidden');
  f.tracker.rows.push(['Meta', 'Applied'], ['Off page', 'Applied']);
  drag.attachCard(f.card, 0);
  drag.attachCard(target, 1);
  drag.attachCard(hidden, 2);
  f.document.elementFromPoint = () => target;
  const placements = [];
  f.app.repositionApplication = move => { placements.push(move); return true; };
  f.fire(f.card, 'dragstart');
  f.fire(f.root, 'drop', { clientY: 290 });
  assert.deepEqual(placements, [{ sourceIndex: 0, targetIndex: 1, placement: 'after' }]);
  f.fire(f.card, 'dragstart');
  f.app.listSortSelect.value = 'date-asc';
  f.fire(f.root, 'drop');
  assert.equal(placements.length, 1);
  drag.destroy();
});

test('vertical edge scrolling stops on cancellation', () => {
  const f = fixture();
  const scrolling = f.document.documentElement;
  f.document.scrollingElement = scrolling;
  Object.assign(scrolling, { scrollTop: 0, scrollHeight: 2000, clientHeight: 700 });
  f.document.defaultView.innerHeight = 700;
  f.fire(f.card, 'dragstart', { clientY: 695 });
  f.stepFrame();
  assert.equal(scrolling.scrollTop, 10.5);
  f.fire(f.card, 'dragend');
  f.stepFrame();
  assert.equal(scrolling.scrollTop, 10.5);
  f.drag.destroy();
});

test('replaced destination rows and hidden source cards reject stale drops', () => {
  for (const change of ['target', 'hidden']) {
    const f = fixture();
    const target = new Element(f.document);
    target.getBoundingClientRect = () => ({ top: 200, bottom: 300 });
    f.tracker.rows.push(['Meta', 'Interview']);
    f.drag.attachCard(target, 1);
    f.document.elementFromPoint = () => target;
    f.fire(f.card, 'dragstart');
    if (change === 'target') f.tracker.rows[1] = ['Replaced', 'Interview'];
    else f.card.classList.add('hidden');
    f.fire(f.column, 'drop', { clientY: 220 });
    assert.deepEqual(f.moves, [], change);
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
