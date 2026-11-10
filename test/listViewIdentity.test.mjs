import assert from 'node:assert/strict';
import test from 'node:test';

const storageData = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storageData.has(key) ? storageData.get(key) : null;
  },
  setItem(key, value) {
    storageData.set(key, String(value));
  },
  removeItem(key) {
    storageData.delete(key);
  },
  clear() {
    storageData.clear();
  },
};

class FakeElement extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.childNodes = this.children;
    this.parentElement = null;
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.draggable = false;
    this.style = {
      setProperty(name, val) {
        this[name] = val;
      },
    };
    this._textContent = '';
    this.classList = {
      add: (...tokens) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        tokens.forEach((token) => set.add(token));
        this.className = [...set].join(' ');
      },
      remove: (...tokens) => {
        const removeSet = new Set(tokens);
        this.className = this.className
          .split(/\s+/)
          .filter((token) => token && !removeSet.has(token))
          .join(' ');
      },
      toggle: (token, force) => {
        const has = this.classList.contains(token);
        const shouldAdd = force === undefined ? !has : Boolean(force);
        if (shouldAdd) this.classList.add(token);
        else this.classList.remove(token);
        return shouldAdd;
      },
      contains: (token) => this.className.split(/\s+/).filter(Boolean).includes(token),
    };
  }

  get childElementCount() {
    return this.children.filter((node) => node instanceof FakeElement).length;
  }

  set textContent(value) {
    this.children = [];
    this.childNodes = this.children;
    this._textContent = String(value ?? '');
  }

  get textContent() {
    return [
      this._textContent,
      ...this.children.map((child) => (typeof child === 'string' ? child : child.textContent)),
    ].join('');
  }

  set innerHTML(html) {
    this.children = [];
    this.childNodes = this.children;
    this._textContent = '';

    if (!html) return;

    if (html.includes('list-card-title')) {
      const outer = new FakeElement('div', this.ownerDocument);
      outer.className = 'flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between';

      const left = new FakeElement('div', this.ownerDocument);
      left.className = 'min-w-0 flex-1';

      const dateEl = new FakeElement('p', this.ownerDocument);
      dateEl.className = 'list-card-date text-xs font-medium text-gray-400';

      const titleEl = new FakeElement('h3', this.ownerDocument);
      titleEl.className = 'list-card-title mt-1 truncate text-lg font-semibold text-gray-900';

      const subRow = new FakeElement('div', this.ownerDocument);
      subRow.className = 'flex gap-5 mt-2 items-center';

      const companyEl = new FakeElement('p', this.ownerDocument);
      companyEl.className = 'list-card-company truncate text-sm text-gray-500';

      const extraEl = new FakeElement('div', this.ownerDocument);
      extraEl.className = 'list-card-extra flex flex-wrap items-center gap-3';

      subRow.append(companyEl, extraEl);
      left.append(dateEl, titleEl, subRow);

      const right = new FakeElement('div', this.ownerDocument);
      right.className = 'flex flex-wrap items-center gap-3 xl:justify-end';

      const linkEl = new FakeElement('a', this.ownerDocument);
      linkEl.className = 'list-card-link';

      const invalidLinkEl = new FakeElement('span', this.ownerDocument);
      invalidLinkEl.className = 'list-card-invalid-link';

      const badgesEl = new FakeElement('div', this.ownerDocument);
      badgesEl.className = 'list-card-badges flex flex-wrap items-center gap-3';

      const makeBtn = (cls) => {
        const btn = new FakeElement('button', this.ownerDocument);
        btn.className = cls;
        return btn;
      };

      right.append(
        linkEl,
        invalidLinkEl,
        badgesEl,
        makeBtn('btn-list-move-up'),
        makeBtn('btn-list-move-down'),
        makeBtn('btn-list-edit'),
        makeBtn('btn-list-duplicate'),
        makeBtn('btn-list-info'),
        makeBtn('btn-list-delete')
      );

      outer.append(left, right);
      this.appendChild(outer);
    }
  }

  get innerHTML() {
    return '';
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  appendChild(node) {
    if (node instanceof FakeElement) {
      node.parentElement = this;
    }
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.childNodes = this.children;
    this._textContent = '';
    this.append(...nodes);
  }

  before(node) {
    if (!this.parentElement) return;
    const idx = this.parentElement.children.indexOf(this);
    if (idx === -1) return;
    if (node instanceof FakeElement) {
      node.parentElement = this.parentElement;
    }
    this.parentElement.children.splice(idx, 0, node);
  }

  remove() {
    if (!this.parentElement) return;
    const idx = this.parentElement.children.indexOf(this);
    if (idx >= 0) {
      this.parentElement.children.splice(idx, 1);
    }
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    this[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  matchesSelector(selector) {
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return this.classList.contains(className);
    }
    const attrMatch = selector.match(/^\[data-row-index="(.+)"\]$/);
    if (attrMatch) {
      return this.dataset.rowIndex === attrMatch[1];
    }
    return this.tagName === selector.toUpperCase();
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child instanceof FakeElement) {
          if (child.matchesSelector(selector)) {
            matches.push(child);
          }
          visit(child);
        }
      }
    };
    visit(this);
    return matches;
  }
}

