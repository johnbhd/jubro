# Restyle Add Application actions

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Add Application controls used black-and-white styling that did not fit the
Board navigation and surrounding Jubro surfaces. The request was visual only;
the existing add-row behavior had to remain unchanged.

## Changes and resulting behavior

- Added one shared `primary-action-button` style for Board navigation, List,
  and empty-board Add Application controls.
- Used blue primary styling in light mode and a readable lighter-blue variant
  with dark text in dark mode.
- Preserved icon-only Board navigation sizing, labels, click handlers, and the
  current Add Job behavior.

## Files affected

- [board/index.html](../../board/index.html) — apply shared styling to Board and
  List Add Application controls.
- [js/main/kanban.js](../../js/main/kanban.js) — apply shared styling to the
  empty-board action.
- [css/global.css](../../css/global.css) — define light/dark primary action
  colors, hover states, and subtle elevation.
- [test/kanban.test.mjs](../../test/kanban.test.mjs) — verify shared styling is
  present on the relevant controls.
- Local-only ignored [docs/features.md](../features.md) — note shared Add
  Application styling in the Kanban overview.

## Verification

- Focused Kanban suite: `17 passed, 0 failed`.
- Full `npm test`: `79 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- `git diff --check`: passed.
- Browser visual verification was not performed for this change.

## Limitations

Live browser theme rendering and authenticated Add Application behavior were
not checked. No storage, schema, or sync behavior changed.
