import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const overview = await import('../js/main/quickOverview.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('overview counts canonical applications and groups custom or blank statuses without mutating inputs', () => {
  assert.equal(typeof overview.getQuickOverviewMetrics, 'function');
  const applications = [
    ...Array.from({ length: 5 }, () => ({ status: 'Applied' })),
    ...Array.from({ length: 3 }, () => ({ status: 'Interview' })),
    { status: 'Offer' },
    { status: 'Rejected' },
    { status: 'Rejected' },
    { status: 'Assessment' },
  ];
  const before = structuredClone(applications);
  assert.deepEqual(overview.getQuickOverviewMetrics(applications), {
    totalApplications: 12, interviews: 3, offers: 1, needAttention: 0,
  });
  const column = { name: 'Status', type: 'select', options: [
    { label: 'Applied', color: '#D946EF' }, 'Interview', 'Offer', 'Rejected', 'Assessment',
  ] };
  assert.deepEqual(overview.getStatusSummary(applications, column), [
    { label: 'Applied', count: 5, color: '#D946EF' },
    { label: 'Interview', count: 3, color: '#22c55e' },
    { label: 'Offer', count: 1, color: '#a855f7' },
    { label: 'Rejected', count: 2, color: '#ef4444' },
    { label: 'Other', count: 1, color: '#64748b' },
  ]);
  assert.deepEqual(applications, before);
  assert.deepEqual(overview.getQuickOverviewMetrics([]), {
    totalApplications: 0, interviews: 0, offers: 0, needAttention: 0,
  });
  assert.deepEqual(overview.getStatusSummary([], column), []);
  assert.deepEqual(overview.getStatusSummary([{ status: '' }, { status: 'Submitted' }], column), [
    { label: 'Other', count: 2, color: '#64748b' },
  ]);
});

test('semantic metrics match current canonical labels case-insensitively, not custom status guesses', () => {
  assert.equal(typeof overview.getQuickOverviewMetrics, 'function');
  assert.deepEqual(overview.getQuickOverviewMetrics([
    { status: ' interview ' }, { status: 'OFFER' }, { status: 'Interviewing' }, { status: 'Accepted' },
  ]), { totalApplications: 4, interviews: 1, offers: 1, needAttention: 0 });
  assert.equal(overview.getQuickOverviewMetrics([{ status: 'Submitted' }]).offers, 0);
  assert.equal(overview.getStatusSummary([{ status: 'interview' }], {
    options: [{ label: 'Interview', color: 'pink' }],
  })[0].color, '#ec4899');
});

test('attention requires action text and a valid due date through tomorrow, excluding terminal statuses', () => {
  assert.equal(typeof overview.isApplicationNeedingAttention, 'function');
  const now = new Date(2026, 10, 12, 23, 59);
  for (const [patch, expected] of [
    [{ nextActionDate: '2026-11-01' }, true],
    [{ nextActionDate: '2026-11-12' }, true],
    [{ nextActionDate: '2026-11-13', status: 'Interview' }, true],
    [{ nextActionDate: '2026-11-14' }, false],
    [{ nextAction: '   ' }, false],
    [{ nextAction: '' }, false],
    [{ nextActionDate: '' }, false],
    [{ nextActionDate: 'invalid' }, false],
    [{ nextActionDate: '2026-02-30' }, false],
    [{ nextActionDate: '2026-11-12T00:00:00Z' }, false],
    [{ status: 'Rejected' }, false],
    [{ status: ' withdrawn ' }, false],
    [{ status: 'Assessment' }, true],
  ]) {
    const application = { status: 'Applied', nextAction: 'Follow up', nextActionDate: '2026-11-12', ...patch };
    assert.equal(overview.isApplicationNeedingAttention(application, now), expected, JSON.stringify(patch));
    assert.equal(overview.getQuickOverviewMetrics([application], now).needAttention, Number(expected));
  }
});

test('attention respects local days across timezones, DST, and year boundaries', () => {
  assert.equal(typeof overview.isApplicationNeedingAttention, 'function');
  const moduleUrl = new URL('../js/main/quickOverview.js', import.meta.url).href;
  for (const timezone of ['Asia/Manila', 'America/New_York', 'Pacific/Honolulu']) {
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { isApplicationNeedingAttention } from ${JSON.stringify(moduleUrl)};
      for (const [now, tomorrow, later] of [
        [new Date(2026, 11, 31, 23, 59), '2027-01-01', '2027-01-02'],
        [new Date(2026, 2, 7, 0, 1), '2026-03-08', '2026-03-09'],
        [new Date(2026, 9, 31, 23, 59), '2026-11-01', '2026-11-02'],
      ]) {
        const application = { status: 'Applied', nextAction: 'Follow up' };
        assert.equal(isApplicationNeedingAttention({ ...application, nextActionDate: tomorrow }, now), true);
        assert.equal(isApplicationNeedingAttention({ ...application, nextActionDate: later }, now), false);
      }
    `], { env: { ...process.env, TZ: timezone } });
  }
});
