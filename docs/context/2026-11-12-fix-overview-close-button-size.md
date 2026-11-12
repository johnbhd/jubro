# Enlarge Quick Overview close control

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The Quick Overview close × was too small. Increase its visible size and touch target without changing dismissal behavior or unrelated modals.

## Changes and resulting behavior

The existing `.overview-close` control now centers a 30px glyph in a 44 × 44px target, instead of the previous 20px glyph and 40 × 40px target. Existing hover, focus, accessible label, click handling, Escape, and focus restoration remain unchanged. The style applies to empty and populated Quick Overview in both themes.

## Files affected

- `css/global.css`: enlarge and center the existing close control.
- `test/quickOverview.browser.mjs`: assert visible font size and minimum target geometry across states, themes, and responsive widths.
- `docs/features.md`: update the close-control description; local-only and Git-ignored.

## Verification

- New browser size assertions failed against the previous control at dark 390px, populated state.
- `npm test`: 217 passed, 0 failed.
- `JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px, including empty/populated close-button sizing, modal fit, and existing behavior checks. Zero JavaScript errors. The first post-change run timed out during Firefox `session.new`; a fresh retry passed.
- `node --check test/quickOverview.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

No production JavaScript or dependencies changed. Physical-device testing was not performed. No push performed.
