import assert from 'node:assert/strict';
import test from 'node:test';
import { trackerDashboardMethods } from '../js/main/trackerDashboard.js';
import { trackerSortingMethods } from '../js/main/trackerSorting.js';
import { trackerUtilityMethods } from '../js/main/trackerUtils.js';
import { createDefaultTracker } from '../js/tracker/defaultTracker.js';

class Element extends EventTarget {
  constructor() {
    super();
    this.children = [];
    this.style = {};
    this.attributes = {};
    this.textContent = '';
  }

  set innerHTML(value) {
    assert.equal(value, '');
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

globalThis.document = {
  createElement: () => new Element(),
  createElementNS: () => new Element(),
};

function createApp() {
  const tracker = createDefaultTracker('dashboard-empty', 'My Job Search');
  return {
    ...trackerUtilityMethods,
    ...trackerSortingMethods,
    ...trackerDashboardMethods,
    dashboardCards: new Element(),
    dashboardCharts: new Element(),
    dashboardRangeSelect: { value: 'all-time' },
    getTracker: () => tracker,
  };
}

test('empty Dashboard explains there is no application data and removes stale charts', () => {
  const app = createApp();
  const before = structuredClone(app.getTracker());
  app.dashboardCharts.appendChild(new Element());

  app.renderDashboardCards(3);

  assert.equal(app.dashboardCards.children.length, 1);
  const message = app.dashboardCards.children[0];
  assert.match(message.textContent, /don't have any application data yet/i);
  assert.match(message.textContent, /add your first application/i);
  assert.equal(message.attributes.role, 'status');
  assert.equal(app.dashboardCharts.children.length, 0);
  assert.deepEqual(app.getTracker(), before);
});

test('Dashboard distinguishes an empty date range and restores summaries when the range includes data', () => {
  const app = createApp();
  app.getTracker().rows = [['Google', 'Developer', '', 'Applied', '2026-01-10']];
  const before = structuredClone(app.getTracker());
  app.dashboardRangeSelect.value = 'custom';
  app.dashboardDateFrom = { value: '2026-02-01' };
  app.dashboardDateTo = { value: '2026-02-28' };

  app.renderDashboardCards(3);

  assert.equal(app.dashboardCards.children.length, 1);
  assert.match(app.dashboardCards.children[0].textContent, /no applications in this date range/i);
  assert.equal(app.dashboardCharts.children.length, 0);

  app.dashboardRangeSelect.value = 'all-time';
  app.renderDashboardCards(3);
  assert.ok(app.dashboardCards.children.length > 1);
  assert.equal(app.dashboardCards.children[0].children[0].textContent, 'Applied');
  assert.equal(app.dashboardCards.children[0].children[1].textContent, 1);
  assert.equal(app.dashboardCharts.children.length, 1);
  assert.deepEqual(app.getTracker(), before);

  app.getTracker().rows = [];
  app.renderDashboardCards(3);
  assert.match(app.dashboardCards.children[0].textContent, /don't have any application data yet/i);
  assert.equal(app.dashboardCharts.children.length, 0);
});
