# Fix List View application identity and canonical row mapping

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

In Jubro's tracker workspace, Kanban Board correctly displayed canonical application identity (`Google` / `Web dev`, `Microsoft` / `Option 1`, `Apple` / `Tech`), while List View rendered generic `Job Application` for items whenever `jubro_list_view_settings` in `localStorage` marked `company`/`position` or column indexes `0`/`1` as hidden, and duplicated `Position` as a pill badge when the `Position` column was configured with `type: 'select'` (such as `Option 1`).

The goal was to ensure List View and Kanban Board resolve canonical application data from the same row/schema helpers, display `Position` as the primary `.list-card-title` with `Company` directly below in `.list-card-company`, apply clean non-persistent fallbacks when `Position` or `Company` is missing, and preserve all existing metadata, pills, links, and row actions without mutating stored data or triggering writes on render.

## Changes and resulting behavior

- Added `resolveApplicationRow` and `resolveListCardIdentity` in `js/main/listView/indexes.js` and updated `js/main/kanban.js` and `js/main/listView/render.js` so both Board and List resolve `Company`, `Position`, `Platform`, `Status`, `Application Date`, `Job Link`, `Work Setup`, `Employment Type`, `Next Action`, and `Next Action Date` from the same canonical row/column helpers.
- Removed the `isListColumnVisible` gate from List View's primary card identity (`Position` and `Company`) so stale or custom `jubro_list_view_settings` entries can never collapse populated applications into generic `Job Application` titles.
- Implemented the required List View identity hierarchy and fallbacks:
  - Both `Position` and `Company` present: `.list-card-title` displays `Position`, `.list-card-company` displays `Company`.
  - `Position` blank and `Company` present: `.list-card-title` displays `Company`, `.list-card-company` is hidden (never repeats `Company` twice or displays `Job Application`).
  - `Position` present and `Company` blank: `.list-card-title` displays `Position`, `.list-card-company` is hidden.
  - Both `Position` and `Company` blank: `.list-card-title` displays `Untitled Application` (display-only, never persisted to storage).
- Excluded `indexes.company` and `indexes.position` from `otherBadges` in `renderListBadgesForCard` (`js/main/listView/badges.js`) so `Position` or `Company` columns configured as `select` (e.g., `Option 1`) are rendered once in the card identity header and not duplicated as badge pills.
- Hardened `getColumnIndexByNames` and `getCellValue` in `js/main/trackerUtils.js` and `getDateColumnIndex` in `js/main/trackerSorting.js` to handle null/object cells safely, prevent fallback index collisions against known canonical column names, and prefer the application date column over `Next Action Date`.

## Files affected

- [`js/main/listView/indexes.js`](../../js/main/listView/indexes.js): Added `resolveApplicationRow` and `resolveListCardIdentity` and expanded canonical column name aliases.
- [`js/main/listView/render.js`](../../js/main/listView/render.js): Updated `renderListView` to use `resolveApplicationRow` and `resolveListCardIdentity` and hide empty subtitle wrappers.
- [`js/main/listView/badges.js`](../../js/main/listView/badges.js): Excluded `company` and `position` column indexes from select badge pills on List cards.
- [`js/main/kanban.js`](../../js/main/kanban.js): Connected Kanban card rendering to the shared `resolveApplicationRow` helper while preserving Kanban's `Company` above `Position` hierarchy.
- [`js/main/trackerUtils.js`](../../js/main/trackerUtils.js): Made `getCellValue` null-safe and prevented `getColumnIndexByNames` from falling back onto a different known canonical column.
- [`js/main/trackerSorting.js`](../../js/main/trackerSorting.js): Updated `getDateColumnIndex` to skip `Next Action Date` when locating the primary application date column.
- [`test/listViewIdentity.test.mjs`](../../test/listViewIdentity.test.mjs): Added unit and DOM rendering tests covering the `Google` / `Web dev`, `Microsoft` / `Option 1`, and `Apple` / `Tech` examples, missing-field fallbacks, cross-view edits, Job Search switching, and zero storage writes on render.
- `docs/features.md` (local-only, git-ignored): Updated the List view section to document the shared canonical identity resolution and fallback rules.

## Verification

- `node --test test/listViewIdentity.test.mjs` — passed (5/5 tests).
- `npm test` — passed (196/196 tests across all test suites).
- `git diff --check` — passed with no whitespace or formatting issues.

## Limitations

None identified.
