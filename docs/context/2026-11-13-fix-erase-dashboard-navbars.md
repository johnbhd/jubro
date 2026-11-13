# Erase First and Second Navbars on Dashboard Page

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: fix

## Problem or goal

On the dedicated dashboard page (`/dashboard/`), the first navbar (`#boardTopNavbar`) and second navbar (`#appNavbar`) were previously displayed above the insights report. The user requested erasing the 1st and 2nd navbars only on the dashboard page, while keeping them intact and visible on the board page (`/board/`).

## Changes and resulting behavior

1. **Scoped CSS Rules for Dashboard Navigation (`css/global.css`)**:
   - Added scoped CSS hiding rules targeting `#boardTopNavbar`, `#appNavbar`, and the loading `.skeleton-toolbar` with `display: none !important` whenever `html[data-workspace-page="insights"]`, `html[data-loading-view="insights"]`, or `#appBody[data-workspace-page="insights"]` is active.
   - Added dedicated top padding (`padding-top: 1.5rem;` on mobile, `2rem;` at `min-width: 640px`) to `#appBody[data-workspace-page="insights"] .board-workspace` so the `← Back to Board` navigation link and page header sit comfortably below the viewport top edge.
   - On the Board page (`/board/`), `data-workspace-page` is `'board'` and `data-loading-view` is `'kanban'` or `'list'`, so both `#boardTopNavbar` and `#appNavbar` remain visible and functional.

2. **Entry Marker & DOM Attribute Synchronization (`dashboard/index.html`, `board/index.html`, `js/dashboardEntry.js`, `js/main/main.js`, `js/main/trackerState.js`)**:
   - In `dashboard/index.html`, added an inline head script setting `document.documentElement.dataset.workspacePage = 'insights'` and `document.documentElement.dataset.loadingView = 'insights'`, and added `data-workspace-page="insights"` to `<body>`.
   - In `board/index.html`, updated the head script to set `document.documentElement.dataset.workspacePage = 'insights'` when `/dashboard/` is the pathname.
   - In `js/dashboardEntry.js`, set `dataset.workspacePage = 'insights'` on `document.documentElement` and the imported `shell`, and added the `hidden` attribute to `#boardTopNavbar` and `#appNavbar`.
   - In `js/main/main.js`, updated `TrackerApp` to set `data-workspace-page="insights"` on `document.documentElement` and add `hidden` to `#boardTopNavbar` and `#appNavbar` when `this.isInsightsPage` is true, or remove `hidden` and clear the dataset on Board pages.
   - In `js/main/trackerState.js`, guarded `document.getElementById('appNavbar')?.removeAttribute('hidden')` so it only executes when `!this.isInsightsPage`.

3. **Verification**:
   - Updated `test/dashboardEntry.test.mjs` with assertions confirming CSS hiding rules and dashboard vs board attribute presence.
   - Updated `test/insights.browser.mjs` to verify `#boardTopNavbar` and `#appNavbar` compute to `display: none` on `/dashboard/` across both dark and light themes at all 6 viewports (`390px`, `430px`, `768px`, `1024px`, `1440px`, `1920px`), and verify they compute to `display !== 'none'` when returning to `/board/`.

## Files affected

- `css/global.css`: Scoped `display: none !important` for `#boardTopNavbar`, `#appNavbar`, and `.skeleton-toolbar` on Insights, plus responsive top padding.
- `dashboard/index.html`: Set `data-workspace-page="insights"` in inline script and `<body>`.
- `board/index.html`: Added `data-workspace-page="insights"` to head script when path is `/dashboard/`.
- `js/dashboardEntry.js`: Propagated `workspacePage` dataset and `hidden` attribute on imported shell.
- `js/main/main.js`: Added document-level `workspacePage` synchronization and navbar attribute management.
- `js/main/trackerState.js`: Guarded navbar unhiding to Board pages only.
- `test/dashboardEntry.test.mjs`: Added unit tests for navbar hiding CSS and markup attributes.
- `test/insights.browser.mjs`: Added browser assertions for erased navbars on Dashboard and preserved navbars on Board.
- `docs/context/2026-11-13-fix-erase-dashboard-navbars.md`: This context record.

## Verification

- `node --import ./test/register-loader.mjs --test test/dashboardEntry.test.mjs test/insightsNavigation.test.mjs test/insightsSchema.test.mjs test/insights.test.mjs`: 13/13 passed.
- `npm test`: Full unit test suite passed.
- `verifyInsights` browser suite: Verified first and second navbars are erased on `/dashboard/` in dark/light modes at 390, 430, 768, 1024, 1440, and 1920px, and preserved when returning to `/board/`.

## Limitations

No live Firebase deployment or physical device interaction tested. Tailwind CLI remains absent locally; all styling is authored directly in `css/global.css`.
