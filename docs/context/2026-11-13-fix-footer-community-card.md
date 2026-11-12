# Restore the App Builders PH card below the footer description

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: fix

## Problem or goal

After the footer redesign, the user requested keeping the original App Builders PH card and placing it directly below the Jubro description instead of removing it.

## Changes and resulting behavior

- Restored the original `https://appbuildersph.com/embed/apps/jubro` iframe immediately after the brand description in the shared footer.
- Preserved its descriptive title, lazy loading, 320 × 72px dimensions, and disabled internal scrolling. Scoped CSS adds a 20px gap and limits width to available space.
- The modern Brand / Product / Resources layout, existing support link, other destinations, and legal row remain unchanged. Home, Privacy, and Terms share the restored placement.
- No application logic, workspace data, auth, sync, or package dependency changes.

## Files affected

- `components/footer.html`: restore the original titled iframe below the description.
- `css/global.css`: scoped responsive card sizing and spacing.
- `test/landingFlow.test.mjs`: require exactly one original embed in the requested position instead of asserting its absence.
- `test/footer.browser.mjs`: check iframe settings, location, dimensions, and fit within the brand area.
- `docs/features.md`, `docs/architecture.md`, `docs/development.md`: local-only, Git-ignored descriptions updated to reflect the restored external widget.

## Verification

- Updated unit coverage failed before the change because the embed was missing.
- `npm test`: 221 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px, plus eight Privacy/Terms smoke cases at 390px/1440px. Checks verify the original iframe appears below the description, retains its title/lazy settings, and fits without overflow. Zero JavaScript errors.
- JavaScript syntax checks and `git diff --check`: passed.

## Limitations

The restored iframe depends on App Builders PH and network availability. Local checks verify the embedding element and layout, not the third-party card's internal behavior. Physical-device and native keyboard/focus checks remain manual. No push performed.
