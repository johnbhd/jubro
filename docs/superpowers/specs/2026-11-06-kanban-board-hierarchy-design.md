# JUBRO-201 + JUBRO-202 Kanban Board Hierarchy

## Intent

Make the Board the primary job-search workspace without changing Jubro's
data model or reliability boundaries. Kanban will derive status columns and
cards from the existing canonical tracker state, while List and Table remain
available views.

## Goals

- Render a focused Kanban view from the current Status select column.
- Preserve custom status options and historical tracker schemas.
- Support desktop drag/drop and an accessible status-change control.
- Persist status movement through the existing save, ownership, revision, and
  sync pipeline.
- Make Board the default view and Board/List the primary view controls.
- Keep Table, import, export, and Dashboard available through quieter controls.
- Keep search and applicable select filters read-only and data-safe.

## Non-goals

- No Add Application form redesign; the current Add Job behavior remains.
- No Next Action, Dashboard redesign, Table removal, Firebase migration, or
  framework migration.
- No separate Kanban data store or Firebase calls from the view.

## Current seams

`TrackerApp.state` remains authoritative. `refresh()` already saves mutations,
renders Table and List, updates view state, and restores canonical data when a
local save is rejected. A new `js/main/kanban.js` method group will join the
existing `TrackerApp` composition and render from the same tracker rows.

## Selected approach

Use a status-driven renderer. A Status column is found by name and select type;
its options define columns in their configured order. Values present in rows but
missing from options remain visible in additional safe columns, and blank values
use a `No status` column. A tracker without a Status select remains usable: its
rows render in one `Applications` column without a status control.

Each card keeps its source row index. Native drag/drop supplies a target status,
while a real `<select>` supplies the keyboard/mobile path. Both call one
`moveKanbanRow()` mutation method, which updates the canonical select cell,
calls the existing `save()` path, reloads after a rejected local save, and
refreshes all views after success.

## View and header behavior

View values become `kanban`, `list`, and `table`. Missing preference defaults to
`kanban`; legacy `table` preference maps to `kanban`, while a saved `list`
preference remains honored. Board/List are visible primary controls. Table and
other advanced actions remain under More. The header gains a strong Add
Application entry point that calls the existing Add Job handler; it does not
change placeholder creation behavior.

Kanban columns scroll horizontally on narrow screens. Search and the existing
select filter hide matching cards without saving. Kanban does not use the
existing table/list pagination UI.

## Verification

Add focused tests for status-option columns, grouping, custom and empty states,
safe text rendering, status movement, failed-save recovery, search selectors,
view defaults, and Table reachability. Run the full existing suite, syntax and
JSON checks, CSS build, and `git diff --check`. Browser and responsive checks
remain explicitly reported as environment-dependent.

## Approaches considered

1. **Status-driven renderer (selected):** smallest focused addition that uses
   current schemas and shared persistence.
2. **Restyle List into Kanban:** fewer files initially, but couples Board to
   List-specific filtering and editing assumptions.
3. **Hard-coded five statuses:** smallest visual patch, but breaks custom status
   options and existing trackers; rejected.
