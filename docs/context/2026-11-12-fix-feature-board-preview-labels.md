# Label miniature Board columns in Features

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The Board & List feature card contained three blank miniature Kanban columns. The user requested small Applied, Interview, and Rejected labels.

## Changes and resulting behavior

The three decorative columns now show those labels in order, using centered 8px text with slight padding and wrapping for narrow widths. Column size, colors, the adjacent List sample, the main pipeline preview, and all real application behavior remain unchanged.

## Files affected

- `index.html`: fill the three miniature column labels.
- `css/global.css`: small label typography and safe wrapping.
- `test/landingFlow.test.mjs`: assert the exact labels and order within this specific preview.
- `docs/features.md`: local-only, Git-ignored overview updated.

## Verification

- New label assertion failed before implementation because the columns were blank.
- `npm test`: 218 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors, including existing feature-card layout and overflow checks.
- `node --check test/landingFlow.test.mjs` and `git diff --check`: passed.

## Limitations

The labels are intentionally miniature decorative text, not interactive application UI. They may wrap at narrow widths. Verification used headless Firefox, not physical devices. No dependencies or product logic changed. No push performed.
