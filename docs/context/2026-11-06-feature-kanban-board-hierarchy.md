# Add status-driven Kanban Board and workspace hierarchy

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: feature

## Problem or goal

Jubro's Board opened as a Table-first workspace, so the product presented as a
custom spreadsheet instead of a job application pipeline. Phase 2 JUBRO-201 and
JUBRO-202 require a status-driven Kanban Board, clearer Board/List hierarchy,
and a stronger Add Application entry point without changing the data model or
rebuilding the Add Job flow.

## Changes and resulting behavior

- Added a focused Kanban renderer that derives columns from the current Status
  select options in configured order.
- Preserved rows with removed or blank statuses through safe fallback columns.
- Kept trackers without a Status select usable in an Applications fallback
  column.
- Added compact cards using safe DOM text rendering for company, position, and
  date/source metadata.
- Added native desktop drag/drop and a real status select for keyboard/mobile
  status changes.
- Status movement uses the existing canonical state, local ownership/revision
  save, cloud sync, and refresh path. Rejected local saves reload canonical
  state instead of leaving a moved card visible.
- Made `kanban` the default Board view. Saved List remains honored; legacy
  saved Table preference maps to Board.
- Made Board/List the visible primary controls. Table and Dashboard remain in
  the quieter More menu; Table code and behavior were not removed.
- Added header and empty-state Add Application controls that call the existing
  Add Job behavior. The placeholder-based flow remains intentionally unchanged
  for JUBRO-203.
- Extended search to hide Kanban cards locally without persistence or sync.
- Added dark-mode Kanban styling and horizontal scrolling for narrow screens.

## Files affected

- `js/main/kanban.js` — new status derivation, grouping, safe rendering, and
  status movement methods.
- `js/main/main.js` — compose Kanban methods and references into `TrackerApp`.
- `js/main/trackerTableActions.js` — render Kanban during shared refresh.
- `js/main/listView/boardView.js` — support Board/List/Table visibility and
  preference migration.
- `js/main/trackerEvents.js` — wire primary view controls, advanced Table access,
  and existing Add Job behavior.
- `js/main/trackerSearch.js` — target Kanban cards and avoid pagination there.
- `board/index.html` — add Kanban markup, Board/List controls, header CTA, and
  quieter advanced actions.
- `css/global.css` — dark-mode Kanban colors.
- `test/kanban.test.mjs` — new derivation, rendering, movement, search,
  preference, empty-state, hierarchy, and Table-access coverage.
- `test/viewConsistency.test.mjs` — refresh test stubs for the new renderer.
- `docs/superpowers/specs/2026-11-06-kanban-board-hierarchy-design.md` —
  implementation design.
- `docs/superpowers/plans/2026-11-06-kanban-board-hierarchy.md` — execution
  plan.
- Local-only ignored overviews `docs/architecture.md`, `docs/features.md`,
  `docs/data-and-auth.md`, and `docs/development.md` — updated to describe
  Kanban and verification scope.

## Verification

- `node --import ./test/register-loader.mjs --test test/kanban.test.mjs` — 13
  passed, 0 failed.
- `npm test` — 75 passed, 0 failed.
- `node --check` over all tracked JavaScript/MJS files — passed.
- JSON parsing over all tracked JSON files — passed.
- `git diff --check` — passed.
- Source review confirmed Kanban has no direct Firebase calls and status
  movement uses the existing `save()`/`refresh()` path.
- Browser, live Firebase, and responsive-width checks were not available in
  this environment.
- `npm run build:css` was attempted but could not run because the local
  `tailwindcss` executable is unavailable; no generated CSS output was changed.

## Limitations

JUBRO-203 still owns the Add Application form and placeholder removal. Next
Action, Dashboard redesign, Table retirement, and later Phase 2 tasks were not
implemented. Native drag/drop is an enhancement; keyboard/mobile users use the
card status select. Browser and deployed hosting behavior remain unverified.
