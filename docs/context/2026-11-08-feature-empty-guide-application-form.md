# Cycle C: Instructional empty Board and proper Add Application

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

Add Application previously inserted placeholder Company Name / Position Role rows immediately. Empty trackers showed only a generic CTA. The updated approved architecture explicitly includes the proper Add flow in this cycle.

## Changes and resulting behavior

- An empty Board retains configured status columns. A dashed EXAMPLE guide appears in the first real configured status, using its current name/accent. Without configured status options, the general empty CTA remains.
- The guide has no canonical row, row index, editable controls, drag controller, export content, or application count. It does not appear in List, search results, or filters. It disappears when rows exist and returns when the last real row is deleted.
- All user-facing Add entry points open a native modal using existing editor field generation and styles. Text/select values start blank; dates use the current local date. Company and Position examples are placeholders, not values.
- Add mode uses selection-only native selects reading current schema, avoiding the existing Edit option editor's immediate schema saves. Supported custom fields remain generated.
- Require meaningful Company or Position; schemas without those fields require nonblank text or a selected option. Strict typed normalization rejects invalid dates/options before mutation.
- Save prepends exactly one row, saves once, and refreshes without a second save. Cancel/open are read-only. Rejected or thrown saves reload canonical state; the user receives the existing notice or toast rather than an unsaved card.
- Add captures owner/state/revision/schema identity. Edit retains saved prefill and now rejects replaced tracker/row/owner targets. Workspace shortcuts do not act behind native dialogs.
- Removed placeholder-writing behavior from the legacy low-level row helper. Its old toast test now checks that legacy creation does not generate fake identity; actual Add save behavior has focused replacement coverage.

## Files affected

- Created `js/main/applicationForm.js` and `test/applicationForm.test.mjs`.
- Modified `js/main/main.js`, `js/main/listView/editModal.js`, `js/main/trackerEvents.js`, and `js/main/trackerActions.js` for Add mode, mutation, and stale Edit protection.
- Modified `js/main/kanban.js`, `css/global.css`, and `board/index.html` for guide/form presentation and Add entry points.
- Updated `test/kanban.test.mjs`, `test/viewConsistency.test.mjs`, `test/listEditStale.test.mjs`, and `test/statusCustomization.browser.mjs`. The stale Edit fixture now checks real Storage rejection and canonical recovery rather than a save stub without reload support.
- Updated local-only architecture/features/development overviews and execution ledger.

## Verification

- Full suite: 149 passed, zero failed. Eight focused application-form tests cover defaults, identity validation, dates/options, typed custom values, stale schema/revision, thrown writes, and account persistence.
- Account Add produced one local revision and one logical cloud transaction (two existing compatibility document writes), with exactly one real row and no EXAMPLE data.
- Firefox/BiDi full status-customization and mouse/touch Board/List drag suite passed with no browser errors. Extended browser checks verified guide isolation, Add placeholders, cancellation, one-save creation, Edit prefill, guide return, and Job Search management.
- Both themes and 390, 430, 768, 1024, 1440, 1920px passed dialog/selector geometry checks. Captured and reviewed mobile guide and desktop Add screenshots; all six widths have Add/guide screenshots.
- JavaScript syntax, JSON parsing, and diff whitespace checks passed before commit.

## Limitations

Local Tailwind executable remains unavailable; generated CSS was not manually modified. Schemas containing only date/checkbox fields need a meaningful text/select identity field for Add validation. No physical-device, live Firebase, deployment, or push verification. Landing and remaining product terminology follow in Cycle D.
