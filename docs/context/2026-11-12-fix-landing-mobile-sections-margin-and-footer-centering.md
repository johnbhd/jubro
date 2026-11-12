# Equalize Mobile Section Vertical Margins and Center Footer on Super Large Screens

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

Two visual layout issues were identified on the landing page:
1. The two mobile sections (`#about` and `#mobile-board`, along with the flow and comparison sections on mobile) exhibited subtle vertical margin asymmetries across headings, copy, and visuals.
2. On super large screens (e.g. 1920px+ viewports), the footer content container expanded across the entire viewport width because `max-w-[1440px]` was not compiled in the static Tailwind stylesheet, leaving the footer without horizontal centering margins that align with the main landing shell (`max-w-7xl` / `1440px`).

## Changes and resulting behavior

1. **Footer Centering on Large Screens (`css/global.css`)**:
   - Authored explicit CSS rules for `#homeBody footer > div, footer > div` with `width: 100%; max-width: 1440px; margin-inline: auto;`.
   - On super large displays (such as 1440px, 1920px, and ultra-wide monitors), the footer content remains centered with equal left/right margins matching `.landing-shell`.

2. **Equal Vertical Margins for Mobile Sections (`css/global.css`, `index.html`)**:
   - Added `#homeBody :is(#about, #mobile-board) { margin-block: 0; padding-block: 0; }` in `css/global.css`, ensuring the two mobile showcase sections share identical vertical margins.
   - Kept `#homeBody .landing-about-grid` and `.landing-board-showcase-grid` aligned with equal `gap: 40px` on mobile and `gap: 56px` on desktop.
   - Harmonized vertical spacing on `#how-it-works` (`mt-10` matching `#why-jubro`'s `mt-10`) and reduced `.landing-comparison-separator` margin to `mb-6 sm:mb-8` in `index.html`, ensuring consistent vertical rhythm on mobile devices.

3. **Verification & Tests**:
   - Added unit test in `test/landingFlow.test.mjs` verifying the footer centering rules and mobile section margin rules.
   - Updated `test/statusCustomization.browser.mjs` to assert that `#about` and `#mobile-board` share equal vertical margins across all viewports, and that `footer > div` remains capped at 1440px and centered on wide viewports (1440px and 1920px).
   - Updated local documentation in `docs/features.md`.

## Files affected

- `css/global.css`: Added footer container max-width & centering rules, and mobile sections equal vertical margin rules.
- `index.html`: Adjusted flow container and comparison separator vertical margins to maintain equal rhythm on mobile.
- `test/landingFlow.test.mjs`: Added tests for footer container centering and mobile section vertical margins.
- `test/statusCustomization.browser.mjs`: Added browser assertions for mobile sections equal vertical margins and footer centering.
- `docs/features.md`: Updated local feature documentation (local-only, not committed).
- `docs/context/2026-11-12-fix-landing-mobile-sections-margin-and-footer-centering.md`: This context record.

## Verification

- `node --import ./test/register-loader.mjs --test test/landingFlow.test.mjs`: Passed (3/3 tests).
- `JUBRO_LANDING_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across dark and light themes at all 6 viewports (390px, 430px, 768px, 1024px, 1440px, 1920px).
- `npm test`: Full test suite passed (216/216 tests).

## Limitations

None identified.
