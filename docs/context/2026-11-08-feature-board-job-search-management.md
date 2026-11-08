# Cycle B: Manage Job Searches from the Board

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

The Board selector needed complete management without a separate collection page. Inspection found no existing whole-search Duplicate implementation; the user explicitly approved adding it with schema and applications copied.

## Changes and resulting behavior

- New Job Search opens a named creation dialog and creates an empty default schema search with a new ID and active selection.
- Each selector item exposes Rename, Duplicate, and Delete. Names are trimmed, required, and case-insensitively unique. Rename changes title only.
- Duplicate deep-copies schema and applications, uses a new ID, activates the copy, and assigns a unique `(copy)` / `(copy 2)` title without modifying the source.
- Delete requires confirmation. Deleting non-active leaves active unchanged; deleting active selects the first remaining search. Final deletion creates one empty My Job Search in the same save.
- Actions validate captured state identity, revision, target, and current owner. Rejected or thrown saves reload canonical state; successful actions refresh without another save. Menus/dialog cancellation does not save.

## Files affected

- Created `js/main/jobSearchManagement.js` for shared canonical mutations and Board dialogs/actions.
- Modified `js/main/main.js` to compose management methods and `css/global.css` for inline item menus.
- Expanded `test/jobSearch.test.mjs` and `test/statusCustomization.browser.mjs`.
- Local-only `docs/architecture.md` and the execution ledger were updated.

## Verification

- Cycle B full suite: 141 passed, zero failed. Focused Job Search suite: 11 passed.
- New tests cover validation/no-op, create/rename preservation, deep-copy/title uniqueness, all deletion cases, stale context/storage, thrown writes, and real account sync fixtures.
- Each account action incremented local revision once and produced one existing logical cloud transaction (two compatibility document writes).
- Firefox/BiDi management dialogs and cancellation passed. Selector/create-dialog geometry passed in dark/light at 390, 430, 768, 1024, 1440, 1920px with no browser errors.
- JavaScript syntax, JSON parsing, and `git diff --check` passed before commit.

## Limitations

CSS build remains unavailable because the existing local Tailwind executable is missing. Guide/Add flow belongs to Cycle C. No live Firebase, physical hardware, deployment, or push performed. Legacy collection source remains unreachable compatibility code, not a parallel management workflow.