globalThis.window = new EventTarget();
globalThis.window.matchMedia = () => ({ matches: false });
globalThis.window.requestAnimationFrame = () => 1;
globalThis.window.cancelAnimationFrame = () => {};
globalThis.document = new EventTarget();
globalThis.document.defaultView = globalThis.window;
globalThis.document.createElement = (tagName) => new FakeElement(tagName, globalThis.document);
globalThis.document.createTextNode = (text) => {
  const span = new FakeElement('text', globalThis.document);
  span.textContent = String(text ?? '');
  return span;
};
globalThis.document.getElementById = () => null;
globalThis.document.querySelectorAll = () => [];
globalThis.document.body = new FakeElement('body', globalThis.document);
globalThis.document.body.insertAdjacentHTML = () => {};

const { createDefaultTracker } = await import('../js/tracker/defaultTracker.js');
const { trackerUtilityMethods } = await import('../js/main/trackerUtils.js');
const { trackerSortingMethods } = await import('../js/main/trackerSorting.js');
const { trackerActionMethods } = await import('../js/main/trackerActions.js');
const { listIndexMethods } = await import('../js/main/listView/indexes.js');
const { listSettingsMethods } = await import('../js/main/listView/settings.js');
const { listBadgeMethods } = await import('../js/main/listView/badges.js');
const { listSortMethods } = await import('../js/main/listView/sorting.js');
const { listFilterMethods } = await import('../js/main/listView/filters.js');
const { listRenderMethods } = await import('../js/main/listView/render.js');
const { kanbanMethods } = await import('../js/main/kanban.js');

function createAppHarness(initialTracker) {
  let activeTracker = initialTracker;
  let saveCalls = 0;

  const app = {
    ...trackerUtilityMethods,
    ...trackerSortingMethods,
    ...trackerActionMethods,
    ...listIndexMethods,
    ...listSettingsMethods,
    ...listBadgeMethods,
    ...listSortMethods,
    ...listFilterMethods,
    ...listRenderMethods,
    ...kanbanMethods,
    activeListFilters: {},
    listCards: new FakeElement('div', globalThis.document),
    kanbanColumns: new FakeElement('div', globalThis.document),
    listSortSelect: { value: 'manual' },
    sortSelect: { value: '' },
    titleInput: { value: '' },
    ensureListSettingsPopup() {},
    ensureListEditModal() {},
    ensureListInfoModal() {},
    updateBoardView() {},
    applySearchFilter() {},
    getTracker() {
      return activeTracker;
    },
    setActiveTrackerForTest(nextTracker) {
      activeTracker = nextTracker;
    },
    getSaveCalls() {
      return saveCalls;
    },
    save() {
      saveCalls += 1;
      return true;
    },
  };

  return app;
}

function makeRow({
  company = '',
  position = '',
  platform = '',
  status = 'Applied',
  date = '2026-11-10',
  link = '',
  workSetup = '',
  employmentType = '',
  nextAction = '',
  nextActionDate = '',
} = {}) {
  return [
    { value: company, type: 'text' },
    { value: position, type: 'text' },
    { value: platform, type: 'select' },
    { value: status, type: 'select' },
    { value: date, type: 'date' },
    { value: link, type: 'text' },
    { value: workSetup, type: 'select' },
    { value: employmentType, type: 'select' },
    { value: nextAction, type: 'text' },
    { value: nextActionDate, type: 'date' },
  ];
}

