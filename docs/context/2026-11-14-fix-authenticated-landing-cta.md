# Show the authenticated landing CTA label

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

The landing navbar kept showing `Start for Free` after Firebase authentication resolved, even though the visitor was already signed in. The CTA route was correct, but its label did not reflect the current account state.

## Changes and resulting behavior

- `Auth.setNavbarAuthState()` now updates only the landing navbar CTA label from the resolved auth state.
- Guests and the loading state keep `Start for Free`.
- Authenticated visitors see `Open Jubro`.
- All states keep the existing `/board/` destination and guest-first behavior. Hero and final landing CTAs remain unchanged.

## Files affected

- `js/auth/auth.js`: synchronize the navbar CTA label with guest/loading/authenticated state.
- `test/authNavigation.browser.mjs`: assert an already authenticated homepage shows `Open Jubro`.
- `docs/features.md`: document the conditional navbar label.
- `docs/architecture.md`: document the landing CTA state behavior in the local overview.
- `docs/context/2026-11-14-fix-authenticated-landing-cta.md`: this record.

## Verification

- `npm test`: 257 passed, 0 failed.
- `JUBRO_AUTH_ONLY=1 node test/statusCustomization.browser.mjs`: passed both themes at 390, 430, 768, 1024, 1440, and 1920px with zero browser errors. The authenticated-home assertion confirmed `Open Jubro`; existing login/logout routing, flash toasts, and navbar spacing checks also passed.
- `node --check js/auth/auth.js`: passed.
- `node --check test/authNavigation.browser.mjs`: passed.
- `git diff --check`: passed.
- No storage, sync, auth provider, route, or dependency changes were made.

## Limitations

Live Firebase accounts and physical devices were not checked. The browser matrix uses the repository Firebase fixture.
