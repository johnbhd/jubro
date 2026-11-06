# Add application-created toast

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: feature

## Problem or goal

Creating an application gave no immediate confirmation. The Board needed a
short accessible message after the existing Add Application save completed.

## Changes and resulting behavior

- Added a live-region toast to the Board page.
- Successful Add Application creation now shows `New application created.` for
  a short period.
- The toast appears for Board, List, and empty-board Add Application controls,
  which share the existing `addRow({ useJobDefaults: true })` path.
- Failed persistence does not show the success toast.
- Storage, ownership, revision, sync, and Add Job behavior remain unchanged.

## Files affected

- [board/index.html](../../board/index.html) — accessible toast live region.
- [css/global.css](../../css/global.css) — light/dark toast surface styling.
- [js/main/trackerActions.js](../../js/main/trackerActions.js) — timed toast
  helper and success-only creation notification.
- [test/viewConsistency.test.mjs](../../test/viewConsistency.test.mjs) — verify
  successful Add Application creation reports the message.
- Local-only ignored [docs/features.md](../features.md) — document the toast
  behavior in the Kanban overview.

## Verification

- Full `npm test`: `80 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- `git diff --check`: passed.
- Browser visual verification was not performed.

## Limitations

The existing Add Job flow still creates its current default row values until
JUBRO-203. Live browser timing and theme rendering were not checked.
