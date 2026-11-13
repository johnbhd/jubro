# Theme-aware Board and List loading skeletons

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: feature

## Problem or goal

Board previously waited for authentication and workspace preparation with no layout-matched loading feedback. The approved change adds neutral Kanban/List skeletons only during real loading, matching dark/light themes without inventing application data or delaying ready content.

## Changes and resulting behavior

- Initial HTML contains a separate toolbar/workspace skeleton before application startup finishes. An early defensive read of `jubro_board_view` selects Kanban or List without writing the preference. The controller re-reads the existing preference on subsequent loads.
- Kanban shows four neutral columns with two card shapes each. List shows an adaptive filter-sidebar placeholder and four rows. Shapes are non-interactive, hidden from assistive technology, and outside canonical application containers.
- Existing app surface colors provide light and dark variants. A low-contrast 1.8-second shimmer becomes static when reduced motion is requested. No new dependency or generated CSS change is required.
- During initial startup, refresh, unresolved account changes, and Retry, the top header stays visible while data-dependent controls/content are hidden and inert. The workspace exposes busy state and one polite loading status. Ready data replaces placeholders without a forced delay.
- Existing auth observers accept an optional pending hook and pass its returned context to the settled callback. Existing callers remain compatible. Board generation/current-user guards reject stale UI completions; background sync and instant local switches do not start skeletons.
- Retry preserves existing ownership checks and uses the same loading controller. Failed ownership resolution shows safe Retry, not an assumed-empty account. Loading cleanup never forces a Retry-hidden workspace open. An unexpected startup exception also shows safe Retry instead of leaving placeholders forever.
- Transfer dialogs remain outside the inert workspace and usable above skeletons. Empty workspaces finish with their existing UI-only guide cards. No loading state is written to Storage, revisions, or Firebase.

## Files affected

- `board/index.html`: early saved-view read, static skeleton markup, initial busy/inert state.
- `css/global.css`: neutral dark/light skeleton surfaces, responsive geometry, shimmer and reduced-motion rules.
- `js/main/workspaceLoading.js`: focused loading lifecycle, saved-view selection, generation guard, and safe startup fallback.
- `js/app.js`: initial/account resolution integration and stale completion protection.
- `js/auth/firebaseAuth.js`: backward-compatible optional pending hook.
- `js/main/jobSearch.js`: existing Retry integration.
- `test/workspaceLoading.test.mjs`, `test/authWorkspace.test.mjs`, `test/appStartup.test.mjs`: lifecycle, pending-hook ordering, and failure regressions.
- `test/workspaceLoading.browser.mjs`, `test/statusCustomization.browser.mjs`: delayed-auth fixture matrix and runtime checks; updated existing Quick Overview startup instrumentation.
- Local-only, Git-ignored `docs/architecture.md`, `docs/features.md`, `docs/development.md`, and `docs/plans/2026-11-13-workspace-skeletons.md`: implementation and verification guidance.

## Verification

- Test-first: pending-hook order and current saved-view selection failed before their implementation, then passed. Fresh review found an unguarded theme/storage setup exception; a throwing-storage startup test reproduced it, then passed after including setup in the safe Retry boundary.
- `npm test`: 239 passed, 0 failed, including seven added tests and existing auth/storage/ownership regressions.
- Initial normal-motion skeleton browser matrix passed both themes and both layouts at 390, 430, 768, 1024, 1440, and 1920px, with zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-qgEpL6`.
- Reduced-motion browser matrix passed those 24 skeleton combinations, transfer-dialog access, no loading writes, instant switches/background sync, safe unresolved-owner Retry, successful Retry, stale Account A/B completion, and the empty List guide. Existing landing regressions also passed in both themes at seven widths. Zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-ZKUS59`.
- Final combined normal-motion loading and Quick Overview browser run passed all expanded lifecycle checks, both skeleton layouts in both themes at the six requested widths, existing populated/empty overview behavior, and shared landing regressions. Zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-vQuWBp`.
- Inspected light 390px List and dark 1440px Kanban skeleton screenshots. Surface hierarchy and layout remain consistent with the workspace.
- JavaScript syntax checks for all nine affected JS/test modules passed. All tracked JSON files parsed. `git diff --check` passed.
- Fresh read-only review independently passed eight focused controller/auth tests. Its sole P2 finding was fixed with a RED-to-GREEN startup regression and the full green suite.

## Limitations

Browser checks use Firebase fixtures, controlled async gates, and the real application UI, not live accounts. Physical-device shimmer performance and native keyboard delivery remain manual checks. Headless Firefox reports inactive-window keyboard skips in shared landing tests. No loading timeout creates an empty workspace when account state is uncertain. No push performed.
