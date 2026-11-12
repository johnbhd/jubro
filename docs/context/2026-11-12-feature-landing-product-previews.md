# Modernize landing Features with static product previews

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

The user requested a modern treatment for “Everything You Need to Stay On Top of Applications.” They selected Features only, with balanced product-preview cards rather than minimal icon cards or an asymmetric bento layout. The separate How Jubro Works section and all other landing content must remain unchanged.

## Changes and resulting behavior

- Replaced the four generic icon cards with equal article cards containing the original feature titles/descriptions and compact static HTML/CSS product illustrations. The section heading, subtitle, order, and surrounding sections are preserved.
- Visual Job Pipeline shows miniature Applied, Interview, and Offer stages with fixed marketing application examples. Next Action shows a calendar icon, follow-up text, and date pill without a completion control. Board & List shows decorative tabs and both view representations. Local + Cloud shows device/cloud icons, a dotted connection, and guest/sync captions.
- Cards use 24px gaps, 24px mobile padding and 28px padding from 640px upward. They stack below 640px and use two equal columns above it. Preview areas align within each desktop row.
- Existing landing surface/text/accent tokens now also cover Features. Off-white/light preview surfaces and layered dark navy surfaces provide depth without large shadows. A subtle border change and 2px hover lift respect reduced-motion preferences.
- Preview content is non-interactive and `aria-hidden`; accessible headings and descriptions retain each feature's meaning. No real workspace data is read, generated, or stored. No application runtime JavaScript, storage, auth, sync, or dependencies changed.

## Files affected

- `index.html`: semantic feature cards and fixed decorative product illustrations.
- `css/global.css`: landing-scoped preview/card styling, theme tokens, responsive grid, and motion preference support.
- `test/landingFlow.test.mjs`: feature count, preserved copy, static previews, and absence of interactive product controls.
- `test/statusCustomization.browser.mjs`: feature geometry/contrast/overflow checks, screenshots, hover assertions, and a focused Firefox reduced-motion mode.
- `docs/features.md`: local-only, Git-ignored feature presentation documentation updated.

## Verification

- New unit test failed against the old markup because there were no product-preview cards. Browser checks likewise failed at dark 390px before implementation.
- `npm test`: 218 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. Checks cover equal card widths, responsive stacking, aligned previews, decorative semantics, no horizontal overflow, title/body contrast, hover, and existing landing behavior.
- `JUBRO_LANDING_ONLY=1 JUBRO_REDUCED_MOTION=1 node test/statusCustomization.browser.mjs`: passed focused Features checks in dark/light at the same widths plus 640px. Firefox's reduced-motion preference was enabled in its temporary test profile; real pointer hover left the card transform at `none`.
- Inspected generated dark 1440px and light 390px Features screenshots. Cards and preview surfaces remain readable and balanced.
- Independent read-only review found no actionable defects. Its suggestion to check the 640px breakpoint was included in the focused reduced-motion matrix.
- JavaScript syntax checks and `git diff --check` passed.

## Limitations

The first broad reduced-motion run exposed an existing hero-glow horizontal overflow: the hero's reduced-motion override removes the pseudo-element's centering transform. The hero was explicitly out of scope and remains unchanged. Reduced-motion mode therefore isolates Features bounds and hover instead of claiming a full-page reduced-motion pass; normal-motion checks still cover page-level overflow and the full landing layout.

Verification used local headless Firefox and Firebase fixtures, not physical devices or live accounts. No external design canvas, new assets, dependencies, deployment, or push was used. Work remains in the user-approved development checkout.
