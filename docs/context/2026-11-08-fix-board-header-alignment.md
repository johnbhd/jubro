# Board header visual alignment and control polish

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: fix

## Problem or goal

The Board header suffered from visual balance issues:
1. The Job Search dropdown selector button stretched across available space with `justify-between` and `width: 100%`, separating the dropdown arrow far from the title text.
2. The Search + Sort control was not visually centered or unified, with mismatched baselines, an oversized search width, and a distant sort dropdown chevron.
3. The Board / List view segmented toggle lost its visible outer container border, displaying the view buttons as detached elements.
4. Top-level toolbar controls had uneven spacing and visual center alignment.

## Changes and resulting behavior

- Compacted the Job Search selector to size to its content with `inline-flex` and a tight `gap: 6px`. Truncation now sets `max-width: calc(100% - 18px)` on the label `<span>` so the chevron arrow `span:last-child` is always visible immediately adjacent to the title. On mobile (< 768px), `#appNavbar .job-search-selector` is constrained to prevent overlapping the search trigger.
- Unified the Search + Sort control into a single container with matching 40px height, 38px line-height, seamless border-box sizing, and a centered vertical divider (`#d1d5db` in light mode, `#374151` in dark mode). Added dynamic width synchronization via `syncSortSelectWidth` in `trackerEvents.js`, `trackerSorting.js`, and `trackerActions.js` so `#sortSelect`'s chevron remains snug to the active label ("Newest", "Oldest", "Manual", "Select field") while guaranteeing `sort.width >= 80px`.
- Reduced desktop/tablet Search width (`flex: 1 1 360px; max-width: 440px; min-width: 212px`) and anchored `.board-toolbar-actions` to the right with `margin-left: auto`, creating balanced breathing room across the toolbar.
- Restored the outer grouped container border on `#boardViewToggle` (`border: 1px solid #d1d5db` in light mode, `#374151` in dark mode) around high-contrast active buttons and subtle transparent inactive buttons, with no dimension shifting when switching between Board and List.
- Aligned all top-level header controls along the same visual center line with matching interactive heights (~40px).

## Files affected

- Modified [board/index.html](../../board/index.html): Wrapped `#sortSelect` in `.sort-control-wrapper` with standardized height and chevron classes.
- Modified [css/global.css](../../css/global.css): Updated styles for `#appNavbar`, `.job-search-navigation`, `.job-search-selector`, `.search-discovery-group`, `.sort-control-wrapper`, `#sortSelect`, `#boardViewToggle`, `.board-view-button`, and responsive breakpoints.
- Modified [js/main/trackerEvents.js](../../js/main/trackerEvents.js): Added `syncSortSelectWidth()` and hooked it into initialization and sort changes.
- Modified [js/main/trackerSorting.js](../../js/main/trackerSorting.js): Hooked `this.syncSortSelectWidth()` into `clearSelectFilter()`.
- Modified [js/main/trackerActions.js](../../js/main/trackerActions.js): Hooked `this.syncSortSelectWidth()` into `clearSortControls()`.
- Modified [docs/features.md](../features.md): Updated Board toolbar description (local-only document).
- Created [docs/context/2026-11-08-fix-board-header-alignment.md](2026-11-08-fix-board-header-alignment.md): This change record.

## Verification

- Ran `npm test`: all 149 Node unit/integration tests passed.
- Ran `node --experimental-websocket test/statusCustomization.browser.mjs`: passed across both themes (dark and light) and all six viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) with 0 errors. Verified toolbar control bounding box constraints (`width >= 40 && height >= 40`), top-alignment tolerance (`<= 4px`), search/sort geometry, and zero horizontal page overflow.
- Inspected headless browser screenshots (`light-1024-toolbar.png`, `dark-1024-toolbar.png`, `light-1440-toolbar.png`, `dark-1440-toolbar.png`, `light-390-toolbar.png`) confirming chevron proximity, clean container borders, centered dividers, and unified visual balance.
- Ran `git diff --check`: passed with zero whitespace or line-ending errors.

## Limitations

None identified. No application data models, schemas, Firebase sync, or Kanban drag/card behaviors were modified.
