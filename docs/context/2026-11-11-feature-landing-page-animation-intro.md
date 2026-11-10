# Add landing page hero animation intro

## Date and type

- Date: 2026-11-11 (Asia/Manila)
- Type: feature

## Problem or goal

The Jubro landing page loaded with static hero elements without entrance animations, missing a modern, polished introductory feel when users first land on the page.

## Changes and resulting behavior

- Implemented a staggered intro entrance animation sequence for the landing page hero in [`css/global.css`](../../css/global.css):
  - Defined `@keyframes landingIntroFadeUp` animating opacity from 0 to 1 and `translateY(22px)` to 0.
  - Defined `@keyframes landingIntroVisualIn` animating opacity from 0 to 1 and `translateY(32px) scale(0.98)` to `translateY(0) scale(1)`.
  - Defined `@keyframes landingIntroGlowIn` animating opacity from 0 to 1 and `translateX(-50%) scale(0.92)` to `translateX(-50%) scale(1)`.
  - Applied staggered animation timing with smooth deceleration curve `cubic-bezier(0.16, 1, 0.3, 1)`:
    - Hero headline (`#homeBody .landing-hero-copy h1`): 650ms duration, 0ms delay.
    - Hero subtitle (`#homeBody .landing-hero-copy > p`): 650ms duration, 120ms delay.
    - Hero action buttons (`#homeBody .landing-hero-actions`): 650ms duration, 240ms delay.
    - Hero visual container (`#homeBody .landing-hero-visual`): 850ms duration, 360ms delay.
- Added ambient radial backdrop glow via `#homeBody .landing-hero-visual::before` pseudo-element:
  - Positioned behind the Kanban preview board (`z-index: 0`, `pointer-events: none`).
  - Subtle blue/indigo blend in light mode and deep navy glow in dark mode.
  - Zero DOM alterations, ensuring exact compatibility with existing automated selectors (`.landing-hero-visual > div`).
- Added subtle hover lift interaction to the hero preview card:
  - `#homeBody .landing-hero-visual > div` smoothly elevates by 4px (`translateY(-4px)`) on hover with expanded soft shadow.
- Built-in accessibility support:
  - Under `@media (prefers-reduced-motion: reduce)`, all animations, transitions, and transforms are completely disabled (`animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important;`).
- Added unit tests in [`test/landingIntroAnimation.test.mjs`](../../test/landingIntroAnimation.test.mjs):
  - Verified markup hooks, keyframe definitions, staggered animation timings, ambient glow pseudo-element, hover lift rules, and reduced motion overrides.

## Files affected

- [`index.html`](../../index.html): Added `.landing-hero-actions` class to the hero CTA button container.
- [`css/global.css`](../../css/global.css): Added `@keyframes landingIntroFadeUp`, `@keyframes landingIntroVisualIn`, `@keyframes landingIntroGlowIn`, staggered hero element rules, ambient glow pseudo-element, hover lift, and `prefers-reduced-motion` overrides.
- [`test/landingIntroAnimation.test.mjs`](../../test/landingIntroAnimation.test.mjs): Added unit test suite covering landing hero entrance animation and accessibility.
- `docs/features.md` (local-only, git-ignored): Updated landing page presentation documentation.

## Verification

- `node --import ./test/register-loader.mjs --test test/landingIntroAnimation.test.mjs` — passed (1/1 test).
- `JUBRO_LANDING_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs` — passed across dark and light themes at 390, 430, 768, 1024, 1440, and 1920px viewports (0 errors).
- `npm test` — passed (204/204 unit tests).
- `git diff --check` — passed with no syntax or whitespace issues.

## Limitations

None identified.
