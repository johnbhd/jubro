import assert from 'node:assert/strict';
import test from 'node:test';

const { JSONService } = await import('../js/services/jsonService.js');

test('parses a valid single-tracker file through the shared validator', () => {
  const service = new JSONService();
  const result = service.parseSingleTrackerText(JSON.stringify({
    columns: [{ name: 'Applied', type: 'checkbox' }],
    rows: [['true']],
  }));

  assert.deepEqual(result.rows, [[{ value: true, type: 'checkbox' }]]);
});

test('rejects malformed single-tracker JSON before returning content', () => {
  const service = new JSONService();

  assert.throws(
    () => service.parseSingleTrackerText('{ not json'),
    /valid JSON/
  );
});

test('parses only marked full backups', () => {
  const service = new JSONService();
  const result = service.parseFullBackupText(JSON.stringify({
    app: 'Jubro',
    version: 1,
    active: null,
    trackers: [],
  }));

  assert.equal(result.active, null);
  assert.deepEqual(Object.keys(result.data), []);
});

test('reports unsupported full-backup versions with a user-safe message', () => {
  const service = new JSONService();

  assert.throws(
    () => service.parseFullBackupText(JSON.stringify({
      app: 'Jubro',
      version: 99,
      trackers: [],
    })),
    (error) => error.userMessage === 'This Jubro backup version is not supported.'
  );
});
