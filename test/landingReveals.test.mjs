import assert from 'node:assert/strict';
import test from 'node:test';
import { setupLandingReveals } from '../js/homepage/landingReveals.js';

function fixture({ reduced = false, page = 'homepage', unsupported = false, broken = false } = {}) {
  const makeElement = (top) => ({
    classes: new Set(),
    classList: {
      add(name) {
        this.owner.classes.add(name);
      },
      remove(name) {
        this.owner.classes.delete(name);
      },
    },
    getBoundingClientRect() {
      return { top, bottom: top + 100 };
    },
    contains(target) {
      return this === target;
    },
    animate(frames, options) {
      const animation = {
        frames,
        options,
        cancel() {
          this.canceled = true;
        },
      };
      this.animations.push(animation);
      return animation;
    },
    animations: [],
  });
  const visible = makeElement(100);
  const cards = [makeElement(1200), makeElement(1200), makeElement(1200)];
  const elements = [visible, ...cards];
  for (const element of elements) {
    element.classList.owner = element;
  }
  const document = new EventTarget();
  document.body = { dataset: { page } };
  document.querySelectorAll = (selector) => {
    if (selector === '.landing-flow-card') {
      return cards;
    }
    if (selector === '#how-it-works > :first-child') {
      return [visible];
    }
    return [];
  };
  document.getElementById = (id) => id === 'how-it-works'
    ? { contains: (element) => elements.includes(element) }
    : null;
  const preference = new EventTarget();
  preference.matches = reduced;
  const window = new EventTarget();
  window.innerHeight = 900;
  window.innerWidth = 1440;
  window.location = { hash: '' };
  window.matchMedia = () => preference;
  window.getComputedStyle = (element) => ({ opacity: element.opacity ?? '1' });
  let observer;
  window.IntersectionObserver = unsupported ? undefined : class {
    constructor(callback) {
      observer = this;
      this.callback = callback;
      this.targets = new Set();
    }
    observe(element) {
      if (broken) {
        throw new Error('Observer setup failed');
      }
      this.targets.add(element);
    }
    unobserve(element) {
      this.targets.delete(element);
    }
    disconnect() {
      this.targets.clear();
    }
  };
  globalThis.window = window;
  globalThis.document = document;
  return {
    visible, cards, elements, document, window, preference,
    enter(element) {
      observer.callback([{ target: element, isIntersecting: true }]);
    },
    pending() {
      return elements.filter(element => element.classes.has('landing-reveal-pending'));
    },
    get observer() {
      return observer;
    },
  };
}

test('offscreen cards reveal once, stagger, and leave initially visible content unchanged', () => {
  const state = fixture();
  setupLandingReveals();
  assert.equal(state.pending().length, 3);
  assert.equal(state.visible.animations.length, 0);
  state.cards.forEach(state.enter);
  assert.deepEqual(state.cards.map(card => card.animations[0].options.delay), [0, 80, 160]);
  assert.equal(state.pending().length, 0);
  assert.equal(state.observer.targets.size, 0);
  state.enter(state.cards[0]);
  assert.equal(state.cards[0].animations.length, 1);
  state.cards[0].animations[0].onfinish();
  assert.equal(state.cards[0].animations[0].canceled, true);
});

test('stacked mobile cards use shorter movement without stagger', () => {
  const state = fixture();
  setupLandingReveals();
  state.window.innerWidth = 390;
  state.cards.forEach(state.enter);
  for (const card of state.cards) {
    assert.equal(card.animations[0].options.delay, 0);
    assert.equal(card.animations[0].frames[0].translate, '0 12px');
  }
});

test('decorative elements retain their original subdued opacity after reveal', () => {
  const state = fixture();
  state.cards[0].opacity = '0.65';
  setupLandingReveals();
  state.enter(state.cards[0]);
  assert.equal(state.cards[0].animations[0].frames[1].opacity, '0.65');
});

for (const options of [{ reduced: true }, { unsupported: true }, { broken: true }, { page: 'legal' }]) {
  test(`content stays visible with ${JSON.stringify(options)}`, () => {
    const state = fixture(options);
    setupLandingReveals();
    assert.equal(state.pending().length, 0);
    assert.ok(state.elements.every(element => element.animations.length === 0));
  });
}

test('enabling reduced motion clears pending and running entrances without replay', () => {
  const state = fixture();
  setupLandingReveals();
  state.enter(state.cards[0]);
  state.preference.matches = true;
  state.preference.dispatchEvent(new Event('change'));
  assert.equal(state.pending().length, 0);
  assert.equal(state.cards[0].animations[0].canceled, true);
  assert.equal(state.observer.targets.size, 0);
  state.preference.matches = false;
  state.preference.dispatchEvent(new Event('change'));
  assert.equal(state.pending().length, 0);
});

test('focus reveals its target immediately without animation', () => {
  const state = fixture();
  setupLandingReveals();
  const event = new Event('focusin');
  Object.defineProperty(event, 'target', { value: state.cards[1] });
  state.document.dispatchEvent(event);
  assert.equal(state.pending().length, 2);
  assert.equal(state.cards[1].animations.length, 0);
});

test('initial and changed hash destinations reveal their content immediately', () => {
  for (const initial of [true, false]) {
    const state = fixture();
    if (initial) {
      state.window.location.hash = '#how-it-works';
    }
    setupLandingReveals();
    state.window.location.hash = '#how-it-works';
    state.window.dispatchEvent(new Event('hashchange'));
    assert.equal(state.pending().length, 0);
    assert.ok(state.elements.every(element => element.animations.length === 0));
  }
});