test('Google / Web dev example: List shows Position above Company and matches Kanban canonical data', () => {
  localStorage.clear();
  const tracker = createDefaultTracker('tracker-google', 'Job Search 1');
  tracker.rows = [
    makeRow({
      company: 'Google',
      position: 'Web dev',
      platform: 'LinkedIn',
      status: 'Applied',
      date: '2026-11-10',
      link: 'https://google.com/jobs/1',
      workSetup: 'Remote',
      employmentType: 'Full-time',
    }),
  ];

  const app = createAppHarness(tracker);
  app.renderKanban(tracker);
  app.renderListView(tracker);

  // Kanban shows Company on top, Position below
  const kanbanCompany = app.kanbanColumns.querySelector('.kanban-card-company-name');
  const kanbanPosition = app.kanbanColumns.querySelector('.kanban-card-position');
  assert.equal(kanbanCompany.textContent, 'Google');
  assert.equal(kanbanPosition.textContent, 'Web dev');

  // List shows Position as primary title and Company directly below
  const listCard = app.listCards.querySelector('.list-view-row');
  const listDate = listCard.querySelector('.list-card-date');
  const listTitle = listCard.querySelector('.list-card-title');
  const listCompany = listCard.querySelector('.list-card-company');
  const listLink = listCard.querySelector('.list-card-link');
  const badgeLabels = listCard
    .querySelector('.list-card-badges')
    .children.map((badge) => badge.textContent);

  assert.equal(listDate.textContent, '2026-11-10');
  assert.equal(listTitle.textContent, 'Web dev');
  assert.notEqual(listTitle.textContent, 'Job Application');
  assert.equal(listCompany.hidden, false);
  assert.equal(listCompany.textContent, 'Google');
  assert.equal(listLink.textContent, 'google.com');
  assert.deepEqual(badgeLabels, ['LinkedIn', 'Remote', 'Full-time', 'Applied']);
  assert.equal(app.getSaveCalls(), 0);
});

test('Microsoft / Option 1 example: List shows Option 1 and Microsoft even when Position is select or hidden in settings', () => {
  localStorage.clear();
  // Simulate stale/custom list settings that hid columns 0 & 1 or company & position
  localStorage.setItem(
    'jubro_list_view_settings',
    JSON.stringify({
      hiddenFields: ['company', 'position'],
      hiddenColumns: [0, 1],
    })
  );

  const tracker = createDefaultTracker('tracker-msft', 'Job Search Microsoft');
  // Simulate Position column configured as Select with "Option 1"
  tracker.columns[1] = {
    name: 'Position',
    type: 'select',
    options: [{ label: 'Option 1', color: '#cccccc' }],
  };
  tracker.rows = [
    [
      { value: 'Microsoft', type: 'text' },
      { value: 'Option 1', type: 'select' },
      { value: 'Indeed', type: 'select' },
      { value: 'Interview', type: 'select' },
      { value: '2026-11-10', type: 'date' },
      { value: 'https://microsoft.com/careers', type: 'text' },
      { value: 'Hybrid', type: 'select' },
      { value: 'Freelance', type: 'select' },
      { value: '', type: 'text' },
      { value: '', type: 'date' },
    ],
  ];

  const app = createAppHarness(tracker);
  app.renderKanban(tracker);
  app.renderListView(tracker);

  // Kanban shows Microsoft / Option 1
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-company-name').textContent, 'Microsoft');
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-position').textContent, 'Option 1');

  // List shows Option 1 / Microsoft, never Job Application, and does not duplicate Option 1 as a badge pill
  const listCard = app.listCards.querySelector('.list-view-row');
  const listTitle = listCard.querySelector('.list-card-title');
  const listCompany = listCard.querySelector('.list-card-company');
  const listLink = listCard.querySelector('.list-card-link');
  const badgeLabels = listCard
    .querySelector('.list-card-badges')
    .children.map((badge) => badge.textContent);

  assert.equal(listTitle.textContent, 'Option 1');
  assert.equal(listCompany.hidden, false);
  assert.equal(listCompany.textContent, 'Microsoft');
  assert.equal(listLink.textContent, 'microsoft.com');
  assert.deepEqual(badgeLabels, ['Indeed', 'Hybrid', 'Freelance', 'Interview']);
});

test('Apple / Tech example: List shows Tech and Apple and omits blank Platform, Work Setup, Employment Type, and Link pills', () => {
  localStorage.clear();
  const tracker = createDefaultTracker('tracker-apple', 'Job Search Apple');
  tracker.rows = [
    makeRow({
      company: 'Apple',
      position: 'Tech',
      platform: '',
      status: 'Rejected',
      date: '2026-11-10',
      link: '',
      workSetup: '',
      employmentType: '',
    }),
  ];

  const app = createAppHarness(tracker);
  app.renderKanban(tracker);
  app.renderListView(tracker);

  assert.equal(app.kanbanColumns.querySelector('.kanban-card-company-name').textContent, 'Apple');
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-position').textContent, 'Tech');

  const listCard = app.listCards.querySelector('.list-view-row');
  const listTitle = listCard.querySelector('.list-card-title');
  const listCompany = listCard.querySelector('.list-card-company');
  const listLink = listCard.querySelector('.list-card-link');
  const badgeLabels = listCard
    .querySelector('.list-card-badges')
    .children.map((badge) => badge.textContent);

  assert.equal(listTitle.textContent, 'Tech');
  assert.equal(listCompany.hidden, false);
  assert.equal(listCompany.textContent, 'Apple');
  assert.equal(listLink, null);
  assert.deepEqual(badgeLabels, ['Rejected']);
});

