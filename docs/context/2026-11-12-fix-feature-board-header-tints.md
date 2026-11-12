# Give miniature Board columns tinted headers

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The Board & List feature illustration had status labels but no header background. The user requested a presentation like the actual app's Kanban headers.

## Changes and resulting behavior

Each miniature column now contains a separate full-width label/header. Header backgrounds mix 10% of the column accent into the theme's elevated surface, following the app's restrained tint approach. Applied uses blue, Interview green, and Rejected red; matching top accents remain stronger. The bodies stay neutral, column sizes remain unchanged, and the adjacent List sample and main pipeline illustration are untouched. This remains static, decorative marketing UI with no application data or behavior changes.

## Files affected

- `index.html`: separate header labels inside the three miniature columns.
- `css/global.css`: scoped tint, border, padding, and red accent tokens for both themes.
- `test/landingFlow.test.mjs`: require the three labels inside their dedicated header elements.
- `test/statusCustomization.browser.mjs`: assert full-width non-transparent header backgrounds distinct from neutral bodies.
- `docs/features.md`: update the local-only, Git-ignored overview.

## Verification

- Updated unit assertion failed before implementation because dedicated header elements were missing.
- `npm test`: 218 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px, including full-width tinted miniature headers and existing layout/overflow checks. Zero JavaScript errors. The first attempt timed out during Firefox `session.new`; a fresh retry passed.
- JavaScript syntax checks and `git diff --check`: passed.

## Limitations

Labels remain intentionally miniature and can wrap on narrow screens. No physical-device testing, dependencies, application logic, or sync changes. No push performed.
