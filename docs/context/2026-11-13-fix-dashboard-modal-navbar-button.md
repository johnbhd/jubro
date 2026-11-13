# One Dashboard button for the summary modal

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: fix

## Problem or goal

The user requested removal of the separate Quick Overview button. The former first-navbar Insights action should instead be labeled Dashboard, keep its chart icon, and open the existing Quick Overview modal rather than navigate directly.

## Changes and resulting behavior

- The first navbar now has one real Dashboard button with the existing `fa-chart-simple` icon, Dashboard label/title/accessibility name, and dialog expanded/control semantics.
- Removed the separate Quick Overview navbar button and the duplicate Quick Overview action inside the Insights page header. The modal title remains Quick Overview.
- Reused the existing Dashboard click handler, ownership/loading guards, dismissal behavior, and focus restoration. No new modal or event handler was added.
- View Insights inside the modal still opens the dedicated static dashboard page for the active Job Search. Back to Board remains unchanged.
- Removed obsolete direct-navigation link updates and active-page styling from the former Insights navbar control. Data, analytics calculations, ownership, revisions, and sync are unchanged.

## Files affected

- `board/index.html`: consolidate first-navbar actions into one Dashboard modal button.
- `js/main/insights/render.js`: retain only the View Insights destination update and remove the duplicate summary action.
- `css/global.css`: apply responsive and theme styling to Dashboard, retain loading/Retry guards, and remove obsolete page-link styling.
- `test/dashboardEntry.test.mjs`: require one Dashboard modal button, the same chart icon, no Insights control, and no separate Quick Overview label.
- `test/insights.browser.mjs`, `test/quickOverview.browser.mjs`, `test/toolbarWidth.browser.mjs`, `test/statusCustomization.browser.mjs`: verify Dashboard opens the modal without navigation and View Insights retains the actual same-search page flow.
- Ignored local `docs/architecture.md` and `docs/features.md`: updated current navigation documentation. Historical records remain unchanged.

## Verification

- The new navbar assertion failed before the change because the direct Insights anchor and separate Quick Overview button still existed. It passed after consolidation.
- `npm test`: 255 passed, 0 failed.
- Five affected JavaScript/browser modules passed syntax checks. `git diff --check` passed.
- `JUBRO_INSIGHTS_ONLY=1 JUBRO_OVERVIEW_ONLY=1 JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs` passed with zero JavaScript errors. Real clicks confirmed Dashboard opens Quick Overview without navigating, View Insights opens the same active search, and Back to Board preserves it. Both themes passed at 390, 430, 768, 1024, 1440, and 1920px; toolbar checks also covered 1280px. Existing summary/modal and landing regressions passed. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-8DIbZo`.
- Visually checked the light 1440px and dark 390px Insights screenshots: one first-navbar chart action, correct desktop Dashboard label, responsive icon-only mobile treatment, and no duplicate Quick Overview action.

## Limitations

No new dependencies. Existing build-tool availability and live Firebase/deployment limitations are unchanged. Changes remain uncommitted; no push performed.
