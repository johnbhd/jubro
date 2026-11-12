# Redesign "How Jubro Works" as ADD → TRACK → ACT Flow

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

On the landing page (`index.html`), the "How Jubro Works" section (`#how-it-works`) previously used an editorial numbered three-step layout (`01`, `02`, `03`) separated by thin horizontal divider lines. While functional, it did not communicate the connected, iterative product loop of tracking job applications. The goal was to replace this layout with a clear, connected `ADD → TRACK → ACT` product flow inspired by the structural concept in `Jubro’s ADD → TRACK → ACT Flow.png`, while maintaining Jubro's restrained, professional, dark-mode-first aesthetic without generic SaaS template fluff, oversized cards, or uncompiled Tailwind dependencies.

## Changes and resulting behavior

1. **Markup Redesign (`index.html`)**:
   - Replaced `.landing-steps` and `.landing-step` with `.landing-flow-container` containing three `.landing-flow-card` articles and two `.landing-flow-arrow` dividers.
   - Preserved `#how-it-works` ID so navigation and hero CTA ("See How It Works") anchors continue targeting this section seamlessly.
   - Updated section heading to `How Jubro Works` and subtitle to `A simple flow to organize and stay on top of your job search.`
   - Card 1 (`ADD`): Icon `fa-plus`, verb badge `ADD`, title `Add an Application`, description `Save the company, position, date, platform, and job link.`
   - Card 2 (`TRACK`): Icon `fa-table-columns`, verb badge `TRACK`, title `Track Its Progress`, description `Move your application through Applied, Interview, Offer, or Rejected.`
   - Card 3 (`ACT`): Icon `fa-calendar-check`, verb badge `ACT`, title `Know What Comes Next`, description `Use Next Action to see which applications need your attention.`
   - Directional arrows connect the cards: right-facing arrow (`fa-arrow-right`) on desktop, down-facing arrow (`fa-arrow-down`) on mobile/tablet.

2. **Authored Scoped Styles (`css/global.css`)**:
   - Container width bounded to `max-width: 1056px`, harmonizing with the adjacent `#why-jubro` comparison section.
   - Desktop layout (`>= 1024px`): Cards share equal widths (`flex: 1 1 0%`) in a horizontal row connected by right arrows.
   - Mobile/tablet layout (`< 1024px`): Cards stack vertically in order, connected by down arrows.
   - Subtle 2px colored top border on each card (`#3b82f6` for ADD, `#10b981` for TRACK, `#a855f7` for ACT) providing distinct identity without heavy gradients or neon glow.
   - Interactive hover micro-elevation (`translateY(-2px)`) on desktop, completely disabled under `prefers-reduced-motion: reduce`.
   - WCAG AA compliant contrast (>= 4.5:1) authored directly for all verb badges, titles, descriptions, and icon containers in both light and dark modes.
   - Preserved `#homeBody :is(#how-it-works, #why-jubro)` selector to maintain custom properties for `#why-jubro`.

3. **Testing & Overview Documentation**:
   - Added `test/landingFlow.test.mjs` verifying the section markup, verbs, titles, descriptions, icons, arrows, and removal of old numbered step elements.
   - Updated `test/statusCustomization.browser.mjs` to assert the 3 flow cards, verbs, typography hierarchy, contrast ratios, and responsive alignment across viewports and themes.
   - Updated `docs/features.md` to reflect the new `ADD → TRACK → ACT` section architecture.

## Files affected

- `index.html`: Replaced old numbered step markup with connected `ADD → TRACK → ACT` flow cards and directional arrows.
- `css/global.css`: Authored responsive layout, card accents, icon boxes, arrow visibility, and theme contrast rules.
- `test/landingFlow.test.mjs`: Unit test verifying structure, copy, icons, and removal of legacy numbered steps.
- `test/statusCustomization.browser.mjs`: Browser assertions for flow cards, verbs, contrast, and responsive layout.
- `docs/features.md`: Updated local feature documentation describing the `ADD → TRACK → ACT` flow (local-only, not committed).
- `docs/context/2026-11-12-feature-landing-add-track-act-flow.md`: This context record.

## Verification

- `node --import ./test/register-loader.mjs --test test/landingFlow.test.mjs`: Passed (1/1 test).
- `JUBRO_LANDING_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across both light and dark themes at all 6 viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) with 0 errors.
- `npm test`: Full test suite passed (215/215 tests).
- Visual artifacts inspected at:
  - `landing-how-it-works-dark-1440.png`
  - `landing-how-it-works-light-1440.png`
  - `landing-how-it-works-dark-390.png`
  - `landing-how-it-works-light-390.png`

## Limitations

None identified.
