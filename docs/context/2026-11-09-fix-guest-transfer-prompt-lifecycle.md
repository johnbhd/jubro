# Remember guest/account transfer decisions across page startup

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

Declining guest transfer preserved the guest workspace but recorded no decision. Every new page's authentication startup could ask again. `Auth` registered a styled modal, while `FirebaseAuthService` used native browser confirms when that UI was absent, including direct Board entry. A pristine empty automatically created guest Job Search also counted as transfer data. Account reconciliation unnecessarily saved and uploaded identical cache/cloud content on later startup.

## Changes and resulting behavior

### Shared lifecycle and modal

- All existing page entry points still wait for the central authentication/workspace service. No landing, Board, List, or Dashboard ownership policy was added.
- `FirebaseTrackerSync.syncLocalData()` shares one exact pending promise per UID, with cleanup after success or failure. `resolveSignedInWorkspace()` owns loading, reconciliation, guest policy, persistence, and transfer. Existing auth-level startup guards remain.
- Workspace ownership is checked after asynchronous loading/choices and before account persistence and successful-transfer marking. A choice from an account that is no longer active cannot authorize a transfer or decision write.
- The existing modal presentation and tracker-overwrite choice were extracted from `Auth` into `js/auth/syncChoice.js`. `FirebaseAuthService` uses these shared callbacks by default, even without navbar Auth initialization. Removed both native confirm fallbacks from that service. Unrelated delete/import confirms remain unchanged.
- One lazy modal is reused; queued choices cannot overwrite each other's handlers or content. Transfer title is `Guest Job Searches found`, with actual guest/account search counts and `Keep Account Only` / `Bring Guest Job Searches` buttons.
- Transfer requires an explicit choice. Escape and backdrop clicks do not choose for the user. Modal role, title/description relationships, real buttons, visible focus styles, initial cancel focus, Tab cycling, temporary background `inert`, and prior-focus restoration provide keyboard access. Handlers detach immediately after one choice, preventing double submission.

### Browser-local decision metadata

- Key: `jubro_guest_transfer_decision_<encoded UID>`. One latest record per account bounds snapshot history; no credentials are stored.
- Shape: `{ snapshot, decision, decidedAt }`. `decision` accepts only `keep-account` or `transferred`; `decidedAt` is an ISO timestamp. Invalid JSON, incomplete records, invalid dates/decisions, and nonmatching snapshots are treated as unresolved.
- `snapshot` is a serialized tuple of guest revision, sorted tracker IDs, and the legacy ownership flag. Storage inspection confirmed that normal guest saves, imports/replacements, and transfer cleanup advance the revision. Stable IDs additionally distinguish replaced tracker sets. No content hash, copied application payload, dependency, or new workspace revision field is needed.
- Decision reads/writes do not mutate canonical rows, increment workspace revision, or request cloud sync. They are absent from backup/export and Firebase payloads. Logout retains decisions. Different UIDs resolve independently; changed guest revisions invalidate the previous decision naturally.
- Keep Account Only records the choice before workspace resolution returns, preserves guest data byte-for-byte, and does not merge/upload it. Account content is retained. Identical account cache/cloud reconciliation now skips redundant local saves and uploads.
- Bring Guest and automatic transfer retain existing tracker ID/title matching, tracker-level conflict choices, account revision checks, and the upload queue. Only after account persistence and successful upload is `transferred` recorded; only afterward does existing revision-checked guest cleanup run. Failed uploads preserve guest data and leave the snapshot unresolved for retry.
- Account-load failures stop before guest choices/automatic transfer. Existing auth error reporting and safe cache behavior remain; failure is not classified as a confirmed empty account.

### Meaningful guest data

A single pristine empty `My Job Search` with the current default schema does not trigger a prompt or transfer. Renamed searches, customized schema/presentation, application rows, and additional searches remain meaningful. Legacy unowned meaningful data still requires consent even for an empty account. Existing user data is not migrated or deleted by this detection.

## Files affected

Created:

