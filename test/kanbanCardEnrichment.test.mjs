import assert from 'node:assert/strict';
import test from 'node:test';

class FakeClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) {
    names.forEach((name) => this.classes.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.classes.delete(name));
  }
  contains(name) {
    return this.classes.has(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.childNodes = this.children;
    this.dataset = {};
    this.style = {
      setProperty() {},
    };
    this.listeners = {};
    this._textContent = '';
    this.classList = new FakeClassList();
    this.parentElement = null;
    this.attributes = {};
  }

  set className(value) {
    this._className = String(value);
    this.classList = new FakeClassList();
    this._className.split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }

  get className() {
    return this._className || '';
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return [this._textContent, ...this.children.map((child) => child.textContent)].join('');
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  appendChild(node) {
    if (typeof node === 'string') {
      const textNode = new FakeElement('span');
      textNode.textContent = node;
      node = textNode;
    }
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.childNodes = this.children;
    nodes.forEach((n) => this.appendChild(n));
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  setAttribute(name, value) {
    this[name] = String(value);
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? this[name] ?? null;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    function search(element) {
      for (const child of element.children) {
        if (matchesSelector(child, selector)) {
          results.push(child);
        }
        search(child);
      }
    }
    search(this);
    return results;
  }
}

function matchesSelector(element, selector) {
  if (!element || !element.tagName) return false;
  const sel = selector.trim();
  if (sel.startsWith('.')) {
    const className = sel.slice(1);
    return element.classList?.contains(className);
  }
  if (sel.startsWith('#')) {
    const id = sel.slice(1);
    return element.id === id;
  }
  return element.tagName.toLowerCase() === sel.toLowerCase();
}

globalThis.document = {
  createElement(tagName) {
    return new FakeElement(tagName);
  },
};
globalThis.window = {
  matchMedia() {
    return { matches: false };
  },
};

const { kanbanMethods } = await import('../js/main/kanban.js');
const { trackerUtilityMethods } = await import('../js/main/trackerUtils.js');

function createTestCardContext(tracker) {
  const container = new FakeElement('div');

  return {
    ...trackerUtilityMethods,
    ...kanbanMethods,
    kanbanColumns: container,
    getTracker() {
      return tracker;
    },
    getListColumnIndexes(t) {
      return {
        company: 0,
        position: 1,
        platform: 2,
        status: 3,
        date: 4,
        link: 5,
        workSetup: 6,
        employmentType: 7,
        nextAction: 8,
        nextActionDate: 9,
      };
    },
    moveKanbanRow() {},
  };
}

function renderSingleCard(tracker) {
  const context = createTestCardContext(tracker);
  context.renderKanban(tracker);
  return context.kanbanColumns.querySelector('.kanban-card');
}

test('Kanban card renders both Employment Type and Work Setup pills in order', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [
      [
        { value: 'Microsoft', type: 'text' },
        { value: 'Software Engineer Intern', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: 'https://careers.microsoft.com', type: 'text' },
        { value: 'Remote', type: 'select' },
        { value: 'Internship', type: 'select' },
        { value: 'Prepare for interview', type: 'text' },
        { value: '2026-11-12', type: 'date' },
      ],
    ],
  };

  const card = renderSingleCard(tracker);
  assert.ok(card, 'Card rendered');

  const pills = card.querySelector('.kanban-card-pills');
  assert.ok(pills, 'Pills container rendered');

  const pillElements = pills.querySelectorAll('.kanban-pill');
  assert.equal(pillElements.length, 2, 'Exactly 2 pills rendered');

  // Order: Employment Type first, then Work Setup
  assert.ok(pillElements[0].classList.contains('kanban-pill-employment'));
  assert.match(pillElements[0].textContent, /Internship/);

  assert.ok(pillElements[1].classList.contains('kanban-pill-remote'));
  assert.match(pillElements[1].textContent, /Remote/);
});

test('Kanban card renders only Employment Type pill when Work Setup is blank', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [
      [
        { value: 'Amazon', type: 'text' },
        { value: 'SDE II', type: 'text' },
        { value: 'Indeed', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: '', type: 'text' },
        { value: '', type: 'select' },
        { value: 'Full-time', type: 'select' },
        { value: '', type: 'text' },
        { value: '', type: 'date' },
      ],
    ],
  };

  const card = renderSingleCard(tracker);
  const pills = card.querySelector('.kanban-card-pills');
  assert.ok(pills, 'Pills container rendered');

  const pillElements = pills.querySelectorAll('.kanban-pill');
  assert.equal(pillElements.length, 1, 'Only 1 pill rendered');
  assert.ok(pillElements[0].classList.contains('kanban-pill-employment'));
  assert.match(pillElements[0].textContent, /Full-time/);
});

test('Kanban card renders only Work Setup pill when Employment Type is blank', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [
      [
        { value: 'Apple', type: 'text' },
        { value: 'iOS Engineer', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: '', type: 'text' },
        { value: 'Hybrid', type: 'select' },
        { value: '', type: 'select' },
        { value: '', type: 'text' },
        { value: '', type: 'date' },
      ],
    ],
  };

  const card = renderSingleCard(tracker);
  const pills = card.querySelector('.kanban-card-pills');
  assert.ok(pills, 'Pills container rendered');

  const pillElements = pills.querySelectorAll('.kanban-pill');
  assert.equal(pillElements.length, 1, 'Only 1 pill rendered');
  assert.ok(pillElements[0].classList.contains('kanban-pill-hybrid'));
  assert.match(pillElements[0].textContent, /Hybrid/);
});

