# Navigation dropdown chevron size, button hover states, and list panel removal

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

1. The dropdown arrow (`▾`) in the Job Search title selector was styled with `font-size: 11px`, making it overly small and difficult to distinguish.
2. The `Dashboard` and `Custom Fields` buttons in the Board toolbar lacked visible hover feedback in light and dark mode, partly due to `!important` transparent backgrounds in dark theme rules.
3. The List view page contained a redundant header card displaying `Applications \n List view` along with duplicate Sort and Add Application buttons, taking up vertical space when all primary controls are already unified in the main toolbar.

## Changes and resulting behavior

1. **Job Search Selector Chevron Size**:
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), increased `.job-search-selector span:last-child` font-size from `11px` to `15px` with aligned `calc(100% - 22px)` label max-width, providing a prominent and well-proportioned dropdown indicator.
2. **Dashboard & Custom Fields Hover States**:
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), added smooth `transition: background-color 0.15s ease, color 0.15s ease` to `#btnDashboard` and `#btnCustomFields`.
   - In light mode, hovering `#btnDashboard` and `#btnCustomFields` shows `#f3f4f6` background and `#111827` text.
   - In dark mode, hovering `#btnDashboard` and `#btnCustomFields` displays `#374151 !important` background and `#f3f4f6 !important` text, consistent with `#btnOpenSearch` and `#btnMenu`.
3. **List View Card Removal**:
   - In [`board/index.html`](file:///data/data/com.termux/files/home/projects/codev/jubro/board/index.html), marked `.list-panel` as `hidden`.
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), added `.list-panel { display: none !important; }` to permanently erase the redundant header card from the List view UI while preserving `#listSortSelect` and `#btnListAddJob` elements in the DOM for automated tests and script bindings.

## Files affected

- `board/index.html`: Added `hidden` attribute and class to `.list-panel`.
- `css/global.css`: Increased dropdown arrow font size, added hover styles for Dashboard and Custom Fields buttons, and hid `.list-panel`.
- `docs/context/2026-11-09-fix-nav-arrow-size-button-hover-and-list-panel.md`: Context record for this change.

## Verification

1. **Unit Tests**:
   - Ran `npm test`. All 152 unit tests passed with 0 failures.
2. **Browser End-to-End Tests**:
   - Executed `node --experimental-websocket test/statusCustomization.browser.mjs`. Passed across 2 themes (light, dark) and 6 responsive viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) with 0 errors.
3. **Diff & Whitespace Checks**:
   - Ran `git diff --check`. 0 whitespace or formatting errors.

## Limitations

- None identified.
