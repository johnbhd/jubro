# Restore Board and List workspace navigation

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

The Kanban-only refactor removed the visible Board/List switch along with the Table renderer. Users could no longer move between the primary Kanban Board and the existing secondary List experience.

## Changes and resulting behavior

- Restored visible `Board` and `List` buttons in the Board toolbar.
- Kept Board as the default view and preserved the browser `jubro_board_view` preference.
- Added a focused List renderer that reads the same canonical tracker rows as Kanban.
- Reused application edit, delete, status movement, search, sorting, ownership, revision, and sync paths.
- Kept the Table renderer and its files removed.
- Preserved the Dashboard menu styling fix and all existing Kanban behavior.

## Files affected

Modified:

- `board/index.html`
- `css/global.css`
- `js/main/main.js`
- `js/main/trackerActions.js`
- `js/main/trackerEvents.js`
- `js/main/trackerSearch.js`
- `test/kanban.test.mjs`
- `docs/features.md` (local-only ignored overview)
- `docs/architecture.md` (local-only ignored overview)
- `docs/data-and-auth.md` (local-only ignored overview)
- `docs/development.md` (local-only ignored overview)

Created:

- `js/main/trackerListView.js`
- `test/listView.test.mjs`
- `docs/context/2026-11-06-fix-board-list-navigation.md`

## Verification

- Focused Board/List, Kanban, editor, and refresh tests: 21 passed, 0 failed.
- `npm test`: 77 passed, 0 failed.
- Existing Table source files remain deleted.
- No Firebase or storage schema changes were made.
- No push was performed.

## Limitations

- Table remains removed from the workspace.
- List is a focused secondary card view, not the former Table editor.
- Browser visual verification was not completed in this environment.
