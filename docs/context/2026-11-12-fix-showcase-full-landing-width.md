# Use the full shared landing width for mobile showcase rows

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The previous showcase polish misunderstood the requested horizontal alignment. Both rows already shared `.landing-main`, but each section was capped at 1056px inside a wider landing shell. Unequal mirrored grid tracks and centered phone media also pulled the visible content toward the middle. The user requested matching full-width boundaries, equal outer margins, and alternating content that uses opposite sides of the available width.

## Changes and resulting behavior

- Reused the existing shared `.landing-main` parent and `.landing-shell` maximum width of 1440px, including its existing 16/24/32px responsive horizontal padding. No extra wrapper or arbitrary container width was added.
- Removed the individual 1056px showcase cap. Both rows now fill the same parent content width with zero extra inline margins.
- Both desktop rows use identical `repeat(2, minmax(0, 1fr))` tracks and the existing 56px gap.
- The first row anchors readable copy to the left and `phone.png` to the right. The reverse row anchors `kannboard.png` to the left and its readable copy block to the right.
- Copy remains capped at 540px; phone dimensions, vertical centering, section rhythm, existing rounded-square benefit checks, colors, typography, and all other sections remain unchanged.
- Below 1024px, both rows retain text-first stacking, centered phones, normal page padding, and the existing 36px grid gap.
- No application logic, stored data, authentication, sync, or dependencies changed.

## Files affected

- `css/global.css`: remove row-level width restriction and unify desktop track sizing and outer-edge alignment.
- `test/statusCustomization.browser.mjs`: replace the superseded 1056px/compact-comparison alignment assertions with real geometry checks for the shared parent, full content width, equal margins, identical equal columns, both alternating outer-edge positions, and centered stacked phones.
- `docs/features.md`: update current showcase container/grid documentation; local-only and Git-ignored, not force-added.

## Verification

- Updated browser checks first; the previous implementation failed at dark 1024px for unequal grid columns and incorrect outer-edge positioning in both rows.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark and light themes at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. New geometry assertions passed alongside existing checks for vertical spacing, matching phone dimensions, benefit checks, overflow, navigation, Hero, flow/comparison, and footer behavior.
- Visually inspected generated dark 1440px and light 390px showcase screenshots. Desktop content now uses opposite landing edges; mobile retains its centered phone and readable stacked copy.
- `npm test`: 217 passed, 0 failed.
- `node --check test/statusCustomization.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

No red-line screenshot was attached in this turn; verification used the written requirement and the actual existing landing content bounds. Browser checks used local headless Firefox rather than physical devices. No CSS build was needed because these are authored global CSS rules. No push performed.
