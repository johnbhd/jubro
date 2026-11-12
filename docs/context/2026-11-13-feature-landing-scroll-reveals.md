# Professional landing scroll entrances

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: feature

## Problem or goal

The Hero already had an on-load intro, but the remaining landing sections appeared without scroll entrances. The approved direction was subtle staged fade-ups, once per page load, preserving current layout, content, hover effects, and reduced-motion accessibility.

## Changes and resulting behavior

- Added a homepage-only native IntersectionObserver controller after shared navbar/footer loading and before authentication setup. Legal pages and application views are excluded.
- Below-Hero headings, workflow cards/arrows, comparison cards, showcase text/images, feature cards, FAQ cards, final CTA, and footer reveal with 600ms ease-out opacity and independent `translate`. Movement is 16px, or 12px below 640px. Adjacent cards stagger by 80ms only at their real multi-column breakpoints; delays use the width at reveal time, including after resizing.
- Preserved the Hero intro, all existing hover transforms, subdued decorative-arrow opacity, and the original App Builders PH iframe. No layout, copy, workspace, auth, sync, or dependency changes.
- Only offscreen targets receive temporary pending styles. Initially visible content and content above restored scroll positions remain visible. Targets are unobserved when revealed; finished animations are canceled and removed. No flags are persisted.
- Focus and hash navigation reveal affected content immediately. Missing observers, setup failures, and animation errors fail open. Reduced motion skips entrances; enabling it mid-session clears pending/running work without restarting later.
- Corrected the existing reduced-motion Hero pseudo-element override to retain horizontal centering. This removes its previously documented horizontal overflow without reintroducing animation.
- Extended browser checks to reload each viewport, scroll pending targets, wait for observer delivery and completed animations, and verify visibility, hover coexistence, no replay, no overflow, and unchanged browser workspace storage before taking screenshots.

## Files affected

- `js/homepage/landingReveals.js`: focused scroll entrance controller and accessibility/fallback handling.
- `js/main.js`: initialize after shared component loading, before auth.
- `css/global.css`: homepage-only pending styles and reduced-motion Hero centering.
- `test/landingReveals.test.mjs`: ten focused lifecycle, responsive, opacity, accessibility, and fallback tests.
- `test/landingReveals.browser.mjs`: real-browser reveal, hash, focus-handler, missing-observer, and storage checks.
- `test/statusCustomization.browser.mjs`: integration with normal/reduced landing matrices and page-safe static preview assertions after reloads.
- `docs/features.md`, `docs/architecture.md`, `docs/development.md`: local-only, Git-ignored overview updates.
- `docs/plans/2026-11-13-landing-scroll-reveals.md`: local-only, Git-ignored approved implementation brief.

## Verification

- Test-first: empty controller failed the offscreen pending-state assertion. Implementation passed all lifecycle tests. A separate decorative-opacity regression failed with `1` instead of `0.65`, then passed after preserving the original computed opacity.
- `npm test`: 231 passed, 0 failed, including ten new scroll lifecycle tests and existing ownership/auth/storage regressions.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px, plus eight Privacy/Terms footer smoke cases. Zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-yxweSy`.
- `JUBRO_LANDING_ONLY=1 JUBRO_REDUCED_MOTION=1 node test/statusCustomization.browser.mjs`: passed dark/light at the six requested widths plus 640px. Whole-page overflow checks include the corrected Hero backdrop. Zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-VyAxcx`.
- Inspected dark 768px Features, light 390px workflow, and light 390px reduced-motion final CTA screenshots. Existing visual hierarchy remains intact after entrances finish.
- JavaScript syntax checks for all five affected JS/test modules: passed. All three tracked JSON files parsed successfully. `git diff --check`: passed.
- Fresh read-only review found no blocking issues and independently passed the ten lifecycle tests.

## Limitations

Headless Firefox reports an inactive window and suppresses native focus/keyboard behavior. The normal-motion browser check dispatches synthetic `focusin` only when native focus delivery is suppressed; this verifies the delegated handler, not physical keyboard delivery. Existing FAQ checks report 12 normal and 14 reduced-motion native-keyboard skips rather than claiming success. Physical-device animation feel, native keyboard behavior in an active window, and live authenticated backend behavior remain unverified. Backend logic is unchanged. No push performed.
