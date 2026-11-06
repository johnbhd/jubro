# Unify List/Table state and reduce sync write noise

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

JUBRO-008 to JUBRO-010 covered three reliability gaps. A successful List edit refreshed only List, so Table could show stale data until a browser refresh. Board startup performed an unrelated Firestore write to `test/connection`. Repeated same-revision sync requests could duplicate compatibility uploads, and tracker title input requested a cloud sync for every keystroke.

## Changes and resulting behavior

- List edit saves now use the shared `refresh({ persist: false })` path after local persistence. Table, List, filters, pagination, and open dashboard summaries read the same canonical tracker state.
- Persistent refreshes save before rendering. If local revision or ownership validation rejects the save, the app reloads stored state instead of displaying the rejected mutation as committed.
- Tracker title input saves local state immediately, debounces cloud synchronization for 300 ms, and flushes the pending sync on blur. Other real mutations cancel the pending title timer and sync the latest state once.
- Removed the Board startup `test/connection` Firestore write and its Firebase-only startup imports. Guest startup no longer needs a synthetic cloud write.
- Firebase uploads for one UID now serialize. Duplicate pending uploads for the same revision share one promise, preventing duplicate logical uploads. Different revisions remain ordered.
- Existing compatibility behavior remains: one logical sync still writes both `users/{uid}` and `trackerData/{uid}` documents.

## Files affected

- `js/app.js`: removed the synthetic connection-test write.
- `js/main/listView/editModal.js`: refreshes both views after a successful List edit.
- `js/main/trackerTableActions.js`: persists before redraw and reloads after rejected saves.
- `js/main/trackerEvents.js`: local-immediate, bounded tracker-title synchronization.
- `js/main/trackerState.js`: optional local-only save and title-sync scheduling/flush helpers.
- `js/storage/firebaseTrackerSync.js`: per-account upload ordering and same-revision coalescing.
- `test/listEditStale.test.mjs`: List-to-Table refresh regression coverage.
- `test/viewConsistency.test.mjs`: rejected-save and view-only-refresh coverage.
- `test/trackerState.test.mjs`: local-only save and title-sync coverage.
- `test/firebaseTrackerSync.test.mjs`: duplicate and ordered upload coverage.
- `test/appStartup.test.mjs`: runtime startup assertion for zero synthetic writes.
- `test/fixtures/firebase.mjs`: test-only Firestore write instrumentation and delay control.
- Local-only ignored overviews: `docs/README.md`, `docs/architecture.md`, `docs/features.md`, `docs/data-and-auth.md`, and `docs/development.md`.

## Verification

- `npm test`: 42 passed, 0 failed.
- `node --check` over 54 tracked `.js`/`.mjs` files: passed.
- JSON parsing for 3 repository JSON files: passed.
- `git diff --check`: passed.
- Source search found no remaining `test/connection`, `testFirestore`, or startup `setDoc` path in `js/`.
- Test double observed no Firestore writes during app startup, coalesced duplicate same-revision uploads to two compatibility writes, and preserved grouped ordering across different revisions.

## Limitations

No browser viewport matrix, live Firebase account, deployed rules, or production deployment was tested in this cycle. Firestore still has two physical compatibility writes per logical sync, and revision checks are not transactional across different devices; JUBRO-004 remains separate.
