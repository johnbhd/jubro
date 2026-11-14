# Show loader in landing auth CTA

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

The landing CTA was hidden while Firebase resolved auth, leaving an empty-looking navbar slot during refresh.

## Changes and resulting behavior

- The CTA keeps its layout width and displays a theme-aware pulsing skeleton while auth is pending.
- The skeleton is non-interactive and labelled `Loading account` for assistive technology.
- Auth resolution replaces the skeleton with `Open Jubro` or `Start for Free`.
- Auth initialization failure still restores the guest CTA.

## Files affected

- `components/navbar.html`: add the pending CTA loader markup and loading semantics.
- `js/auth/auth.js`: manage loader visibility, label, and disabled state across auth states.
- `js/main.js`: restore the usable guest CTA in the auth fallback path.
- `css/global.css`: style the light and dark pending CTA skeleton.
- `test/authNavigation.browser.mjs`: verify the visible pending loader.
- `docs/context/2026-11-14-fix-landing-auth-cta-loader.md`: this record.

## Verification

- `npm test`: 257 passed, 0 failed.
- `JUBRO_AUTH_ONLY=1 node test/statusCustomization.browser.mjs`: passed both themes at 390, 430, 768, 1024, 1440, and 1920px with zero browser errors. The focused auth flow verified the visible pending CTA skeleton and resolved guest/authenticated labels.
- `node --check js/auth/auth.js`, `node --check js/main.js`, and `node --check test/authNavigation.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

Live Firebase auth and physical-device rendering were not checked.
