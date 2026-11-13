import test from 'node:test';
import assert from 'node:assert/strict';
import { getInsights, getPeriodRange, getDueLabel } from '../js/main/insights/calculations.js';

const now = new Date(2026, 10, 13, 23, 45);
const applications = [
  { date: '2026-11-13', status: 'Interview', platform: 'LinkedIn' },
  { date: '2026-11-07', status: 'Offer', platform: 'Custom' },
  { date: '2026-10-15', status: 'Applied', nextAction: 'Follow up', nextActionDate: '2026-11-12' },
  { date: '2026-10-14', status: 'Assessment', nextAction: 'Review', nextActionDate: '2026-11-14' },
  { date: '', status: '', platform: '' },
  { date: '2026-02-30', status: 'Rejected' },
];
const statusColumn = { options: [{ label: 'Assessment', color: '#D946EF' }, 'Applied', 'Interview', 'Offer'] };

test('Insights periods use inclusive local days and clamp three-month boundaries', () => {
  assert.equal(getPeriodRange('7-days', now).from, '2026-11-07');
  assert.equal(getPeriodRange('30-days', now).from, '2026-10-15');
  assert.equal(getPeriodRange('3-months', new Date(2026, 4, 31)).from, '2026-03-01');
  assert.equal(getPeriodRange('all-time', now), null);
});

test('Insights separates period metrics from current pipeline and attention without mutations', () => {
  const before = structuredClone(applications);
  const result = getInsights(applications, { period: '7-days', now, statusColumn, platformColumn: { options: ['LinkedIn'] } });
  assert.deepEqual(result.metrics, { totalApplications: 2, interviews: 1, offers: 1, needAttention: 2 });
  assert.equal(result.pipeline.reduce((sum, group) => sum + group.count, 0), 6);
  assert.equal(result.pipeline[0].label, 'Assessment');
  assert.equal(result.pipeline[0].color, '#D946EF');
  assert.deepEqual(result.platforms.map(({ label, count }) => [label, count]), [['LinkedIn', 1], ['Other', 1]]);
  assert.equal(result.undated, 2);
  assert.equal(result.activity.length, 7);
  assert.equal(result.activity.reduce((sum, bucket) => sum + bucket.count, 0), 2);
  assert.deepEqual(applications, before);
});

test('activity buckets preserve counts, invalid dates stay excluded, All Time includes undated metrics', () => {
  for (const period of ['30-days', '3-months', 'all-time']) {
    const result = getInsights(applications, { period, now, statusColumn });
    assert.equal(result.activity.reduce((sum, bucket) => sum + bucket.count, 0), period === '30-days' ? 3 : 4);
    assert.ok(result.activity.length < 20);
  }
  assert.equal(getInsights(applications, { period: 'all-time', now }).metrics.totalApplications, 6);
  assert.equal(getInsights([], { now }).activity.every(bucket => bucket.count === 0), true);
});

test('upcoming actions share terminal and validation rules, sorted by urgency with local labels', () => {
  const rows = [
    { nextAction: 'Later', nextActionDate: '2026-11-20', status: 'Applied' },
    { nextAction: 'Today', nextActionDate: '2026-11-13', status: 'Interview' },
    { nextAction: 'Yesterday', nextActionDate: '2026-11-12', status: 'Assessment' },
    { nextAction: 'No', nextActionDate: '2026-11-13', status: 'Withdrawn' },
    { nextAction: '', nextActionDate: '2026-11-13' },
    { nextAction: 'Invalid', nextActionDate: '2026-02-30' },
  ];
  const result = getInsights(rows, { now });
  assert.equal(result.metrics.needAttention, 2);
  assert.deepEqual(result.upcoming.map(item => item.nextAction), ['Yesterday', 'Today', 'Later']);
  assert.equal(getDueLabel('2026-11-12', now), 'Overdue by 1 day');
  assert.equal(getDueLabel('2026-11-13', now), 'Due today');
  assert.equal(getDueLabel('2026-11-14', now), 'Due tomorrow');
});

test('platform and secondary breakdowns use canonical values without inventing empty categories', () => {
  const platforms = ['LinkedIn', 'Indeed', 'JobStreet', 'OnlineJobsPH'];
  const rows = [...platforms, 'Unknown', ''].map((platform, index) => ({
    date: '2026-11-13', platform, status: index < 4 ? platforms[index] : '',
    workSetup: index === 0 ? 'Remote' : '', employmentType: index === 0 ? 'Internship' : '',
  }));
  const result = getInsights(rows, { now, platformColumn: { options: platforms } });
  assert.deepEqual(result.platforms.map(group => [group.label, group.count]), [
    ['LinkedIn', 1], ['Indeed', 1], ['JobStreet', 1], ['OnlineJobsPH', 1], ['Other', 2],
  ]);
  assert.deepEqual(result.workSetup.map(group => [group.label, group.count]), [['Remote', 1]]);
  assert.deepEqual(result.employmentType.map(group => [group.label, group.count]), [['Internship', 1]]);
  assert.equal(result.pipeline.at(-1).label, 'No status');
  assert.equal(result.pipeline.at(-1).count, 2);
  assert.deepEqual(getInsights([], { now }).workSetup, []);
});

test('monthly activity includes gaps and excludes future applications from bounded periods', () => {
  const rows = [{ date: '2026-09-01' }, { date: '2026-11-13' }, { date: '2026-11-14' }];
  assert.deepEqual(getInsights(rows, { period: 'all-time', now }).activity.map(bucket => bucket.count), [1, 0, 2]);
  assert.equal(getInsights(rows, { period: '7-days', now }).metrics.totalApplications, 1);
});
