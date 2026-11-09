import { createDefaultTracker } from '../tracker/defaultTracker.js';

const DECISION_PREFIX = 'jubro_guest_transfer_decision_';

export function hasMeaningfulGuestData(state) {
  const trackers = Object.values(state?.data || {});

  if (trackers.length === 0) {
    return false;
  }

  if (trackers.length !== 1) {
    return true;
  }

  const tracker = trackers[0];
  if (!tracker || typeof tracker !== 'object') {
    return false;
  }

  const expected = createDefaultTracker(tracker.id, 'My Job Search');

  return tracker.title !== expected.title
    || JSON.stringify(tracker.columns) !== JSON.stringify(expected.columns)
    || JSON.stringify(tracker.rows) !== JSON.stringify(expected.rows)
    || Object.keys(tracker).some((key) => !Object.hasOwn(expected, key));
}

function snapshotIdentity(state) {
  // Storage saves, imports, and transfer cleanup all advance the guest revision.
  return JSON.stringify([
    state.revision,
    Object.keys(state.data || {}).sort(),
    state.legacyUnowned === true,
  ]);
}

function decisionKey(userId) {
  return `${DECISION_PREFIX}${encodeURIComponent(userId)}`;
}

export function getGuestTransferDecision(userId, guestState) {
  try {
    const record = JSON.parse(localStorage.getItem(decisionKey(userId)));

    if (
      record?.snapshot === snapshotIdentity(guestState)
      && ['keep-account', 'transferred'].includes(record.decision)
      && typeof record.decidedAt === 'string'
      && Number.isFinite(Date.parse(record.decidedAt))
    ) {
      return record.decision;
    }
  } catch {
    // Invalid metadata is unresolved, never authority to change workspace data.
  }

  return null;
}

export function rememberGuestTransferDecision(userId, guestState, decision) {
  if (!userId || !['keep-account', 'transferred'].includes(decision)) {
    throw new Error('Invalid guest transfer decision.');
  }

  localStorage.setItem(decisionKey(userId), JSON.stringify({
    snapshot: snapshotIdentity(guestState),
    decision,
    decidedAt: new Date().toISOString(),
  }));
}
