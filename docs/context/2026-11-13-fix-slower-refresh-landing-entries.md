# Slower landing entrances after refresh and scrolling

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: fix

## Problem or goal

The existing section controller skipped content already visible when the page loaded, so refreshing mid-page did not animate that section. Its 600ms entrances also felt too fast. The approved change was to animate visible sections after refresh and reveal remaining sections once during scrolling, using slower, gentle movement rather than artificial scroll inertia.

## Changes and resulting behavior

- Visible and offscreen section targets enter through the existing observer. Targets entirely above a restored scroll position are skipped. Native browser scrolling and scroll restoration remain unchanged.
- Section entrances last 900ms instead of 600ms. Adjacent cards stagger by 120ms instead of 80ms only at their existing multi-column breakpoints. Existing 16px desktop and 12px mobile movement remains unchanged.
- Hero text entrances last 900ms instead of 650ms; its product preview lasts 1100ms instead of 850ms. Hero remains separate from section reveals to avoid double animation.
- Each target reveals once per load and can animate again after refresh. Scrolling back does not replay it. Existing reduced-motion, focus/hash bypass, fail-open behavior, decorative opacity, and hover transforms remain intact.
- No content, layout, dependency, authentication, workspace, storage, or sync changes.

## Files affected

- `js/homepage/landingReveals.js`: visible-on-refresh targeting and slower timing.
- `css/global.css`: slower Hero timing only.
- `test/landingReveals.test.mjs`: updated lifecycle expectations and restored-position regression.
- `test/landingIntroAnimation.test.mjs`: updated existing Hero timing assertions.
- `test/landingReveals.browser.mjs`: real mid-page reload verifies native scroll restoration and visible-section entrances; reduced motion remains animation-free.
- Local-only, Git-ignored `docs/features.md`, `docs/architecture.md`, and `docs/development.md`: updated behavior and verification guidance.
- Local-only, Git-ignored `docs/plans/2026-11-13-slower-landing-entries.md`: approved implementation brief.

## Verification

- Test-first: visible-content and restored-partial-intersection assertions failed against the old controller, then passed with the change. Focused controller tests: 11 passed.
- `npm test`: 232 passed, 0 failed after updating the obsolete Hero-duration expectations.
- Final normal-motion landing browser matrix, including the new mid-page reload test, passed dark/light at 390, 430, 768, 1024, 1440, and 1920px, with zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-1Cdi5f`. An earlier matrix also passed before adding the refresh browser assertion.
- Reduced-motion landing browser matrix, including the new mid-page reload test, passed dark/light at those six widths plus 640px, with zero JavaScript errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-aemDGF`.
- Inspected the dark 390px workflow screenshot: the settled layout remains unchanged.
- JavaScript syntax checks for all four modified modules/tests passed. All tracked JSON files parsed. `git diff --check` passed.
- Fresh read-only review found no blocking findings and independently passed the 12 controller/Hero tests.

## Limitations

Physical-device animation feel and native keyboard focus in an active browser window remain unverified. Headless Firefox suppresses native focus while inactive; the normal browser test uses the existing synthetic focus-handler fallback and reports keyboard skips explicitly. Live backend behavior was not exercised; backend code is unchanged. No push performed.
