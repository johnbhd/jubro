# Correct dark-mode auth loader surface

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: fix

## Problem or goal

The pending landing navbar CTA appeared white in dark mode because the shared primary-button background used `!important` and overrode the loader surface.

## Changes and resulting behavior

The scoped dark pending-state background now wins the CSS cascade and uses slate `#1f2937`. Resolved CTA styling and authentication behavior remain unchanged.

## Files affected

- `css/global.css`: correct the pending dark CTA background priority.
- `test/authNavigation.browser.mjs`: check computed pending backgrounds in both themes.
- `docs/architecture.md` (local-only): describe the visible theme-aware loader.
- This context record.

## Verification

- `JUBRO_AUTH_ONLY=1 node test/statusCustomization.browser.mjs`: passed both themes and six viewport widths (390, 430, 768, 1024, 1440, 1920px), with no browser errors. Computed pending CTA backgrounds matched the dark slate and light gray expectations.
- `node --check test/authNavigation.browser.mjs`: passed.
- `git diff --check`: passed.

## Limitations

Live Firebase authentication and physical devices were not checked. Commit and push remain pending.
