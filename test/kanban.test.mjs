import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

globalThis.document = new EventTarget();
globalThis.document.querySelectorAll = () => [];
globalThis.document.getElementById = () => null;
globalThis.window = new EventTarget();
globalThis.window.matchMedia = () => ({ matches: false });

const {
  getKanbanStatusColumn,
  getKanbanColumns,
  groupKanbanRows,
  kanbanMethods,
} = await import('../js/main/kanban.js');
const { trackerActionMethods } = await import('../js/main/trackerActions.js');
const { trackerSearchMethods } = await import('../js/main/trackerSearch.js');
const { boardViewMethods } = await import('../js/main/listView/boardView.js');

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
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = nodes;
    this.childNodes = this.children;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  setAttribute(name, value) {
    this[name] = String(value);
  }
}

function createTracker(overrides = {}) {
  return {
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Status', type: 'select', options: [
        { label: 'Applied', color: '#3b82f6' },
        { label: 'Interview', color: '#22c55e' },
        { label: 'Rejected', color: '#ef4444' },
      ] },
    ],
    rows: [
      [
        { value: 'Alpha', type: 'text' },
        { value: 'Applied', type: 'select' },
      ],
      [
        { value: 'Beta', type: 'text' },
        { value: 'Interview', type: 'select' },
      ],
    ],
    ...overrides,
  };
}

test('derives Kanban columns from custom Status select options in order', () => {
  const tracker = createTracker({
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Status', type: 'select', options: [
        { label: 'Wishlist', color: '#a855f7' },
        { label: 'Phone Screen', color: '#0ea5e9' },
      ] },
    ],
    rows: [],
  });

  assert.deepEqual(getKanbanStatusColumn(tracker), {
    index: 1,
    column: tracker.columns[1],
  });
  assert.deepEqual(getKanbanColumns(tracker), [
    { value: 'Wishlist', label: 'Wishlist', color: '#a855f7' },
    { value: 'Phone Screen', label: 'Phone Screen', color: '#0ea5e9' },
  ]);
});

test('keeps empty configured status columns and groups row indexes by status', () => {
  const result = groupKanbanRows(createTracker());

  assert.deepEqual(result.groups.map((group) => ({
    value: group.value,
    rowIndexes: group.rowIndexes,
  })), [
    { value: 'Applied', rowIndexes: [0] },
    { value: 'Interview', rowIndexes: [1] },
    { value: 'Rejected', rowIndexes: [] },
  ]);
});

test('keeps row statuses missing from options and blank statuses visible', () => {
  const tracker = createTracker({
    rows: [
      [
        { value: 'Alpha', type: 'text' },
        { value: 'Archived', type: 'select' },
      ],
      [
        { value: 'Beta', type: 'text' },
        { value: '', type: 'select' },
      ],
    ],
  });

  assert.deepEqual(groupKanbanRows(tracker).groups.map((group) => ({
    value: group.value,
    rowIndexes: group.rowIndexes,
  })), [
    { value: 'Applied', rowIndexes: [] },
    { value: 'Interview', rowIndexes: [] },
    { value: 'Rejected', rowIndexes: [] },
    { value: 'Archived', rowIndexes: [0] },
    { value: '', rowIndexes: [1] },
  ]);
});

test('keeps rows visible when tracker has no Status select column', () => {
  const tracker = createTracker({
    columns: [{ name: 'Company', type: 'text' }],
    rows: [[{ value: 'Alpha', type: 'text' }]],
  });

  assert.equal(getKanbanStatusColumn(tracker), null);
  assert.deepEqual(groupKanbanRows(tracker).groups, [{
    value: null,
    label: 'Applications',
    color: '#6b7280',
    rowIndexes: [0],
  }]);
});

