# Modernize the shared public footer

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: feature

## Problem or goal

The user approved replacing the busy four-column footer with a professional Brand / Product / Resources layout. They chose Resources instead of Jubro Dev and a simple App Builders PH support link instead of the voting iframe.

## Changes and resulting behavior

- The shared footer keeps the authentic Jubro logo, name, tagline, description, copyright, legal links, and Contact destination. Product retains existing links and adds the already-existing Features anchor. Resources contains GitHub, TikTok, Facebook, and Support Jubro on App Builders PH using the existing destinations and safe new-tab attributes.
- Removed the duplicate social-icon row, developer-centric heading/link label, separate Community column, and external voting iframe. No replacement embed or third-party runtime was added.
- Scoped `.site-footer` styles replace the old utility-heavy presentation and obsolete broad footer overrides. The 1440px centered content cap and existing outer spacing classes remain, with 16/24/32px responsive horizontal padding.
- Desktop from 1024px uses a wider brand column and two navigation columns. Smaller screens show a full-width brand above side-by-side Product and Resources groups. Content stays left-aligned and long links wrap safely.
- Off-white light and deep-navy dark surfaces use subtle dividers, readable muted copy, small semibold headings, 44px minimum link targets, restrained blue hover states, and focus outlines. No gradients, heavy shadows, new animations, dependencies, auth, storage, sync, or application logic changes.
- Home, Privacy, and Terms all receive the same shared footer.

## Files affected

- `components/footer.html`: simplified shared markup, navigation labels, support link, and preserved destinations.
- `css/global.css`: scoped footer theme, grid, typography, spacing, interaction states, and removal of obsolete footer-specific overrides.
- `test/landingFlow.test.mjs`: assert Resources, preserved/safe destinations, no iframe, and scoped footer container styling.
- `test/footer.browser.mjs`: new responsive geometry, contrast, target-size, wrapping, hover, screenshot, and legal-page loading checks.
- `test/statusCustomization.browser.mjs`: integrate footer verification into the landing matrix and legal-page smoke checks.
- `docs/features.md`, `docs/architecture.md`, `docs/development.md`: local-only, Git-ignored documentation updated, including removal of the external-widget dependency note.

## Verification

- New unit coverage failed against the old footer before implementation because the scoped Resources layout was absent.
- `npm test`: 221 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. Footer checks cover three-area/two-row responsive layout, container centering/padding, contrast, 44px targets, wrapping/overflow, preserved external-link safety, and real-pointer hover.
- The same browser run loaded Privacy and Terms normally and verified their shared footers in dark/light at 390px and 1440px: eight legal-page cases passed.
- Inspected generated dark 1440px and light 390px Home footer screenshots; spacing, left alignment, long support-link wrapping, and legal navigation remain balanced.
- Independent read-only review found no actionable defects and independently passed seven landing tests, browser-module syntax checks, and whitespace checks.
- JavaScript syntax checks and `git diff --check`: passed.

## Limitations

Browser checks used local headless Firefox and Firebase fixtures, not physical devices or live accounts. Native keyboard activation/visible-focus checks remain manual because this headless window stays inactive. External destinations were verified as preserved URLs, not visited or availability-tested. No deployment or push performed.