- `js/storage/guestTransferDecision.js`: meaningful-shell detection and separate per-UID decision metadata.
- `js/auth/syncChoice.js`: shared existing styled choice modal and transfer/overwrite callbacks.
- `test/guestTransfer.browser.mjs`: real DOM/auth-lifecycle checks through the existing Firefox/Firebase-fixture harness.
- This context record.

Modified:

- `js/storage/firebaseTrackerSync.js`: centralized guarded resolution, remembered decisions, success ordering, ownership checks, and no-op account reconciliation.
- `js/auth/firebaseAuth.js`: shared Jubro modal callbacks instead of browser confirms.
- `js/auth/auth.js`: remove duplicate modal ownership and resolver registration.
- `test/firebaseTrackerSync.test.mjs`: eleven focused regressions covering decisions, snapshots, failures, guards, meaningful data, and no-op reads/startup.
- `test/authWorkspace.test.mjs`: assert direct-page resolver wiring uses the shared modal callbacks.
- `test/statusCustomization.browser.mjs`: optional `JUBRO_TRANSFER_ONLY=1` verification mode.
- Local-only, Git-ignored `docs/data-and-auth.md`: document the metadata key and shared lifecycle.

Also inspected: `js/storage/storage.js`, `js/storage/workspacePolicy.js`, `js/services/trackerData.js`, `js/tracker/defaultTracker.js`, `js/app.js`, `js/home.js`, `js/main.js`, existing storage/auth/policy tests, Firebase test fixtures, context rules, local documentation index, and relevant dated ownership/theme records.

## Verification

- Before implementation, focused tests reproduced repeated declines (two prompts rather than one), pointless empty-shell transfer, and unchanged account revision/upload churn. Expanded browser focus checks then exposed background focus leakage; temporary native `inert` fixed it.
- `npm test`: 165 passed, 0 failed. Baseline was 154. Existing isolation, guest transfer, upload failure, stale revisions, import, typed values, Kanban, gestures, List/Table, sync ordering/coalescing, and cloud-conflict coverage remains green.
- `JUBRO_TRANSFER_ONLY=1 node test/statusCustomization.browser.mjs`: passed with no JavaScript errors using fixture Firebase only. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-MrbSgF`.
- Transfer modal checked in dark/light at 390, 430, and 1440px: one instance, fitting panel, initial button focus, Tab cycling, blocked outside focus, Escape/backdrop non-dismissal, explicit decline, unchanged guest bytes, and no second choice from repeated button events. Inspected dark/mobile and light/mobile screenshots.
- Fresh landing/Board documents, repeated Board navigation equivalent to refresh, List, Dashboard, logout and same-account re-login did not prompt for the resolved snapshot. A changed guest revision prompted again. Bring Guest merged both searches, uploaded, recorded success, and cleared only the transferred guest snapshot.
- The fixture resets on navigation, so browser checks explicitly restore the signed-in account after each fresh document. They exercise real shared auth/workspace resolution, not real Firebase login credentials. Direct Board resolves without navbar Auth initialization; landing uses the same resolver.
- Account A/B independence, failed account loading, failed transfer/retry, malformed metadata, same-revision/different-ID replacement, stale-account choices, customized empty searches, exact shared concurrent promise, decision-read zero writes, and unchanged-account zero revisions/uploads are covered by Node regressions.
- The same browser command also passed existing landing regressions in both themes at 390, 430, 768, 1024, 1440, and 1920px.
- Syntax checks: all 74 tracked/new JavaScript/MJS files passed. All three tracked JSON files parsed. `git diff --check` passed.
- No dependencies added. No push performed.

## Limitations

No real-account, production Firebase, physical-device, or deployed-site testing. No cross-tab modal lock was added; simultaneous unresolved tabs can each ask before either records a choice. The requested same-page guard and persistent later-startup suppression are covered. Decision persistence requires working browser localStorage; clearing browser data removes decisions, and storage-write failures use existing sync error reporting. Snapshot identity relies on the existing Storage API's monotonic revision contract, not arbitrary external edits to browser storage. The full unrelated Board workflow browser suite was not repeated; its previously documented Custom Fields click issue is outside this task. Build was not rerun because the local Tailwind CLI is missing; no CSS utility generation is required by this change.
