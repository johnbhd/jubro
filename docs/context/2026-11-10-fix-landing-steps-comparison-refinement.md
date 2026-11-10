# Calm workflow steps and compact comparison cards

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

The landing workflow used oversized saturated-blue numbers and strong divider lines. The spreadsheet comparison used a single bordered row grid, repeated circular X/check badges, and blue heading treatment that resembled a pricing table. Refine only these two sections without changing their order, workflow content, product behavior, or other landing sections.

## Changes and resulting behavior

- Workflow numbers are 18px, weight 600, below the 20px step titles. Scoped accent tokens use muted blue `#476EB3` in light mode and `#7FA8FF` in dark mode. The darker light accent keeps small text readable rather than using a pale blue with insufficient contrast.
- Step dividers are 1px lines using `rgb(91 141 239 / 0.32)`, replacing stronger opaque borders. Existing three titles and descriptions are unchanged.
- The comparison now contains two semantic, independently bordered articles with accessible title references: THE OLD WAY / Spreadsheets & Notes, then THE JUBRO WAY / Jubro.
- Five original comparison ideas remain on each side. Old Way points have no icons. Jubro points have small 12px decorative checkmarks without circular badges.
- The section is capped at 1056px; its heading/copy block is capped at 768px. Cards stack below 768px and use equal columns with a 24px gap at larger widths. Mobile gap is 20px; padding is 24px mobile and 28px tablet/desktop. List gaps are 10px.
- Cards use restrained light/off-white and dark navy surfaces, neutral borders, neutral titles, and no added shadow, hover scaling, or animation. Blue is limited to secondary accents.
- Removed an obsolete comparison-specific saturated icon color rule. Other landing sections, auth, workspace data, navigation, synchronization, and generated Tailwind CSS are untouched. No dependencies were added.

## Files affected

- `index.html`: Workflow semantic classes and replacement comparison article/list markup.
- `css/global.css`: Scoped theme accents, workflow hierarchy, comparison surfaces and responsive grid.
- `test/statusCustomization.browser.mjs`: Responsive geometry, typography, contrast and icon checks; dedicated section screenshots.
- `docs/features.md`: Local-only overview updated with the new presentation; ignored by Git.
- `docs/development.md`: Local-only verification overview updated; ignored by Git.
- `docs/context/2026-11-10-fix-landing-steps-comparison-refinement.md`: This tracked record.

## Verification

- Added browser assertions before implementation. The initial run failed on oversized step numbers, strong dividers, and missing independent comparison cards, confirming that the checks detect the previous presentation.
- Investigated a later Firefox gap assertion failure: computed rectangles yielded a 19.99994px gap for a 20px CSS gap. Adjusted test tolerance by half a pixel; no layout workaround was introduced.
- `npm test`: 188 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: Passed, zero JavaScript errors, dark/light at 390, 430, 768, 1024, 1440, and 1920px. Checks include stacking/order, equal card proportions, compact width/padding, small decorative checks, neutral title color, and at least 4.5:1 contrast for step numbers and comparison labels/titles/body text. Existing landing CTA, navigation, static preview and overflow regressions also passed.
- Screenshot artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-YRUpZ7`. Visually inspected dark mobile comparison, dark desktop workflow/comparison, light mobile comparison, light desktop workflow/comparison, and light tablet comparison.
- JavaScript syntax checks: All 81 tracked/unignored JavaScript and MJS files passed `node --check`.
- JSON checks: All 3 tracked/unignored JSON files parsed successfully.
- `git diff --check`: Passed.
- `npm run build:css`: Could not run because the local `tailwindcss` executable is missing (`sh: 1: tailwindcss: not found`). Styles are authored in the already-loaded `css/global.css`; generated CSS was not edited.

## Limitations

- Browser verification used local headless Firefox and Firebase fixtures, not physical devices or production services. The fixture server omits the external Google Font import; production font loading was not verified.
- The full Board/drag browser workflow was not rerun for this landing-only change.
- No push or deployment was performed.
