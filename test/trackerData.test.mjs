import assert from 'node:assert/strict';
import test from 'node:test';

const { trackerUtilityMethods } = await import('../js/main/trackerUtils.js');
const {
  TrackerDataValidationError,
  normalizeCellValue,
  normalizeFullBackupImport,
  normalizeSingleTrackerImport,
} = await import('../js/services/trackerData.js');

test('accepts HTTP(S) links and rejects executable URL schemes', () => {
  assert.equal(
    trackerUtilityMethods.getSafeHttpUrl('https://example.com/jobs?id=1'),
    'https://example.com/jobs?id=1'
  );
  assert.equal(
    trackerUtilityMethods.getSafeHttpUrl('javascript:window.__jubroTest = true'),
    null
  );
  assert.equal(trackerUtilityMethods.getSafeHttpUrl('data:text/html,hello'), null);
  assert.equal(trackerUtilityMethods.getSafeHttpUrl('/relative/path'), null);
});

test('normalizes checkbox legacy strings without changing text values', () => {
  assert.equal(normalizeCellValue('checkbox', 'true', { strict: true }), true);
  assert.equal(normalizeCellValue('checkbox', 'false', { strict: true }), false);
  assert.equal(normalizeCellValue('checkbox', null), false);
  assert.equal(normalizeCellValue('text', 'true', { strict: true }), 'true');
  assert.throws(
    () => normalizeCellValue('checkbox', 'not-a-boolean', { strict: true }),
    TrackerDataValidationError
  );
});

test('accepts blank or valid project-format dates and rejects invalid dates', () => {
  assert.equal(normalizeCellValue('date', '', { strict: true }), '');
  assert.equal(normalizeCellValue('date', '2026-11-06', { strict: true }), '2026-11-06');
  assert.throws(
    () => normalizeCellValue('date', '11/06/2026', { strict: true }),
    TrackerDataValidationError
  );
});

test('pads short imported rows with typed empty cells', () => {
  const result = normalizeSingleTrackerImport({
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Applied', type: 'checkbox' },
      { name: 'Date', type: 'date' },
    ],
    rows: [[{ value: 'Jubro', type: 'text' }]],
  });

  assert.deepEqual(result.rows[0], [
    { value: 'Jubro', type: 'text' },
    { value: false, type: 'checkbox' },
    { value: '', type: 'date' },
  ]);
});

test('rejects imported rows with extra cells instead of discarding data', () => {
  assert.throws(
    () => normalizeSingleTrackerImport({
      columns: [{ name: 'Company', type: 'text' }],
      rows: [['Jubro', 'Unexpected cell']],
    }),
    TrackerDataValidationError
  );
});

test('requires the current full-backup marker and ignores imported ownership metadata', () => {
  const result = normalizeFullBackupImport({
    app: 'Jubro',
    version: 1,
    active: 'duplicate',
    ownerType: 'account',
    ownerId: 'foreign-account',
    revision: 9999,
    trackers: [
      {
        id: 'duplicate',
        title: '<img src=x>',
        columns: [{ name: 'Company', type: 'text' }],
        rows: [['First']],
      },
      {
        id: 'duplicate',
        title: 'Second',
        columns: [{ name: 'Company', type: 'text' }],
        rows: [['Second']],
      },
    ],
  });

  assert.equal(result.active, 'duplicate');
  assert.deepEqual(Object.keys(result.data), ['duplicate', 'duplicate_2']);
  assert.equal(result.data.duplicate.title, '<img src=x>');
  assert.equal(result.data.duplicate_2.title, 'Second');
  assert.equal(result.ownerType, undefined);
  assert.equal(result.ownerId, undefined);
  assert.equal(result.revision, undefined);
});

test('rejects unmarked full backups and unknown versions', () => {
  assert.throws(
    () => normalizeFullBackupImport({ trackers: [] }),
    TrackerDataValidationError
  );
  assert.throws(
    () => normalizeFullBackupImport({ app: 'Jubro', version: 2, trackers: [] }),
    TrackerDataValidationError
  );
});