test('Fallback behavior: missing Position, missing Company, and missing both Company + Position', () => {
  localStorage.clear();
  const tracker = createDefaultTracker('tracker-fallbacks', 'Fallbacks');
  tracker.rows = [
    // 0: Position blank, Company exists -> title = Google, company subtitle hidden (not repeated twice)
    makeRow({ company: 'Google', position: '', status: 'Applied' }),
    // 1: Position exists, Company blank -> title = Frontend Developer, company subtitle hidden
    makeRow({ company: '', position: 'Frontend Developer', status: 'Applied' }),
    // 2: Both Company and Position blank -> title = Untitled Application, company subtitle hidden, row not mutated
    makeRow({ company: '', position: '', status: 'Applied' }),
  ];

  const app = createAppHarness(tracker);
  app.renderListView(tracker);

  const cards = app.listCards.querySelectorAll('.list-view-row');
  assert.equal(cards.length, 3);

  // Card 0: Company only
  assert.equal(cards[0].querySelector('.list-card-title').textContent, 'Google');
  assert.equal(cards[0].querySelector('.list-card-company').hidden, true);
  assert.equal(cards[0].querySelector('.list-card-company').textContent, '');

  // Card 1: Position only
  assert.equal(cards[1].querySelector('.list-card-title').textContent, 'Frontend Developer');
  assert.equal(cards[1].querySelector('.list-card-company').hidden, true);
  assert.equal(cards[1].querySelector('.list-card-company').textContent, '');

  // Card 2: Neither Company nor Position
  assert.equal(cards[2].querySelector('.list-card-title').textContent, 'Untitled Application');
  assert.equal(cards[2].querySelector('.list-card-company').hidden, true);
  assert.equal(cards[2].querySelector('.list-card-company').textContent, '');

  // Stored row values must remain empty strings (never persisted as "Untitled Application")
  assert.equal(tracker.rows[2][0].value, '');
  assert.equal(tracker.rows[2][1].value, '');
  assert.equal(app.getSaveCalls(), 0);
});

test('Cross-view consistency: editing Position/Company or switching Job Searches updates both Kanban and List', () => {
  localStorage.clear();
  const trackerA = createDefaultTracker('tracker-a', 'Search A');
  trackerA.rows = [
    makeRow({
      company: 'Google',
      position: 'Web dev',
      status: 'Applied',
    }),
  ];

  const trackerB = createDefaultTracker('tracker-b', 'Search B');
  trackerB.rows = [
    makeRow({
      company: 'Spotify',
      position: 'Backend Engineer',
      status: 'Interview',
    }),
  ];

  const app = createAppHarness(trackerA);
  app.refresh({ persist: false });

  assert.equal(app.kanbanColumns.querySelector('.kanban-card-company-name').textContent, 'Google');
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-position').textContent, 'Web dev');
  assert.equal(app.listCards.querySelector('.list-card-title').textContent, 'Web dev');
  assert.equal(app.listCards.querySelector('.list-card-company').textContent, 'Google');

  // Edit Position and Company on the shared row
  trackerA.rows[0][1].value = 'Frontend Developer';
  trackerA.rows[0][0].value = 'Google Philippines';
  app.refresh({ persist: false });

  assert.equal(app.kanbanColumns.querySelector('.kanban-card-company-name').textContent, 'Google Philippines');
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-position').textContent, 'Frontend Developer');
  assert.equal(app.listCards.querySelector('.list-card-title').textContent, 'Frontend Developer');
  assert.equal(app.listCards.querySelector('.list-card-company').textContent, 'Google Philippines');

  // Switch active Job Search
  app.setActiveTrackerForTest(trackerB);
  app.refresh({ persist: false });

  assert.equal(app.kanbanColumns.querySelector('.kanban-card-company-name').textContent, 'Spotify');
  assert.equal(app.kanbanColumns.querySelector('.kanban-card-position').textContent, 'Backend Engineer');
  assert.equal(app.listCards.querySelector('.list-card-title').textContent, 'Backend Engineer');
  assert.equal(app.listCards.querySelector('.list-card-company').textContent, 'Spotify');
  assert.equal(app.getSaveCalls(), 0);
});