test('Kanban card renders no pill row when both fields are blank', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [
      [
        { value: 'Netflix', type: 'text' },
        { value: 'Backend Lead', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: '', type: 'text' },
        { value: '', type: 'select' },
        { value: '', type: 'select' },
        { value: '', type: 'text' },
        { value: '', type: 'date' },
      ],
    ],
  };

  const card = renderSingleCard(tracker);
  const pills = card.querySelector('.kanban-card-pills');
  assert.equal(pills, null, 'No pills container rendered when both are blank');
});

test('Kanban card company link opens in new tab with valid HTTP(S) link', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
    ],
    rows: [
      [
        { value: 'Google', type: 'text' },
        { value: 'Frontend Developer', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: 'https://careers.google.com/jobs/123', type: 'text' },
      ],
    ],
  };

  const card = renderSingleCard(tracker);
  const companyLink = card.querySelector('.kanban-card-company-link');
  assert.ok(companyLink, 'Clickable company link element exists');
  assert.equal(companyLink.tagName, 'A');
  assert.equal(companyLink.href, 'https://careers.google.com/jobs/123');
  assert.equal(companyLink.target, '_blank');
  assert.match(companyLink.rel, /noopener/);
  assert.match(companyLink.rel, /noreferrer/);
  assert.match(companyLink.getAttribute('aria-label'), /Google/);

  // Favicon is inside the anchor
  const favicon = companyLink.querySelector('.kanban-card-favicon');
  assert.ok(favicon, 'Favicon is inside company link');

  // Position is outside the anchor and non-clickable
  const position = card.querySelector('.kanban-card-position');
  assert.ok(position, 'Position element exists');
  assert.equal(position.closest('a'), null, 'Position is not inside any anchor');
});

test('Kanban card company is non-clickable when link is missing or unsafe', () => {
  const makeTracker = (linkValue) => ({
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
    ],
    rows: [
      [
        { value: 'Initech', type: 'text' },
        { value: 'Dev', type: 'text' },
        { value: 'Indeed', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: linkValue, type: 'text' },
      ],
    ],
  });

  // Missing link
  const cardNoLink = renderSingleCard(makeTracker(''));
  assert.equal(cardNoLink.querySelector('.kanban-card-company-link'), null);
  assert.equal(cardNoLink.querySelector('a'), null);

  // Unsafe javascript: link
  const cardUnsafeLink = renderSingleCard(makeTracker('javascript:alert(1)'));
  assert.equal(cardUnsafeLink.querySelector('.kanban-card-company-link'), null);
  assert.equal(cardUnsafeLink.querySelector('a'), null);

  // Unsafe data: link
  const cardDataLink = renderSingleCard(makeTracker('data:text/html,evil'));
  assert.equal(cardDataLink.querySelector('.kanban-card-company-link'), null);
  assert.equal(cardDataLink.querySelector('a'), null);
});

test('Kanban card Next Action layout and hierarchy handles all combinations cleanly', () => {
  const makeTracker = (action, actionDate) => ({
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select' },
      { name: 'Status', type: 'select', options: [{ label: 'Applied', color: '#3b82f6' }] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [
      [
        { value: 'Stripe', type: 'text' },
        { value: 'Engineer', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: '2026-11-09', type: 'date' },
        { value: '', type: 'text' },
        { value: '', type: 'select' },
        { value: '', type: 'select' },
        { value: action, type: 'text' },
        { value: actionDate, type: 'date' },
      ],
    ],
  });

  // 1. Both action and date
  const tracker = makeTracker('fafa', '2026-11-12');
  tracker.rows[0][0].value = 'Google';
  const storedBefore = JSON.stringify(tracker);
  const cardBoth = renderSingleCard(tracker);
  const nextActionWrapperBoth = cardBoth.querySelector('.kanban-card-next-action');
  assert.ok(nextActionWrapperBoth, 'Wrapper exists');
  assert.equal(nextActionWrapperBoth.querySelector('.kanban-next-action-label').textContent, 'Next Action');
  assert.equal(nextActionWrapperBoth.querySelector('.kanban-next-action-text').textContent, 'fafa');
  const date = nextActionWrapperBoth.querySelector('.kanban-next-action-date');
  assert.equal(date.textContent, 'Nov 12');
  assert.ok(date.querySelector('i'), 'Date pill retains its calendar icon');
  assert.ok(nextActionWrapperBoth.querySelector('.kanban-next-action-icon'), 'Task icon stays on the left');
  assert.equal(nextActionWrapperBoth.querySelectorAll('i').length, 2, 'Only the requested task and calendar icons exist');
  assert.equal(nextActionWrapperBoth.querySelector('button'), null, 'No circular completion button or empty button slot');
  assert.equal(JSON.stringify(tracker), storedBefore, 'Presentation does not change saved action or date');

  // 2. Action only (no date)
  const cardActionOnly = renderSingleCard(makeTracker('Follow up with recruiter', ''));
  const nextActionWrapperAction = cardActionOnly.querySelector('.kanban-card-next-action');
  assert.ok(nextActionWrapperAction);
  assert.match(nextActionWrapperAction.querySelector('.kanban-next-action-text').textContent, /Follow up/);
  assert.equal(nextActionWrapperAction.querySelector('.kanban-next-action-date'), null);

  // 3. Date only (no action text)
  const cardDateOnly = renderSingleCard(makeTracker('', '2026-11-20'));
  const nextActionWrapperDate = cardDateOnly.querySelector('.kanban-card-next-action');
  assert.ok(nextActionWrapperDate);
  assert.equal(nextActionWrapperDate.querySelector('.kanban-next-action-text'), null);
  assert.match(nextActionWrapperDate.querySelector('.kanban-next-action-date').textContent, /Nov 20/);

  // 4. Neither exists
  const cardNeither = renderSingleCard(makeTracker('', ''));
  assert.equal(cardNeither.querySelector('.kanban-card-next-action'), null, 'No wrapper when both blank');
});
