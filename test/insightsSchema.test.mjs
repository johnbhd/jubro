import test from 'node:test';
import assert from 'node:assert/strict';
import { insightsMethods } from '../js/main/insights/render.js';
import { trackerUtilityMethods } from '../js/main/trackerUtils.js';
import { execFileSync } from 'node:child_process';

globalThis.document = new EventTarget();
const { trackerActionMethods } = await import('../js/main/trackerActions.js');

test('analytics resolves reordered canonical fields and never substitutes unrelated dates or positions', () => {
  const tracker = {
    columns: ['Next Action Date', 'Status', 'Company', 'Application Date', 'Platform', 'Next Action'],
    rows: [[{ value: '2026-11-14' }, 'Interview', '<img onerror=alert(1)>', '2026-11-13', 'LinkedIn', 'Call']],
  };
  const app = { ...trackerUtilityMethods, ...insightsMethods, getTracker: () => tracker };
  const before = structuredClone(tracker);
  assert.deepEqual(app.getAnalyticsApplications(), [{
    company: '<img onerror=alert(1)>', position: '', status: 'Interview', date: '2026-11-13',
    platform: 'LinkedIn', nextAction: 'Call', nextActionDate: '2026-11-14',
    workSetup: '', employmentType: '', rowIndex: 0,
  }]);
  tracker.columns[3] = { name: 'Interview Date', type: 'date' };
  assert.equal(app.getAnalyticsApplications()[0].date, '');
  tracker.columns[3] = before.columns[3];
  assert.deepEqual(tracker, before);
});

test('Insights refresh skips Board/List rendering and workspace persistence', () => {
  let rendered = 0;
  const fail = () => { throw new Error('Unexpected mutation or Board render'); };
  const app = {
    isInsightsPage: true,
    getTracker: () => ({ title: 'Current' }),
    save: fail,
    renderKanban: fail,
    renderListView: fail,
    updateListFilterChipStyles: fail,
    applySearchFilter: fail,
    renderSelectTextSortOptions() {},
    renderSelectValueFilterOptions() {},
    updateSelectTextSortVisibility() {},
    updateBoardView() {},
    renderInsights() { rendered += 1; },
  };
  assert.equal(trackerActionMethods.refresh.call(app, { persist: false }), true);
  assert.equal(rendered, 1);
});

test('Insights period and due calculations remain local across DST and timezone boundaries', () => {
  const url = new URL('../js/main/insights/calculations.js', import.meta.url).href;
  for (const timezone of ['Asia/Manila', 'America/New_York', 'Pacific/Honolulu']) {
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { getInsights, getDueLabel, getPeriodRange } from ${JSON.stringify(url)};
      const now = new Date(2026, 2, 8, 23, 59);
      assert.equal(getPeriodRange('7-days', now).from, '2026-03-02');
      assert.equal(getDueLabel('2026-03-09', now), 'Due tomorrow');
      assert.equal(getDueLabel('2026-03-07', now), 'Overdue by 1 day');
      const result = getInsights([{ date: '2026-03-02' }, { date: '2026-03-08' }, { date: '2026-03-01' }], { period: '7-days', now });
      assert.equal(result.metrics.totalApplications, 2);
      assert.equal(result.activity.length, 7);
    `], { env: { ...process.env, TZ: timezone } });
  }
});
