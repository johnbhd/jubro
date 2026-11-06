# Add Kanban card action menu

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Kanban cards had status controls but no compact per-card access to common
actions. Users needed an edit/delete control beside the company title without
changing List behavior or creating a new persistence path.

## Changes and resulting behavior

- Added an accessible three-dot menu to each Kanban card title row.
- Added Edit and Delete menu actions that reuse the existing List edit modal and
  shared row deletion method.
- Added outside-click and Escape handling for open Kanban card menus.
- Added dark-theme menu surface and hover styling.
- Kept canonical state, save/revision checks, refresh behavior, drag/drop, and
  List rendering unchanged.

## Files affected

- [js/main/kanban.js](../../js/main/kanban.js) — render card menu and route its
  actions through existing application methods.
- [js/main/trackerEvents.js](../../js/main/trackerEvents.js) — close Kanban
  menus on outside click or Escape.
- [css/global.css](../../css/global.css) — menu transition and dark-theme
  styling.
- [test/kanban.test.mjs](../../test/kanban.test.mjs) — verify menu rendering and
  existing action bindings.
- Local-only ignored [docs/features.md](../features.md) and
  [docs/development.md](../development.md) — describe Kanban card menus in the
  local feature and verification overviews.

## Verification

- Focused Kanban suite: `17 passed, 0 failed`.
- Full `npm test`: `79 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- `git diff --check`: passed.
- Browser visual verification was not performed for this change.

## Limitations

The existing Delete action behavior is reused without adding a new confirmation
dialog. Live authenticated browser behavior was not checked.
