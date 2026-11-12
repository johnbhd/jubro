# Polish the final landing CTA panel

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: feature

## Problem or goal

The user approved a premium centered treatment for the final CTA: more eye-catching and professional, while preserving its existing copy, Features-width alignment, and guest-first Board entry.

## Changes and resulting behavior

- Replaced the final CTA's utility-heavy flat card with scoped semantic styling and existing landing text/border/accent tokens. Its centered layout and full-width alignment with Features remain unchanged.
- The panel uses 24px corners, 32px mobile/56px larger-screen padding, a subtle blue highlight over off-white in light mode or navy in dark mode, a restrained border, and a minimal neutral shadow.
- The unchanged headline uses 30px mobile/40px desktop type, weight 700, balanced wrapping, and a 680px maximum width. The unchanged supporting paragraph uses 16px/18px type and a 600px maximum width.
- Create My Job Search remains a normal `/board/` link. It is now blue with white text in both themes, with a decorative right arrow, 48px minimum height, 32px horizontal padding, clear hover/focus styles, and mobile content-width sizing capped at 320px. These overrides affect only this CTA, not the Hero or navbar buttons.
- Added the reassurance “No account required. Sign in anytime to sync.” No account creation, authentication requirement, forced Job Search creation, or other workflow was added.
- Existing subtle panel/button hover lifts remain and respect reduced motion. No other landing sections, application JavaScript, APIs, storage, sync, schema, assets, or dependencies changed.

## Files affected

- `index.html`: scoped final CTA markup, decorative arrow, and reassurance text.
- `css/global.css`: final CTA surfaces, typography, responsive sizing, button states, and restrained shadow.
- `test/landingFlow.test.mjs`: preserved copy, single Board link, decorative arrow, reassurance, and no custom navigation handlers.
- `test/finalCta.browser.mjs`: new focused layout, contrast, mobile sizing, real-pointer motion, and screenshot checks.
- `test/statusCustomization.browser.mjs`: reuse the CTA helper in normal and reduced-motion matrices, replacing the older panel-only hover check.
- `docs/features.md`: local-only, Git-ignored CTA overview updated.

## Verification

- The new unit assertion failed against the old CTA because the reassurance and arrow were missing.
- `npm test`: 220 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. Checks include Features-width alignment, no horizontal overflow, panel padding/depth, heading sizes, button dimensions, preserved Board route, decorative arrow, readable text/button contrast, and both hover lifts.
- `JUBRO_LANDING_ONLY=1 JUBRO_REDUCED_MOTION=1 node test/statusCustomization.browser.mjs`: passed focused section checks in both themes at the same widths plus 640px. Real-pointer hover leaves both CTA panel and button untransformed under reduced motion. Zero JavaScript errors.
- Inspected generated dark 1440px and light 390px CTA screenshots. The centered panel, prominent button, and reassurance fit without clipping.
- Independent read-only review found no actionable defects; six focused landing tests and syntax/whitespace checks also passed independently.
- JavaScript syntax checks and `git diff --check`: passed.

## Limitations

Verification used local headless Firefox and Firebase fixtures, not physical devices or live accounts. Native keyboard activation and visible-focus verification remain manual because the headless window stays inactive; the existing FAQ checks explicitly report their skipped keyboard cases. The known reduced-motion hero-glow overflow remains outside scope, so reduced-motion verification covers the affected sections rather than claiming a whole-page pass. No CSS build was needed for authored global styles. No push or deployment performed.
