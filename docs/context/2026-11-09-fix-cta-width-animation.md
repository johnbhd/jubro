# Align the landing CTA and add restrained interaction motion

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The final CTA retained a 1024px width cap, so its edges did not align with the Features section on larger screens. The user requested matching section margins and animation.

## Changes and resulting behavior

- Removed the CTA-specific width cap. The card now uses the same landing container edges as Features at every tested width.
- Added a 220ms, 3px card lift with a soft shadow on hover or focus within. The Open Jubro button has a 180ms, 2px lift on hover or visible keyboard focus.
- Motion rules apply only under `prefers-reduced-motion: no-preference`. No looping effects, JavaScript animation, new dependencies, or data changes were introduced.

## Files affected

- `index.html`: removed the final CTA width cap.
- `css/global.css`: scoped card/button interaction transitions and motion-preference guard.
- `test/statusCustomization.browser.mjs`: exact section-edge alignment and native-pointer hover animation assertions.
- `docs/features.md`: local-only overview, ignored by Git.
- This context record.

## Verification

- Section-edge regression assertion failed before the width correction.
- `npm test`: 153 passed, 0 failed.
- Landing-only Firefox browser checks passed in both themes at 390, 430, 768, 1024, 1440, and 1920px with no JavaScript errors. Assertions verify exact CTA/Features edge alignment and completed native-pointer hover transforms, alongside existing image, spacing, and overflow checks.
- Inspected a desktop full-page screenshot for section alignment.
- `node --check test/statusCustomization.browser.mjs` and `git diff --check`: passed.

## Limitations

Physical devices and other browsers were not tested. Reduced-motion rules were reviewed but the browser run used its default no-preference setting. Headless Firefox did not activate CSS keyboard-focus state through programmatic focus, so animation verification uses native pointer actions; live keyboard motion remains unverified. The existing missing Tailwind CLI build limitation remains unchanged. No push was performed.
