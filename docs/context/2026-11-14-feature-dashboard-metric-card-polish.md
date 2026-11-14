# Modern Dashboard metric cards

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: feature

## Problem or goal

Refresh the four summary cards on the dedicated Dashboard page with the approved neutral-card and tinted-icon-tile design. The user selected Dashboard only, leaving Quick Overview's existing cards intact.

## Changes and resulting behavior

- Dashboard cards now use neutral white/navy surfaces, subtle borders, 16px corners, and consistent padding.
- Each metric has a 40px rounded icon tile with a restrained semantic tint. Document, conversation, trophy, and bell icons represent Total Applications, Interviews, Offers, and Need Attention.
- Values use 36px desktop and 32px mobile text with tabular numerals. Labels remain secondary and wrap naturally; large values can wrap without overflowing.
- Existing four-column desktop/tablet and two-column mobile layout remains. Cards are informational with no button-like hover or pointer behavior.
- Styles are scoped to `.insights-metrics`; Dashboard icon overrides are local to its renderer. Quick Overview, analytics calculations, periods, ownership, and persistence remain unchanged. No dependencies or public interfaces were added.

## Files affected

- `js/main/insights/render.js`: Dashboard-only metric icon choices.
- `css/global.css`: scoped Dashboard card, icon tile, and typography styling.
- `test/insights.browser.mjs`: extend the existing responsive check to verify zero and twelve-digit presentation values fit without changing canonical data.
- `docs/architecture.md`: updated local-only, Git-ignored overview.
- This context record.

## Verification

- `npm test`: 257 passed, 0 failed.
- `node --check js/main/insights/render.js` and `node --check test/insights.browser.mjs`: passed.
- `git diff --check`: passed.
- Dashboard browser checks passed at 390, 430, 768, 1024, 1440, and 1920px in dark and light modes, including large/zero value fit, existing metric calculations, period changes, same-search navigation, and read-only rendering.
- Visually inspected the dark 1440px and light 390px Dashboard screenshots from `/data/data/com.termux/files/usr/tmp/jubro-status-browser-GjlDqs`. Icons rendered correctly; desktop cards aligned and mobile cards used a 2-by-2 grid.
- Visually inspected the dark 1440px Quick Overview screenshot from `/data/data/com.termux/files/usr/tmp/jubro-status-browser-9ViEQd`; its existing tinted cards and original icons remain unchanged.
- The first combined `JUBRO_INSIGHTS_ONLY=1 JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs` run completed the target flows but later failed in an unrelated reload check with Firefox `NS_BINDING_ABORTED`. Its log is `/data/data/com.termux/files/usr/tmp/jubro-metric-cards-browser.log`. This is not a passing full browser-runner result.
- The final combined run completed successfully with `passed: true` and zero JavaScript errors. It verified both themes at six widths, zero and twelve-digit metric value fit, unchanged Quick Overview populated/empty states, actual navigation, and shared landing regressions. Final log: `/data/data/com.termux/files/usr/tmp/jubro-metric-cards-final.log`; artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-9ViEQd`.

## Limitations

Live Firebase, production deployment, and physical devices were not checked. Native keyboard delivery could not be verified in the inactive headless window; the runner used its existing synthetic focus fallback. An initial unrelated Firefox reload error did not recur in the final passing run. Changes remain uncommitted; no push performed.
