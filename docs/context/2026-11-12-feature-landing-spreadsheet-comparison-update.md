# Update "How Jubro Works" and Spreadsheet Comparison Section

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

Following the structural concept in `Spreadsheet to Jubro_ A Clearer Job Search.png`, the landing page needed further refinement across two key narrative sections:
1. "How Jubro Works" (`#how-it-works`): refine arrow styling to use thin, soft Jubro blue accents.
2. "Your Job Search Shouldn't Feel Like a Spreadsheet" (`#why-jubro`): establish a clearer structural comparison between "The Old Way" and "The Jubro Way" without generic SaaS fluff, large AI-style decorative gradient waves, or floating decorative spreadsheet graphics. Specifically:
   - Add a subtle, restrained top separator between sections.
   - Refine the heading to feature a subtle soft-blue underlined accent on "Spreadsheet".
   - Update the supporting copy to two clear, punchy sentences.
   - Update the "Old Way" card with 5 quiet friction points and no icons.
   - Update the "Jubro Way" card with the authentic small Jubro logo beside the title, 5 solution points with small checkmarks and medium-weight key phrases, and a subtle soft-blue border and surface tint.

## Changes and resulting behavior

1. **How Jubro Works Arrow Refinement (`index.html`, `css/global.css`)**:
   - Styled `.landing-flow-arrow` with soft Jubro blue (`#3b82f6` with 0.65 opacity in light mode, `#60a5fa` with 0.65 opacity in dark mode).
   - Removed inline text color utility classes from HTML in favor of scoped CSS declarations.

2. **Spreadsheet Comparison Header & Intro (`index.html`, `css/global.css`)**:
   - Added `.landing-comparison-separator` with a subtle centered gradient line (`.landing-comparison-separator-line`) marking the transition into the section without dramatic gradient waves.
   - Styled the heading with `.landing-spreadsheet-accent` (`#2563eb` light, `#60a5fa` dark) with a clean 2px underline offset by 6px.
   - Formatted the supporting copy as two concise paragraphs:
     - *"Spreadsheets can store applications, but they don't give you a clear view of your progress or what to do next."*
     - *"Jubro turns it into a visual, easy-to-manage pipeline."*

3. **Comparison Cards Architecture (`index.html`, `css/global.css`)**:
   - **Old Way Card**:
     - Retains label `THE OLD WAY` and title `Spreadsheets & Notes`.
     - 5 quiet text list points: `Manual lists and updates`, `Scattered job links`, `Hard to see overall progress`, `Easy to forget next steps`, and `Requires setup and maintenance`.
     - No repeated X icons or noisy decorative assets.
   - **Jubro Way Card**:
     - Retains label `THE JUBRO WAY`.
     - Places the authentic Jubro logo (`/img/jubro.png`, 24x24px, rounded) directly beside the `Jubro` title in `.landing-comparison-title-row`.
     - 5 benefit items with small decorative checkmarks (`fa-check`, 12px) and medium-weight primary phrases:
       - `Visual job-search pipeline (Board)`
       - `Clear application stages (Applied, Interview, Offer, etc.)`
       - `Next Action to know what to do next`
       - `Save job links and key details in one place`
       - `Start tracking immediately (no account required)`
     - Styled `.landing-comparison-jubro` with a subtle soft blue border (`#bfdbfe` light, `rgb(96 165 250 / 0.4)` dark) and surface tint (`#f8faff` light, `#132238` dark) for hierarchy without neon glow.
   - **Layout**:
     - On desktop/tablet (`>= 768px`), two equal-width, equal-height columns (`grid-auto-rows: 1fr`).
     - On mobile (`< 768px`), clean vertical stacking with 20px gap and balanced card sizing.

4. **Tests & Local Documentation**:
   - Added a dedicated unit test suite for the comparison section in `test/landingFlow.test.mjs`.
   - Updated `test/statusCustomization.browser.mjs` to check desktop/tablet equal heights alongside balanced mobile vertical stacking.
   - Updated `docs/features.md` to reflect the updated transition, logo row, and comparison card styling.

## Files affected

- `index.html`: Added comparison separator, heading accent, updated copy, logo in Jubro title row, and updated 5-point comparison lists.
- `css/global.css`: Added styles for flow arrow color, section separator, heading accent, comparison title row with logo, and Jubro card blue accent border/surface.
- `test/landingFlow.test.mjs`: Added tests verifying comparison heading, copy, Old Way points, Jubro logo, and Jubro Way points.
- `test/statusCustomization.browser.mjs`: Updated browser assertions for comparison card dimensions and responsive behavior.
- `docs/features.md`: Updated local feature documentation (local-only, not committed).
- `docs/context/2026-11-12-feature-landing-spreadsheet-comparison-update.md`: This context record.

## Verification

- `node --import ./test/register-loader.mjs --test test/landingFlow.test.mjs`: Passed (2/2 tests).
- `JUBRO_LANDING_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across dark and light themes at all 6 viewports (390, 430, 768, 1024, 1440, 1920) with 0 errors.
- `npm test`: Full test suite passed (216/216 tests).
- Visual artifacts captured and inspected:
  - `dark-1440-why-jubro.png`
  - `light-1440-why-jubro.png`
  - `dark-390-why-jubro.png`
  - `light-390-why-jubro.png`
  - `dark-1440-how-it-works.png`
  - `light-1440-how-it-works.png`

## Limitations

None identified.
