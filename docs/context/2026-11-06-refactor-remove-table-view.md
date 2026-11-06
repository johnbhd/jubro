# Remove retired Table view

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: refactor

## Problem or goal

The Board navigation still exposed a third Table view even though the intended workspace now has only the status-driven Board and focused List views. Table markup, renderer code, column context actions, and table-specific selectors also remained in the Board runtime.

## Changes and resulting behavior

- Board navigation now exposes exactly two inline choices: Board and List.
- Board remains the default, and a saved legacy `table` preference resolves to Kanban instead of opening a removed view.
- Add Application stays after the two-view switch on the same non-wrapping toolbar row.
- Removed the Table DOM, Table renderer, table-only view routing, table events, table-only column context actions, and table-specific sort naming.
- Preserved the canonical tracker state, Kanban/List refresh path, row actions, search, filters, typed values, ownership checks, revision checks, and sync behavior.
- Updated product copy and local ignored overview documentation to describe Board/List only.

## Files affected

- `board/index.html`: remove Table view markup and expose Board/List navigation.
- `css/global.css`: remove Table-only styles and rename workspace selectors.
- `js/main/table.js`: deleted retired Table renderer.
- `js/main/trackerActions.js`: shared refresh and row actions without Table rendering or column-view actions.
- `js/main/main.js`, `js/main/listView/boardView.js`, `js/main/trackerEvents.js`, `js/main/trackerKeyboard.js`, `js/main/trackerSearch.js`, `js/main/trackerSorting.js`, `js/main/ui.js`: remove Table routing, events, selectors, and dead handlers.
- `test/kanban.test.mjs`, `test/viewConsistency.test.mjs`: update regression coverage for the two-view workspace.
- `readme.md`, `index.html`: update user-facing Board/List wording.
- `docs/features.md`, `docs/architecture.md`, `docs/development.md`, `docs/data-and-auth.md`: local ignored overview updates.

## Verification

- `npm test`: 78 passed, 0 failed.
- `node --check` run over tracked JavaScript/MJS files: passed.
- JSON parse check: 3 repository JSON files parsed successfully.
- `git diff --check`: passed.
- Source search confirmed no runtime Table renderer, Table view markup, table-specific view event, or Table navigation control remains.
- Browser visual verification was not performed in this environment.

## Limitations

Existing local data remains compatible; only the removed view and its direct editing surface are gone. The old `table` local view preference is intentionally mapped to Board. Browser width and visual layout still need manual confirmation.
