# Hide landing CTA while auth resolves

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

On landing-page refresh, the navbar briefly showed `Start for Free` before Firebase resolved an already authenticated visitor and changed it to `Open Jubro`.

## Changes and resulting behavior

- The shared navbar CTA starts in an auth-pending state with stable layout space.
- The CTA is visually and accessibly hidden while auth resolves; the existing loading account placeholder remains visible.
- Authenticated and guest states reveal the CTA with `Open Jubro` and `Start for Free` respectively.
- Auth initialization failure keeps the guest CTA available through the existing fallback path.

## Files affected

- `components/navbar.html`: mark the CTA pending on initial render.
- `js/auth/auth.js`: reveal and label the CTA only after auth state resolution.
- `js/main.js`: preserve guest CTA availability when auth setup fails.
- `css/global.css`: hide pending CTA without changing navbar geometry.
- `test/authNavigation.browser.mjs`: verify pending-state suppression and resolved-state behavior.
- `docs/context/2026-11-14-fix-landing-auth-cta-flash.md`: this record.

## Verification

- `npm test`: 257 passed, 0 failed.
- `JUBRO_AUTH_ONLY=1 node test/statusCustomization.browser.mjs`: passed both themes at 390, 430, 768, 1024, 1440, and 1920px with zero browser errors. The focused auth flow also verified the pending CTA is hidden until auth state resolves.
- `node --check js/auth/auth.js`, `node --check js/main.js`, and `node --check test/authNavigation.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

The live Firebase auth path and physical devices were not checked in this change.
