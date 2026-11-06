# Make Kanban the only tracker workspace

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: refactor

## Problem or goal

The Board still loaded separate Table and List renderers, their view controls, and their supporting context-menu, pagination, and clipboard code. The workspace also needed the Dashboard menu action to remain a normal theme-aware control instead of receiving a forced white dark-mode background.

The requested result was a Kanban-only workspace using the existing canonical tracker state, storage/revision pipeline, safe rendering, typed values, and sync behavior.

## Changes and resulting behavior

- Removed Table and List markup, navigation, pagination, context-menu wiring, and renderer modules from the Board.
- Added focused neutral modules for tracker actions, application editing, and field settings.
- Kept Kanban status columns driven by the current Status select options, including custom and fallback statuses.
- Kept card edit, move, delete, drag/drop, native status selection, search, sorting, import/export, Dashboard, and field settings on the shared persistence path.
- Kept the existing Add Application behavior unchanged; its placeholder creation remains a JUBRO-203 concern.
- Changed the Dashboard menu item to transparent in dark mode with a normal hover surface.
- Updated local ignored overview documents to describe the Kanban-only workspace and retired Table/List modules.

## Files affected

Modified:

- `board/index.html`
- `css/global.css`
- `js/main/kanban.js`
- `js/main/main.js`
- `js/main/trackerEvents.js`
- `js/main/trackerKeyboard.js`
- `js/main/trackerSearch.js`
- `js/main/trackerSorting.js`
- `js/main/trackerUtils.js`
- `test/kanban.test.mjs`
- `test/viewConsistency.test.mjs`

Created:

- `js/main/applicationEditor.js`
- `js/main/trackerActions.js`
- `js/main/trackerSettings.js`
- `test/applicationEdit.test.mjs`
- `docs/context/2026-11-06-refactor-kanban-only-workspace.md`

Removed:

- `js/main/table.js`
- `js/main/trackerListView.js`
- `js/main/trackerTableActions.js`
- `js/main/ui.js`
- `js/main/listView/`
- `test/listEditStale.test.mjs`

Local-only ignored overview files updated:

- `docs/features.md`
- `docs/architecture.md`
- `docs/data-and-auth.md`
- `docs/development.md`

## Verification

- `npm test`: 76 passed, 0 failed.
- `node --check` over all tracked JavaScript/MJS files found by `rg --files`: passed.
- JSON parse check over repository JSON files: 3 parsed successfully.
- `git diff --check`: passed.
- `npm run build:css`: not available; the local checkout has no `tailwindcss` executable.
- Firefox headless reached the Board route through a disposable seeded guest fixture, but produced a blank capture while the runtime Firebase modules were unavailable. No browser visual pass is claimed.
- No Firebase migration or push was performed.

## Limitations

- JUBRO-203 was not implemented; Add Application still creates the existing placeholder row.
- Custom select option add/delete/color editing from the deleted List settings UI was not rebuilt in this cycle; existing options remain preserved and field schema editing remains available.
- Live Firebase behavior, deployed rules, and reliable visual browser captures remain unverified in this environment.
