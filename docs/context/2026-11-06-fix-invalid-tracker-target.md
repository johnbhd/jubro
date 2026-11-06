# Prevent invalid tracker targets from opening another tracker

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Board initialization previously left the stored active tracker selected when `?tracker=<id>` did not match the current workspace. The browser URL could therefore name one tracker while the Board showed another. Direct Board startup could also create an implicit default tracker when no workspace existed.

## Changes and resulting behavior

Added explicit tracker-target resolution against the current loaded workspace. Valid keys and historical tracker IDs resolve to their matching tracker. Missing queries use the active/first current-workspace tracker and are canonicalized with `history.replaceState`. Empty, malformed, deleted, foreign-workspace, and unknown targets do not fall back; Board redirects to Trackers before rendering, saving, revision changes, or cloud synchronization. Missing storage now remains an empty workspace, so direct Board access with no trackers also recovers safely.

## Files affected

- [js/main/trackerState.js](../../js/main/trackerState.js): target resolver, canonical URL handling, safe redirect, and empty-workspace initialization.
- [js/main/main.js](../../js/main/main.js): resolve and validate the Board route before event/render initialization.
- [test/trackerRouting.test.mjs](../../test/trackerRouting.test.mjs): explicit, legacy-ID, malformed, empty-workspace, workspace-isolation, no-mutation, canonicalization, and redirect tests.
- Local-only ignored overviews [docs/architecture.md](../architecture.md), [docs/features.md](../features.md), [docs/data-and-auth.md](../data-and-auth.md), and [docs/development.md](../development.md): route behavior and verification notes.

## Verification

- `node --import ./test/register-loader.mjs --test test/trackerRouting.test.mjs`: 10 passed, 0 failed.
- `npm test`: 52 passed, 0 failed.
- `node --check` over 54 tracked JavaScript/MJS files: passed.
- JSON parsing over 3 tracked JSON files: passed.
- `git diff --check`: passed.
- Browser and production deployment checks were not available in this environment.

## Limitations

JUBRO-004 cross-device Firestore revision enforcement is still pending, so this fix does not provide final Phase 1 sign-off. Production routing and deployed Firebase behavior remain unverified.