test('renders user values as text in Kanban cards', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const container = new FakeElement('div');
  const payload = '<img src=x onerror="window.__jubroTest = true">';
  const tracker = createTracker({
    rows: [[
      { value: payload, type: 'text' },
      { value: 'Interview', type: 'select' },
    ]],
  });

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

  try {
    kanbanMethods.renderKanban.call({
      kanbanColumns: container,
      getListColumnIndexes() {
        return {
          company: 0,
          position: -1,
          date: -1,
          platform: -1,
        };
      },
      getCellDisplay(cell) {
        return cell?.value || '-';
      },
      moveKanbanRow() {},
    }, tracker);

    assert.match(container.textContent, new RegExp(payload.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(container.children.length, 3);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test('separates Kanban date and platform metadata', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const container = new FakeElement('div');
  const tracker = createTracker({
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Date Applied', type: 'date' },
      { name: 'Platform', type: 'text' },
      { name: 'Status', type: 'select', options: [
        { label: 'Applied', color: '#3b82f6' },
      ] },
    ],
    rows: [[
      { value: 'Alpha', type: 'text' },
      { value: 'Engineer', type: 'text' },
      { value: '2026-11-06', type: 'date' },
      { value: 'LinkedIn', type: 'text' },
      { value: 'Applied', type: 'select' },
    ]],
  });

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

  try {
    kanbanMethods.renderKanban.call({
      kanbanColumns: container,
      getListColumnIndexes() {
        return {
          company: 0,
          position: 1,
          date: 2,
          platform: 3,
        };
      },
      getCellDisplay(cell) {
        return cell?.value || '-';
      },
      moveKanbanRow() {},
    }, tracker);

    assert.match(container.textContent, /2026-11-06·LinkedIn/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test('renders the empty tracker Board state with an Add Application action', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const container = new FakeElement('div');

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

  try {
    kanbanMethods.renderKanban.call({ kanbanColumns: container }, createTracker({ rows: [] }));

    assert.match(container.textContent, /Your job pipeline is empty/);
    assert.match(container.textContent, /Add Application/);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

test('keeps Kanban content and icon-only Add Application CTA usable at responsive widths', () => {
  const boardMarkup = readFileSync('board/index.html', 'utf8');
  const kanbanSource = readFileSync('js/main/kanban.js', 'utf8');
  const globalStyles = readFileSync('css/global.css', 'utf8');

  assert.match(boardMarkup, /id="kanbanColumns"[^>]*kanban-scroll-area/);
  assert.match(boardMarkup, /id="btnAddApplication"[^>]*title="Add Application"/);
  assert.doesNotMatch(boardMarkup, /kanban-add-label/);
  assert.match(kanbanSource, /kanban-card-meta/);
  assert.match(kanbanSource, /kanban-card-meta-separator/);
  assert.match(globalStyles, /\.kanban-scroll-area\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(globalStyles, /\.kanban-column\s*\{[^}]*min-width:/s);
  assert.match(globalStyles, /\.kanban-card\s*\{[^}]*overflow:\s*visible/s);
});

test('keeps Kanban column headers readable and grouped in both themes', () => {
  const kanbanSource = readFileSync('js/main/kanban.js', 'utf8');
  const globalStyles = readFileSync('css/global.css', 'utf8');

  assert.match(kanbanSource, /kanban-column-header/);
  assert.match(kanbanSource, /kanban-column-title/);
  assert.match(kanbanSource, /kanban-column-count/);
  assert.match(kanbanSource, /kanban-column-empty/);
  assert.match(globalStyles, /\.kanban-column\s*\{[^}]*background-color:/s);
  assert.match(globalStyles, /\.kanban-column-header\s*\{[^}]*border-bottom:/s);
  assert.match(globalStyles, /\.dark \.kanban-column\s*\{[^}]*background-color:/s);
  assert.match(globalStyles, /\.dark \.kanban-column-title\s*\{[^}]*color:/s);
  assert.match(globalStyles, /\.dark \.kanban-column-count\s*\{[^}]*color:/s);
});

test('moves a Kanban card through the canonical save and refresh path', () => {
  const tracker = createTracker();
  let saveCalls = 0;
  let refreshOptions = null;

  const app = {
    ...kanbanMethods,
    getTracker() {
      return tracker;
    },
    save() {
      saveCalls += 1;
      return true;
    },
    refresh(options) {
      refreshOptions = options;
    },
  };

  assert.equal(app.moveKanbanRow(0, 'Interview'), true);
  assert.equal(tracker.rows[0][1].value, 'Interview');
  assert.equal(tracker.rows[0][1].type, 'select');
  assert.equal(saveCalls, 1);
  assert.deepEqual(refreshOptions, { persist: false });
});

test('reloads canonical state when a Kanban status save is rejected', () => {
  const tracker = createTracker();
  let reloaded = false;
  let refreshed = false;

  const app = {
    ...kanbanMethods,
    getTracker() {
      return tracker;
    },
    save() {
      return false;
    },
    reloadStateFromStorage() {
      reloaded = true;
      tracker.rows[0][1].value = 'Applied';
    },
    refresh() {
      refreshed = true;
    },
  };

  assert.equal(app.moveKanbanRow(0, 'Interview'), false);
  assert.equal(reloaded, true);
  assert.equal(refreshed, false);
  assert.equal(tracker.rows[0][1].value, 'Applied');
});

test('refresh renders Kanban and List from the canonical tracker', () => {
  let kanbanCalls = 0;
  const app = {
    dashboardModal: null,
    getTracker() {
      return {
        title: 'Tracker',
        columns: [],
        rows: [],
      };
    },
    renderKanban() {
      kanbanCalls += 1;
    },
    renderListView() {},
    renderSelectTextSortOptions() {},
    renderSelectValueFilterOptions() {},
    updateBoardView() {},
    updateListFilterChipStyles() {},
    updateSelectTextSortVisibility() {},
    applySearchFilter() {},
    titleInput: { value: '' },
    save() {},
  };

  trackerActionMethods.refresh.call(app, { persist: false });

  assert.equal(kanbanCalls, 1);
});

test('search targets Kanban cards without treating search as a mutation', () => {
  const queriedSelectors = [];
  const card = {
    dataset: { rowIndex: '0' },
    classList: {
      toggle() {},
    },
  };

  const previousDocument = globalThis.document;

  globalThis.document = {
    querySelectorAll(selector) {
      queriedSelectors.push(selector);
      return [card];
    },
  };

  try {
    const app = {
      ...trackerSearchMethods,
      viewSelect: { value: 'kanban' },
      searchInput: { value: 'alpha' },
      sortSelect: { value: '' },
      noSearchResults: { classList: { toggle() {} } },
      getTracker() {
        return createTracker();
      },
      getActiveListFilterValues() {
        return [];
      },
      rowMatchesSearch() {
        return true;
      },
      rowMatchesSelectFilter() {
        return true;
      },
      applyPagination() {},
    };

    trackerSearchMethods.applySearchFilter.call(app);
    assert.equal(queriedSelectors[0], '#kanbanView [data-row-index]');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('defaults Board view to Kanban and maps legacy preferences to Kanban', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const values = new Map();

  globalThis.document = {
    querySelectorAll() {
      return [];
    },
  };
  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };
  globalThis.localStorage = {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  try {
    const app = {
      viewSelect: { value: 'table' },
      updateBoardViewToggle() {},
    };

    boardViewMethods.restoreBoardViewPreference.call(app);
    assert.equal(app.viewSelect.value, 'kanban');
    assert.equal(values.get('jubro_board_view'), 'kanban');

    values.set('jubro_board_view', 'list');
    app.viewSelect.value = 'kanban';
    boardViewMethods.restoreBoardViewPreference.call(app);
    assert.equal(app.viewSelect.value, 'list');
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});

test('rejects removed legacy view state', () => {
  const app = {
    viewSelect: { value: 'kanban' },
    resetPagination() {},
    saveBoardViewPreference() {
      this.savedView = this.viewSelect.value;
    },
    updateBoardView() {
      this.updatedView = this.viewSelect.value;
    },
    applySearchFilter() {},
  };

  boardViewMethods.setBoardView.call(app, 'table');

  assert.equal(app.viewSelect.value, 'kanban');
  assert.equal(app.savedView, undefined);
  assert.equal(app.updatedView, undefined);
});

test('Board markup exposes only Kanban and List view controls', () => {
  const boardMarkup = readFileSync(new URL('../board/index.html', import.meta.url), 'utf8');
  const globalStyles = readFileSync(new URL('../css/global.css', import.meta.url), 'utf8');

  assert.match(boardMarkup, /id="kanbanView"/);
  assert.match(boardMarkup, /id="kanbanColumns"/);
  assert.match(boardMarkup, /data-board-view-button="kanban"/);
  assert.match(boardMarkup, /data-board-view-button="list"/);
  assert.equal((boardMarkup.match(/data-board-view-button=/g) || []).length, 2);
  assert.doesNotMatch(boardMarkup, /data-board-view-button="table"/);
  assert.doesNotMatch(boardMarkup, /id="tableView"/);
  assert.doesNotMatch(boardMarkup, /id="tableSortSelect"/);
  assert.match(boardMarkup, /id="btnAddApplication"/);
  assert.ok(
    boardMarkup.indexOf('data-board-view-button="list"')
      < boardMarkup.indexOf('id="btnAddApplication"')
  );
  assert.match(boardMarkup, /id="btnDashboard"/);
  assert.match(boardMarkup, /id="btnImport"/);
  assert.match(boardMarkup, /id="btnExport"/);
  assert.match(globalStyles, /#btnDashboard\s*\{[^}]*background-color:\s*transparent/s);
});
