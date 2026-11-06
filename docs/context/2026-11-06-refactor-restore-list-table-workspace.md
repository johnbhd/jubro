# Restore original List and Table workspace

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: refactor

## Problem or goal

Recent local Kanban refactors replaced the original List implementation and removed the Table renderer. The requested result was the earlier workspace behavior from commit `1835f36`, where the original List and Table views still existed alongside Kanban.

## Changes and resulting behavior

The local tree was restored to the source state represented by `1835f36` by reversing the two later local Kanban-only/navigation commits. Board, List, and Table are available again. The original List modules, Table renderer, Table actions, view switching, pagination, and related workspace markup/events are restored. No Firebase, storage, ownership, revision, or authentication redesign was made.

No changes were pushed. Local `main` and `development` are intended to remain aligned after this restoration.

## Files affected

- `board/index.html` and `css/global.css`: restored original Board/List/Table workspace markup and styling.
- `js/main/listView/`: restored original List renderer, controls, settings, filters, sorting, indexes, badges, edit modal, and view switching.
- `js/main/table.js`, `js/main/trackerTableActions.js`, and `js/main/ui.js`: restored Table and shared workspace actions.
- `js/main/main.js`, `js/main/kanban.js`, `js/main/trackerEvents.js`, `js/main/trackerKeyboard.js`, `js/main/trackerListView.js`, `js/main/trackerSearch.js`, `js/main/trackerSorting.js`, and `js/main/trackerUtils.js`: restored pre-refactor coordination paths.
- `test/kanban.test.mjs`, `test/listEditStale.test.mjs`, and `test/viewConsistency.test.mjs`: restored tests from the earlier workspace state.
- Local-only ignored overviews `docs/features.md`, `docs/architecture.md`, `docs/data-and-auth.md`, and `docs/development.md` were updated to describe Board, List, and Table.

## Verification

- `npm test`: 78 passed, 0 failed.
- `rg --files -g '*.js' -g '*.mjs' | xargs -r -n1 node --check`: passed.
- Repository JSON parse check: 3 files parsed successfully.
- The staged source tree matched `1835f36` before this record was added.
- `git diff --cached --check` reported historical trailing whitespace in restored files. The whitespace was retained to preserve the old commit's source state.
- No live browser, production Firebase, or real-device verification was performed.

## Limitations

The restored code intentionally returns to the older List/Table implementation and its known behavior. Later Kanban-only cleanup and focused List changes are not present. No push occurred.
