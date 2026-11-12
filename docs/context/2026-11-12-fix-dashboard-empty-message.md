# Explain empty application data in Dashboard

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

Dashboard rendered zeroed summary cards and blank charts when the current Job Search had no applications. Users needed an explicit explanation that they currently have no data.

## Changes and resulting behavior

- Empty Job Searches now show: "You don't have any application data yet. Add your first application to see your dashboard."
- A populated Job Search with no applications in the selected date range instead shows: "No applications in this date range. Try another range."
- The message uses the existing dashed empty-state styling and an accessible status role. Empty states replace summaries and clear stale charts.
- Changing to a range containing applications restores existing summaries and charts. The existing missing-select-options message remains available for populated ranges.
- No application data, schema, storage, revision, sync, navigation, or theme behavior changes.

## Files affected

- `js/main/trackerDashboard.js`: use actual and date-filtered row counts to select the appropriate read-only Dashboard empty state.
- `test/dashboardEmpty.test.mjs`: regression coverage for empty workspaces, excluded date ranges, restoration of populated summaries/charts, stale chart cleanup, and unchanged tracker data.
- `test/workspaceSurfaces.browser.mjs`: extend existing theme/responsive modal checks to verify the empty Dashboard message and absence of blank charts.
- `docs/features.md`: update local analytics behavior documentation; local-only and Git-ignored.

## Verification

- Added the focused tests first; both failed because the existing Dashboard rendered three zeroed cards instead of a message.
- `node --test test/dashboardEmpty.test.mjs`: 2 passed after implementation.
- `npm test`: 209 passed, 0 failed.
- `JUBRO_SURFACES_ONLY=1 node test/statusCustomization.browser.mjs`: passed with zero JavaScript errors. Empty Dashboard message fits at 390, 430, 768, 1024, 1440, and 1920px in dark and light themes. Existing Board/List, modal surface checks, canonical-storage read-only checks, and shared landing checks also passed.
- `node --check` passed for `js/main/trackerDashboard.js`, `test/dashboardEmpty.test.mjs`, and `test/workspaceSurfaces.browser.mjs`.
- `package.json` and `package-lock.json` parsed successfully; neither changed.
- `git diff --check`: passed.
- No dependencies added. No push performed.

## Limitations

Browser checks used local headless Firefox with Firebase fixtures, not live accounts or physical devices. No build was run; this change uses existing styles without CSS or dependency changes.
