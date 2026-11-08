# Cycle A: Board-first entry and Job Search selection

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

Board entry previously sent empty or unavailable tracker routes to a separate collection page. New tracker creation inserted three example applications. The approved product architecture makes Board the entry and manages Job Searches there.

## Changes and resulting behavior

- Confirmed-empty workspaces receive one My Job Search with the unchanged schema and zero rows. Existing rows are never removed.
- Valid explicit links win; unavailable links recover to saved active or another existing search with a notice and canonical URL.
- A native popover selector shows active checkmark and real application counts. Switching saves active once and clears tracker-specific UI/search/page state. There is no Manage destination.
- Failed empty account loading shows Retry, without default creation. Matching cached account searches remain usable.
- Existing sort/filter controls move into More. Legacy tracker collection routes redirect to Board in Vercel and static serving. Public destination links now point to Board; wording follows in Cycle D.

## Files affected

- Created `js/main/jobSearch.js` and `test/jobSearch.test.mjs`.
- Modified `js/tracker/defaultTracker.js`, `js/main/main.js`, `js/main/trackerState.js`, `js/main/trackerActions.js`, and `js/main/trackerEvents.js` for startup, selection, and redraw.
- Modified `board/index.html`, `css/global.css`, `trackers/index.html`, and `vercel.json` for selector and compatibility entry.
- Modified `index.html`, `components/navbar.html`, `components/footer.html`, and `js/main.js` for Board destinations; `js/app.js` reloads the selector after import/sync notifications.
- Updated `test/trackerRouting.test.mjs` for the explicitly approved recovery behavior and `test/statusCustomization.browser.mjs` for dialog cancellation and selector coverage.
- Local-only overview `docs/architecture.md` and execution ledger under `docs/superpowers/plans/` are ignored by Git.

## Verification

- Baseline: 130 tests passed. Cycle A: 135 passed, zero failed.
- Added five tests for empty/idempotent startup, default schema, active selection, explicit/stale links, failed account readiness, cache ownership, and stale local revision rejection.
- Firefox/BiDi status/drag regression passed with no browser errors in both themes and six widths (390, 430, 768, 1024, 1440, 1920). Targeted selector and redirect checks are included in the browser runner.
- JavaScript syntax, package/deployment JSON parsing, and diff whitespace checks passed before commit.
- `npm run build` could not run because this checkout lacks the `tailwindcss` executable. Generated CSS was not manually edited.

## Limitations

Create/Rename/Duplicate/Delete are Cycle B; the instructional guide and proper Add form are Cycle C. No live Firebase, physical-device, or deployed redirect verification. No push performed. Existing Add still uses placeholders until Cycle C replaces it.
