import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement extends EventTarget {
  constructor(tagName) {
    super();
    this.tagName = String(tagName || 'div').toUpperCase();
    this.children = [];
    this.childNodes = this.children;
    this.parentElement = null;
    this.dataset = {};
    this.attributes = {};
    this.className = '';
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
    this._innerHTML = html;
  }

  get innerHTML() {
    return this._innerHTML ?? '';
  }

  append(...nodes) {
    nodes.forEach((node) => this.appendChild(node));
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.childNodes = this.children;
    this._textContent = '';
    this.append(...nodes);
  }

  appendChild(node) {
    if (node instanceof FakeElement) {
      node.parentElement = this;
    }
    this.children.push(node);
    return node;
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
globalThis.document = new EventTarget();
globalThis.document.createElement = (tagName) => new FakeElement(tagName);
globalThis.document.createTextNode = (text) => {
  const span = new FakeElement('text');
  span.textContent = String(text ?? '');
  return span;
};

const elementsById = new Map();
globalThis.document.getElementById = (id) => elementsById.get(id) ?? null;
globalThis.document.body = new FakeElement('body');
const originalAppendChild = globalThis.document.body.appendChild.bind(globalThis.document.body);
globalThis.document.body.appendChild = (node) => {
  if (node.id) {
    elementsById.set(node.id, node);
  }
  return originalAppendChild(node);
};

const { showToast } = await import('../js/toast.js');
const { kanbanMethods } = await import('../js/main/kanban.js');
const { trackerUtilityMethods } = await import('../js/main/trackerUtils.js');
const { trackerSortingMethods } = await import('../js/main/trackerSorting.js');
const { listIndexMethods } = await import('../js/main/listView/indexes.js');

test('showToast for Application added creates top-right success toast with checkmark', () => {
  elementsById.clear();
  globalThis.document.body.children = [];

  showToast('Application added.');

  const toast = globalThis.document.getElementById('jubroToast');
  assert.ok(toast, 'Toast element was created');
  assert.equal(toast.classList.contains('jubro-toast-success'), true, 'Toast has success styling');
  assert.equal(toast.classList.contains('hidden'), false, 'Toast is visible');
  assert.equal(toast.getAttribute('role'), 'status');
  assert.equal(toast.getAttribute('aria-live'), 'polite');

  const icon = toast.querySelector('.jubro-toast-icon');
  assert.ok(icon, 'Success icon exists');
  assert.equal(icon.textContent, '✓');
  assert.ok(toast.textContent.includes('Application added.'));
});

test('showToast with success: true creates success toast and non-success does not', () => {
  elementsById.clear();
  globalThis.document.body.children = [];

  showToast('Custom success message', { success: true });
  let toast = globalThis.document.getElementById('jubroToast');
  assert.equal(toast.classList.contains('jubro-toast-success'), true);
  assert.ok(toast.querySelector('.jubro-toast-icon'));

  showToast('Standard info message', { success: false });
  toast = globalThis.document.getElementById('jubroToast');
  assert.equal(toast.classList.contains('jubro-toast-success'), false);
  assert.equal(toast.querySelector('.jubro-toast-icon'), null);
});

test('Kanban empty guide card renders white Company Name in dark mode, pills, and polished Next Action', () => {
  const tracker = {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select', options: ['LinkedIn'] },
      { name: 'Status', type: 'select', options: [
        { label: 'Applied', color: '#3b82f6' },
        { label: 'Interview', color: '#22c55e' },
      ] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Work Setup', type: 'select' },
      { name: 'Employment Type', type: 'select' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [],
  };

  const app = {
    ...trackerUtilityMethods,
    ...trackerSortingMethods,
    ...listIndexMethods,
    ...kanbanMethods,
    kanbanColumns: new FakeElement('div'),
    getTracker() {
      return tracker;
    },
  };

  app.renderKanban(tracker);

  const guide = app.kanbanColumns.querySelector('.kanban-guide-card');
  assert.ok(guide, 'Guide card rendered when tracker has no rows');

  // Verify Company Name styling has dark mode white text
  const companyEl = guide.querySelector('.kanban-guide-company');
  assert.ok(companyEl, 'Company element exists in guide');
  assert.equal(companyEl.textContent, 'Company Name');
  assert.ok(
    companyEl.classList.contains('dark:text-gray-100') || companyEl.className.includes('dark:text-gray-100'),
    'Company Name has dark:text-gray-100 class'
  );

  // Verify Position Role
  const positionEl = guide.querySelector('.kanban-guide-position');
  assert.ok(positionEl, 'Position element exists');
  assert.equal(positionEl.textContent, 'Position Role');

  // Verify Application Date · Platform
  const details = guide.querySelectorAll('.kanban-guide-details');
  assert.ok(details.some((d) => d.textContent.includes('Application Date · Platform')));

  // Verify Employment Type and Work Setup pills
  const employmentPill = guide.querySelector('.kanban-pill-employment');
  assert.ok(employmentPill, 'Employment Type pill exists in guide card');
  assert.equal(employmentPill.textContent, 'Full-time');

  const remotePill = guide.querySelector('.kanban-pill-remote');
  assert.ok(remotePill, 'Work Setup pill exists in guide card');
  assert.equal(remotePill.textContent, 'Remote');

  // Verify polished Next Action section
  const nextActionWrapper = guide.querySelector('.kanban-next-action-layout');
  assert.ok(nextActionWrapper, 'Next Action layout exists');

  const iconBox = guide.querySelector('.kanban-next-action-icon-box');
  assert.ok(iconBox, 'Next Action calendar icon box exists');

  const nextActionText = guide.querySelector('.kanban-next-action-text');
  assert.ok(nextActionText, 'Next Action text exists');
  assert.equal(nextActionText.textContent, 'Follow up with recruiter');

  const nextActionDate = guide.querySelector('.kanban-next-action-date');
  assert.ok(nextActionDate, 'Next Action Date badge exists');
  assert.equal(nextActionDate.textContent, 'Next Action Date');

  // Verify safety: guide card itself does not contain buttons or selects
  assert.equal(guide.querySelector('button'), null, 'Guide card has no button elements');
  assert.equal(guide.querySelector('select'), null, 'Guide card has no select elements');
});
