import assert from 'node:assert/strict';
import test from 'node:test';
import { trackerDashboardMethods } from '../js/main/trackerDashboard.js';
import { trackerSortingMethods } from '../js/main/trackerSorting.js';
import { trackerUtilityMethods } from '../js/main/trackerUtils.js';
import { listIndexMethods } from '../js/main/listView/indexes.js';
import { createDefaultTracker } from '../js/tracker/defaultTracker.js';

class Element extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.attributes = {};
    this.textContent = '';
    this.hidden = false;
  }

  set innerHTML(value) {
    assert.equal(value, '');
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

globalThis.document = { createElement: () => new Element() };

function createApp() {
  return {
    ...trackerUtilityMethods,
    ...trackerSortingMethods,
    ...listIndexMethods,
    ...trackerDashboardMethods,
    tracker: createDefaultTracker('overview', 'My Job Search'),
    dashboardCards: new Element(),
    dashboardSummary: new Element(),
    dashboardEmptyState: new Element(),
    dashboardEmptyTitle: new Element(),
    dashboardEmptyDescription: new Element(),
    dashboardAddButton: new Element(),
    dashboardInsights: new Element(),
    dashboardSubtitle: new Element(),
    dashboardRangeSelect: { value: 'all-time' },
    getTracker() { return this.tracker; },
  };
}

function counts(app) {
  return app.dashboardCards.children.map(card => Number(card.children[2].textContent));
}

test('empty Quick Overview has four muted zeros, onboarding, Add CTA, and no status summary or Insights', () => {
  const app = createApp();
  const before = structuredClone(app.tracker);
  app.renderDashboard();

  assert.deepEqual(counts(app), [0, 0, 0, 0]);
  assert.equal(app.dashboardEmptyState.hidden, false);
  assert.equal(app.dashboardEmptyTitle.textContent, 'No applications yet');
  assert.match(app.dashboardEmptyDescription.textContent, /start adding your job applications/i);
  assert.equal(app.dashboardCards.children.every(card => card.className.includes('is-muted')), true);
  assert.equal(app.dashboardSummary.hidden, true);
  assert.equal(app.dashboardInsights.hidden, true);
  assert.equal(app.dashboardAddButton.hidden, false);
  assert.deepEqual(app.tracker, before);
});

test('Quick Overview distinguishes an empty period and restores summaries without changing canonical rows', () => {
  const app = createApp();
  app.tracker.rows = [['Google', 'Developer', '', 'Interview', '2026-01-10']];
  const before = structuredClone(app.tracker);
  app.dashboardRangeSelect.value = 'custom';
  app.dashboardDateFrom = { value: '2026-02-01' };
  app.dashboardDateTo = { value: '2026-02-28' };
  app.renderDashboard();
  assert.deepEqual(counts(app), [0, 0, 0, 0]);
  assert.equal(app.dashboardEmptyTitle.textContent, 'No applications in this period');
  assert.match(app.dashboardEmptyDescription.textContent, /try another/i);
  assert.equal(app.dashboardAddButton.hidden, true);

  app.dashboardRangeSelect.value = 'all-time';
  app.renderDashboard();
  assert.deepEqual(counts(app), [1, 1, 0, 0]);
  assert.equal(app.dashboardEmptyState.hidden, true);
  assert.equal(app.dashboardSummary.hidden, false);
  assert.equal(app.dashboardInsights.hidden, false);
  assert.deepEqual(app.tracker, before);

  app.tracker.rows = [];
  app.renderDashboard();
  assert.equal(app.dashboardEmptyTitle.textContent, 'No applications yet');
  assert.equal(app.dashboardSummary.children.length, 0);
});

test('overview resolves reordered fields and updates from canonical status/action values independent of view/search', () => {
  const app = createApp();
  app.tracker.columns = [
    { name: 'Next Action Date', type: 'date' },
    { name: 'Status', type: 'select', options: [{ label: 'Interview', color: 'pink' }, 'Offer'] },
    { name: 'Next Action', type: 'text' },
    { name: 'Company', type: 'text' },
  ];
  app.tracker.rows = [['2000-01-01', { value: 'Interview', type: 'select' }, 'Follow up', 'Google']];
  app.searchInput = { value: 'No matches' };
  app.viewSelect = { value: 'list' };
  app.dashboardRangeSelect.value = 'this-month';
  app.renderDashboard();
  assert.deepEqual(counts(app), [1, 1, 0, 1]);
  const firstBar = app.dashboardSummary.children[2].children[0];
  assert.equal(firstBar.style.backgroundColor, '#ec4899');
  assert.equal(firstBar.style.flexBasis, '100%');
  assert.equal(firstBar.attributes['aria-label'], 'Interview: 1');

  app.tracker.rows[0][1].value = 'Offer';
  app.tracker.rows[0][2] = '';
  app.renderDashboard();
  assert.deepEqual(counts(app), [1, 0, 1, 0]);

  app.tracker = createDefaultTracker('other', 'Other Search');
  app.dashboardRangeSelect.value = 'all-time';
  app.tracker.columns.splice(3, 1);
  app.tracker.rows = [['Other Company', 'Role', '', '2026-01-10']];
  app.renderDashboard();
  assert.deepEqual(counts(app), [1, 0, 0, 0]);
  assert.equal(app.dashboardSummary.children[2].children[0].attributes['aria-label'], 'Other: 1');
});
