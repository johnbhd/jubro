# Dashboard loading skeleton surfaces and entry continuity

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

The dedicated Dashboard/Insights route initially displayed plain loading text while fetching its shared shell. Its later Insights skeleton used `.skeleton-card` containers without card styles, showing loose bars without surfaces, borders, or adequate height. Removing the Dashboard navbars also left the placeholder heading too close to the viewport top.

## Changes and resulting behavior

- Render an accessible, UI-only Insights skeleton in the static Dashboard entry before the shared shell arrives. Apply the saved theme before styles paint, with a safe dark fallback when preferences are unavailable.
- Use the same skeleton classes for static entry and shared workspace startup. Add centered 1200px maximum content width, top spacing, bordered theme-aware card surfaces, padding, and metric value placeholders. Retain the existing four-column desktop and two-column mobile grid and reduced-motion-safe shimmer.
- Hide the entry skeleton and reveal an alert with Retry on shell/network/markup failure. Successful startup still replaces the initial body and uses the existing workspace resolver.
- Preserve hidden Dashboard navbars, existing analytics, ownership, revisions, sync, and Board/List loading. No dependencies or data mutations were added.

## Files affected

- `dashboard/index.html`: early theme selection, static loading skeleton, initially hidden failure panel.
- `js/dashboardEntry.js`: switch skeleton to Retry on entry failure.
- `css/global.css`: scoped Insights loading layout and card surfaces.
- `test/dashboardEntry.test.mjs`: execute early theme initialization for light/dark/default/unavailable storage without writes.
- `test/dashboardEntryLoader.test.mjs`: verify failures stop loading and reveal Retry.
- `test/workspaceLoading.browser.mjs`: delay shared-shell fetching to verify initial loading; check Insights skeleton geometry, surfaces, grid, and overflow in both themes at six widths.
- `docs/architecture.md`: updated local-only, Git-ignored loading overview.
- This context record.

## Verification

- Added browser regression first; it failed because Insights loading metrics had no card-sized surfaces. After the fix, the targeted Insights checks passed at 390, 430, 768, 1024, 1440, and 1920px in dark and light themes.
- Browser checks verified the static skeleton before shell arrival and the shared skeleton while auth is pending. Existing Board/List loading, resolution, Retry, stale-account, read-only loading, and empty-workspace checks also completed.
- `npm test`: 257 passed, 0 failed.
- `node --check` passed for `js/dashboardEntry.js`, `test/workspaceLoading.browser.mjs`, `test/dashboardEntry.test.mjs`, and `test/dashboardEntryLoader.test.mjs`.
- `package.json` and `vercel.json` parsed successfully. `git diff --check` passed.
- Visually inspected the dark 390px and light 1440px Insights loading screenshots.
- Two post-fix runs of `JUBRO_LOADING_ONLY=1 node test/statusCustomization.browser.mjs` passed the loading checks but later aborted in the runner's separate drag/reload regression with Firefox `NS_BINDING_ABORTED` at `browsingContext.reload`. The entire browser runner is therefore not reported as passing. Logs are `/data/data/com.termux/files/usr/tmp/jubro-dashboard-loader-green.log` and `/data/data/com.termux/files/usr/tmp/jubro-dashboard-loader-final.log`.

## Limitations

Live Firebase, deployment, and physical devices were not tested. The broader Firefox runner reload error remains outside this loader fix. Initial static placeholders intentionally repeat the small shared Insights skeleton shape so loading is visible before fetching the shared shell. Changes and this record remain uncommitted; no push performed.
