import assert from 'node:assert/strict';
import test from 'node:test';

const { createDefaultTracker } = await import('../js/tracker/defaultTracker.js');
const { listIndexMethods } = await import('../js/main/listView/indexes.js');
const { trackerSearchMethods } = await import('../js/main/trackerSearch.js');
const { trackerUtilityMethods } = await import('../js/main/trackerUtils.js');
const { normalizeSingleTrackerImport } = await import('../js/services/trackerData.js');

test('createDefaultTracker creates 10 columns with Work Setup and Employment Type', () => {
  const tracker = createDefaultTracker('test-1', 'My Applications');
  assert.equal(tracker.columns.length, 10);
  assert.deepEqual(tracker.columns.map((col) => col.name), [
    'Company',
    'Position',
    'Platform',
    'Status',
    'Date',
    'Link',
    'Work Setup',
    'Employment Type',
    'Next Action',
    'Next Action Date',
  ]);

  const workSetup = tracker.columns[6];
  assert.equal(workSetup.name, 'Work Setup');
  assert.equal(workSetup.type, 'select');
  assert.deepEqual(
    workSetup.options.map((opt) => opt.label),
    ['On-site', 'Hybrid', 'Remote']
  );

  const employmentType = tracker.columns[7];
  assert.equal(employmentType.name, 'Employment Type');
  assert.equal(employmentType.type, 'select');
  assert.deepEqual(
    employmentType.options.map((opt) => opt.label),
    ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Temporary']
  );
});

test('listIndexMethods resolves Work Setup and Employment Type on default 10-column tracker', () => {
  const tracker = createDefaultTracker('test-2');
  const context = {
    ...listIndexMethods,
    ...trackerUtilityMethods,
    getDateColumnIndex() {
      return 4;
    },
  };

  const indexes = context.getListColumnIndexes(tracker);
  assert.equal(indexes.company, 0);
  assert.equal(indexes.position, 1);
  assert.equal(indexes.platform, 2);
  assert.equal(indexes.status, 3);
  assert.equal(indexes.date, 4);
  assert.equal(indexes.link, 5);
  assert.equal(indexes.workSetup, 6);
  assert.equal(indexes.employmentType, 7);
  assert.equal(indexes.nextAction, 8);
  assert.equal(indexes.nextActionDate, 9);

  assert.equal(context.getListColumnFieldKey(tracker, 6), 'workSetup');
  assert.equal(context.getListColumnFieldKey(tracker, 7), 'employmentType');
  assert.equal(context.getListColumnFieldKey(tracker, 8), 'nextAction');
  assert.equal(context.getListColumnFieldKey(tracker, 9), 'nextActionDate');
});

test('listIndexMethods resolves legacy 8-column tracker with fallback safety', () => {
  const legacyTracker = {
    id: 'legacy-1',
    title: 'Legacy Tracker',
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      { name: 'Platform', type: 'select', options: ['LinkedIn'] },
      { name: 'Status', type: 'select', options: ['Applied'] },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' },
    ],
    rows: [],
  };

  const context = {
    ...listIndexMethods,
    ...trackerUtilityMethods,
    getDateColumnIndex() {
      return 4;
    },
  };

  const indexes = context.getListColumnIndexes(legacyTracker);
  assert.equal(indexes.workSetup, -1);
  assert.equal(indexes.employmentType, -1);
  assert.equal(indexes.nextAction, 6);
  assert.equal(indexes.nextActionDate, 7);

  assert.equal(context.getListColumnFieldKey(legacyTracker, 6), 'nextAction');
  assert.equal(context.getListColumnFieldKey(legacyTracker, 7), 'nextActionDate');
});

test('trackerSearchMethods searches Work Setup and Employment Type columns', () => {
  const tracker = createDefaultTracker('test-3');
  const context = {
    ...trackerSearchMethods,
  };

  const searchCols = context.getSearchColumnIndexes(tracker);
  assert.ok(searchCols.includes(6), 'Work Setup column index included in search');
  assert.ok(searchCols.includes(7), 'Employment Type column index included in search');

  const row = [
    { value: 'Acme Corp', type: 'text' },
    { value: 'Senior Frontend Dev', type: 'text' },
    { value: 'LinkedIn', type: 'select' },
    { value: 'Interview', type: 'select' },
    { value: '2026-11-09', type: 'date' },
    { value: 'https://example.com/job', type: 'text' },
    { value: 'Remote', type: 'select' },
    { value: 'Full-time', type: 'select' },
    { value: 'Prepare deck', type: 'text' },
    { value: '2026-11-12', type: 'date' },
  ];

  assert.equal(context.rowMatchesSearch(row, searchCols, 'remote'), true);
  assert.equal(context.rowMatchesSearch(row, searchCols, 'full-time'), true);
  assert.equal(context.rowMatchesSearch(row, searchCols, 'hybrid'), false);
  assert.equal(context.rowMatchesSearch(row, searchCols, 'internship'), false);
});

test('normalizeSingleTrackerImport preserves Work Setup and Employment Type', () => {
  const tracker = createDefaultTracker('test-4');
  tracker.rows.push([
    { value: 'Globex', type: 'text' },
    { value: 'DevOps Lead', type: 'text' },
    { value: 'Indeed', type: 'select' },
    { value: 'Applied', type: 'select' },
    { value: '2026-11-09', type: 'date' },
    { value: '', type: 'text' },
    { value: 'Hybrid', type: 'select' },
    { value: 'Contract', type: 'select' },
    { value: '', type: 'text' },
    { value: '', type: 'date' },
  ]);

  const imported = normalizeSingleTrackerImport(tracker);
  assert.equal(imported.columns.length, 10);
  assert.equal(imported.rows.length, 1);
  assert.deepEqual(imported.rows[0][6], { value: 'Hybrid', type: 'select' });
  assert.deepEqual(imported.rows[0][7], { value: 'Contract', type: 'select' });
});
