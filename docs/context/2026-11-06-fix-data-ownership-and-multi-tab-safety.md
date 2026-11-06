# Isolate account data and reject stale browser writes

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Jubro stored guest and authenticated tracker state in one unowned `flextracker_data` value. Logging out left account data active, so another account could see or upload it. Guest sign-in behavior could silently choose one side, and one tab could overwrite a newer whole-state save from another tab.

This coordinated cycle implements JUBRO-001, JUBRO-002, and JUBRO-003 without changing the framework, tracker row schema, Firestore document locations, List/Table features, or product design.

## Changes and resulting behavior

- Kept `flextracker_data` as the backwards-compatible guest workspace and added UID-scoped account cache keys.
- Added `ownerType`, `ownerId`, and monotonic `revision` metadata to persisted tracker state.
- Classified old unowned state as `legacyUnowned`; it remains visible to guests but always requires consent before account transfer.
- Made Firebase auth state establish the correct workspace before Trackers or Board state initializes.
- Switched to guest storage before logout notifications and removed only the deleted account's local cache during account deletion.
- Added explicit guest transfer policy: new guest data transfers automatically only into an empty account; populated accounts and all legacy data require a choice.
- Reused the existing sync modal for tracker and guest-transfer choices. Direct Board entry uses the browser confirm dialog when navbar auth UI is absent.
- Preserved both current Firestore locations and added ownership/revision metadata to their existing payloads.
- Added local revision checks and native `storage` event handling. Stale whole-state saves are rejected before cloud upload.
- Added an accessible reload notice. Passive tabs learn about newer data, while active edit forms are not auto-refreshed.
- Kept the List edit modal open when its stale save is rejected.
- Added dependency-free Node tests with Firebase stubs and an `npm test` command.

## Files affected

- `js/storage/storage.js`: guest/account keys, ownership, revisions, stale-write rejection, and storage events.
- `js/storage/workspacePolicy.js`: guest transfer decision policy.
- `js/storage/firebaseTrackerSync.js`: owned account sync, intentional guest transfer, cloud metadata, and owner validation.
- `js/storage/storageNotice.js`: user-facing stale/sync notice.
- `js/auth/firebaseAuth.js`: auth-ready workspace lifecycle, safe logout, shared sync promise, and direct-page fallback choices.
- `js/auth/auth.js`: reusable accessible sync/transfer dialog and safe import/delete replacement.
- `js/main.js`, `js/home.js`, and `js/app.js`: auth-ready page startup and notice setup.
- `js/homepage/homepage.js`, `js/main/trackerState.js`, and `js/main/listView/editModal.js`: stop dependent work after rejected saves.
- `package.json`: ES module declaration and focused test command.
- `test/*.test.mjs`, `test/firebase-loader.mjs`, `test/register-loader.mjs`, and `test/fixtures/firebase.mjs`: local regression suite and Firebase stubs.
- Local-only ignored overview documents: `docs/data-and-auth.md`, `docs/development.md`, and `docs/architecture.md`.
- `docs/context/2026-11-06-fix-data-ownership-and-multi-tab-safety.md`: this record.

## Verification

- `npm test`: 19 tests passed, 0 failed. Covered legacy guest classification, UID isolation, transfer modes, transfer idempotence, failed-upload preservation, auth/logout ordering, Account A to Account B isolation, revisions, storage events, and stale List-edit preservation.
- Ran `node --check` over every tracked JavaScript and MJS file: passed.
- Parsed `package.json`, `package-lock.json`, and `vercel.json`: passed.
- Ran a local Firefox/WebDriver BiDi matrix with repository source and in-memory Firebase modules. Passed fresh guest refresh, guest to empty account, A to logout to B isolation, same-account return, passive-tab notification, rejected stale save, transfer dialog, direct Board entry, and active edit preservation.
- Checked the transfer dialog and stale notice flow at 390, 430, 768, 1024, and 1440 pixels. No page-level horizontal overflow was observed.
- Ran `git diff --check`: passed before the record was written.

## Limitations

- Firestore revision metadata is not enforced with transactions. Concurrent writes from different devices can still use last-write-wins behavior and need a later cloud-conflict task.
- Firestore continues writing full state to both `users/{uid}.trackerData` and `trackerData/{uid}` in separate operations.
- Declined guest transfer leaves the guest workspace intact and asks again on a later login.
- Legacy unowned browser data cannot prove whether it originated as guest or old account data; Jubro preserves it and requires an explicit transfer decision.
- No real Firebase account, deployed security rules, production data, deployment, or live production mutation was tested.
- The existing Board `test/connection` write remains unchanged and outside this cycle.
