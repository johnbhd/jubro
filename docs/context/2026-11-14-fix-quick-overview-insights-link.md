# Quick Overview View Insights link hover state

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

The Quick Overview modal's `View Insights` link navigated correctly but used `cursor: not-allowed`, making the available action look disabled on hover.

## Changes and resulting behavior

- Changed the link to a pointer-enabled action with a blue/light hover state in light mode and a readable blue/slate hover state in dark mode.
- Kept the existing route, active Job Search query, label, icon, and Insights page behavior unchanged.
- Added a browser regression assertion that the rendered link has a pointer cursor and is not blocked by `pointer-events: none`.

## Files affected

- `css/global.css`: interactive and theme-aware `View Insights` link styling.
- `test/quickOverview.browser.mjs`: hover-state interaction regression assertion.
- `docs/architecture.md`: local-only architecture note updated.
- This context record.

## Verification

- Before the CSS change, the focused browser test failed because the link remained styled as disabled.
- `JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs`: passed in the focused Quick Overview flow across existing themes and viewport checks.
- `npm test`: 257 passed, 0 failed.
- `node --check test/quickOverview.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

Live Firebase, deployment, and physical-device hover behavior were not tested. Existing unrelated Dashboard-loader browser-run reload instability remains documented separately. Changes remain uncommitted; no push performed.
