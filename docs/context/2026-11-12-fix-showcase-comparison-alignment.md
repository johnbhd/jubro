# Align showcase rows with comparison cards

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The preceding full-width showcase change placed both alternating rows outside the narrower comparison-card boundaries on large screens. The user requested a slight compression so the showcase content aligns vertically with the Spreadsheets & Notes and Jubro comparison cards.

## Changes and resulting behavior

- Both showcase rows and the comparison section now share the existing 1056px maximum-width rule.
- Centered automatic inline margins preserve equal outer spacing. Narrow screens still use the available content width.
- Equal desktop grid columns, alternating outer-edge positioning, phone sizes, benefit checks, vertical spacing, copy, and themes remain unchanged.
- No product logic, stored data, dependencies, or other sections changed.

## Files affected

- `css/global.css`: share the comparison width cap and center both showcase rows.
- `test/statusCustomization.browser.mjs`: measure showcase edges against the comparison cards rather than the wider landing parent.
- `docs/features.md`: update current width documentation; local-only and Git-ignored.

## Verification

- Updated geometry assertions failed before the CSS fix at dark 1440px for both showcase widths and alternating edge positions.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. Checks include matching comparison boundaries, equal margins, equal grid tracks, phone alignment, stacking, and overflow.
- Inspected the generated dark 1440px showcase screenshot; comparison and showcase outer edges align.
- `npm test`: 217 passed, 0 failed.
- `node --check test/statusCustomization.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

Responsive checks used local headless Firefox, not physical devices. No supplied screenshot was available for pixel matching. No push performed.
