# Align Landing Mobile Showcase Sections and Polish Benefit Icons

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The two alternating mobile showcase sections on the landing page (`#about` "Built for Students, Freelancers & Job Seekers" and `#mobile-board` "See Where Every Application Stands") had several layout and visual polish issues:
1. Both sections used `max-w-6xl` in `index.html`, which was not compiled in `css/tailwind.css`. As a result, they stretched to `1376px` on desktop while the preceding sections (`#how-it-works` and `#why-jubro`) were capped at `1056px`, causing the text and phone columns to sit on a wider horizontal grid with excessive empty space between them.
2. The tall phone images (`280px` width / `560px` height) combined with large `.landing-main` section gaps (`88px` desktop) created a ~240px vertical void between the text blocks of Section 1 and Section 2.
3. The benefit lists used `rounded-full bg-blue-100 dark:bg-blue-900/50` circular check badges. Because `dark:bg-blue-900/50` was not compiled into `css/tailwind.css`, the badges rendered as bright white/light-blue (`#dbeafe`) circular pills in dark mode and looked like generic SaaS template icons.

## Changes and resulting behavior

1. **Unified `.mobile-showcase` Component System (`index.html`, `css/global.css`)**:
   - Unified `#about` (`.mobile-showcase`) and `#mobile-board` (`.mobile-showcase.mobile-showcase--reverse`) under shared classes: `.mobile-showcase-grid`, `.mobile-showcase-copy`, `.mobile-showcase-media`, `.mobile-showcase-title`, `.mobile-showcase-body`, and `.mobile-showcase-benefits`.
   - Capped `.mobile-showcase` at `max-width: 1056px; margin-inline: auto; margin-block: 0; padding-block: 0;` so both showcase sections align directly with the left and right edges of `#how-it-works` and `#why-jubro`.

2. **Equal Section Spacing & Balanced Desktop/Mobile Grid (`css/global.css`)**:
   - Adjusted `#homeBody .landing-main` vertical section gap to `48px` on mobile (`< 640px`), `64px` on tablet (`>= 640px`), and `72px` on desktop (`>= 1024px`).
   - On desktop (`>= 1024px`), set `.mobile-showcase-grid` to `grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr); gap: 56px; align-items: center;` and `.mobile-showcase--reverse .mobile-showcase-grid` to `grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1fr);`, centering both copy (`max-width: 540px`) and phone visuals vertically and horizontally within their columns.
   - On mobile and tablet (`< 1024px`), set a single-column grid (`gap: 36px`) with `.mobile-showcase-copy { order: 1; }` and `.mobile-showcase-media { order: 2; }` so text precedes the phone preview in both sections.
   - Refined `.landing-phone-visual` widths to `204px` (mobile), `228px` (tablet), and `244px` (desktop), preserving crisp 1:2 aspect ratio (`img/phone.png` and `img/kannboard.png`) while eliminating the large vertical void between sections.

3. **Typography Rhythm & Benefit Check Icon Polish (`index.html`, `css/global.css`)**:
   - Standardized copy spacing: `0` top/bottom margin on `.mobile-showcase-title`, `18px` top margin and `12px` paragraph gap on `.mobile-showcase-body`, and `22px` top margin with `10px` row gaps on `.landing-benefits`.
   - Replaced all 6 circular `rounded-full bg-blue-100` check spans with `.landing-benefit-icon`: a restrained `24px × 24px` rounded square (`border-radius: 7px`) with `11px` check icon (`fa-check`), soft blue light-mode styling (`#eff6ff` background, `#bfdbfe` border, `#2563eb` icon), and dark-navy/blue dark-mode styling (`rgb(30 58 138 / 0.35)` background, `rgb(59 130 246 / 0.35)` border, `#60a5fa` icon).

## Files affected

- `index.html`: Refactored `#about` and `#mobile-board` markup to use the shared `.mobile-showcase` and `.landing-benefit-icon` classes.
- `css/global.css`: Authored `.mobile-showcase*` layout rules, `.landing-benefit-icon` light/dark styles, updated `.landing-phone-visual` sizing, and refined `.landing-main` vertical rhythm.
- `test/landingFlow.test.mjs`: Updated unit assertions for `.mobile-showcase` shared classes and `.landing-benefit-icon` styling.
- `test/statusCustomization.browser.mjs`: Updated benefit row gap check (`10px`) and added browser assertions for `1056px` showcase width alignment, equal vertical section gaps, vertical center alignment on desktop, equal phone dimensions, and `24×24px` (`7px` radius) benefit icons.
- `docs/features.md`: Updated local feature documentation (local-only, git-ignored).
- `docs/context/2026-11-12-fix-landing-mobile-showcase-alignment-and-benefit-icons.md`: This context record.

## Verification

- `node --import ./test/register-loader.mjs --test test/landingFlow.test.mjs`: Passed (3/3 tests).
- `JUBRO_LANDING_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across dark and light themes at all 6 viewports (`390px`, `430px`, `768px`, `1024px`, `1440px`, `1920px`), with visual inspection of generated `*-about.png` screenshots.
- `npm test`: Full unit test suite passed (217/217 tests).

## Limitations

None identified.
