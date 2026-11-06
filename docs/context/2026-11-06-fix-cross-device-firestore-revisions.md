# Enforce Firestore cloud revisions across clients

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Same-browser local revision checks and same-client upload ordering did not protect against two independent clients uploading from the same old Firestore revision. A later client could overwrite newer cloud state. JUBRO-004 required server-side compare-and-set behavior while preserving both existing Firestore compatibility documents.

## Changes and resulting behavior

- Added `cloudRevision` tracking for account-local state. Local `revision` remains responsible for same-browser storage safety.
- Replaced sequential tracker uploads with one Firestore transaction. The transaction reads `trackerData/{uid}` as primary, uses `users/{uid}.trackerData` only when needed, compares the original expected cloud revision, and writes both compatibility payloads with the next revision.
- Added a distinct `sync/cloud-conflict` error. It preserves local work and uses the existing reload notice path instead of force-overwriting newer cloud data.
- Kept empty accounts at revision zero and treated legacy cloud payloads without a revision as revision zero.
- Preserved cloud base metadata during signed-in full-backup import, so a valid import uses normal cloud conflict protection.
- Extended the Firebase test fixture with shared document versions and transaction retries. Tests use separate `FirebaseTrackerSync` instances and separate state objects with the same UID.

## Files affected

- `js/storage/firebaseTrackerSync.js` — cloud revision model, transaction compare-and-set, atomic compatibility writes, conflict reporting, and upload queue integration.
- `js/storage/storage.js` — update cloud-base metadata without changing local revision.
- `js/storage/storageNotice.js` — accessible cloud-conflict reload notice.
- `js/auth/firebaseAuth.js`, `js/main/trackerState.js`, `js/homepage/homepage.js`, `js/auth/auth.js` — route cloud conflicts through existing sync feedback and preserve import cloud base.
- `test/fixtures/firebase.mjs` — shared transaction-capable Firestore test backend.
- `test/firebaseTrackerSync.test.mjs`, `test/storage.test.mjs` — stale-client, retry, empty/legacy cloud, atomicity, deletion, local-preservation, and cloud-base tests.
- `docs/architecture.md`, `docs/data-and-auth.md`, `docs/development.md`, `docs/features.md` — local ignored overview updates; these files are not committed by the repository's ignore policy.

## Verification

- `npm test` — 62 passed, 0 failed.
- `node --check` for all tracked `.js` and `.mjs` files — passed.
- JSON parsing for all tracked `.json` files — passed.
- `git diff --check` — passed.
- Source search confirmed no `test/connection` write and found the transaction path, cloud metadata, and distinct conflict code.
- Independent-client simulation passed: same UID, separate client instances/state snapshots, shared fake Firestore backend, first-writer-wins stale rejection, reverse ordering, concurrent transaction retry, empty-account race, legacy no-revision upgrade, and atomic dual-document writes.

## Limitations

No real two-device test was performed. Live production Firestore transaction behavior and deployed Firestore security rules were not verified. Explicit all-data/account deletion still uses its existing separate deletion operations; normal tracker sync compatibility writes are transactional.
