# Polish Comparison Table, FAQ Chevron Cards, and Kanban Card Pill Gap

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

1. **Spreadsheets vs. Jubro Comparison Table**:
   - The comparison table previously had cramped spacing and lacked visual polish; icons were too close to the text, column headers lacked clear badges, and vertical breathing room was insufficient.
2. **FAQ Accordion Cards and Icons**:
   - The FAQ items were combined in a single divided block with generic plus (`+`) icons rather than modern dropdown chevrons (`fa-chevron-down`). Each FAQ item needed to be a distinct, well-padded card with smooth icon rotation when expanded.
3. **Kanban Card Pill Spacing**:
   - The Employment Type and Work Setup pills on Kanban cards were touching the date/platform metadata row above them because `mt-2.5` was absent from precompiled Tailwind rules, leaving no top margin.

## Changes and resulting behavior

1. **Comparison Table UI & Spacing Overhaul**:
   - Upgraded container to `rounded-2xl sm:rounded-3xl` with generous internal padding (`px-5 py-4 sm:px-8 sm:py-5`).
   - Added distinct uppercase badge headers with icons: `Spreadsheets / Notes` with document icon (`fa-regular fa-file-lines`) and `Jubro` with board columns icon (`fa-solid fa-table-columns`).
   - Framed comparison item indicators inside clean 24px circular badges (`h-6 w-6 rounded-full`):
     - Soft muted gray circle with `fa-solid fa-xmark` for spreadsheets.
     - Soft blue circle with `fa-solid fa-check` for Jubro.
   - Added generous row padding (`py-4 sm:py-5`) with comfortable `gap-3 sm:gap-4` between icons and labels, ensuring clean reading flow without text crowding on both mobile (390px) and desktop (1440px).

2. **FAQ Accordion Cards & Arrow Down Transformation**:
   - Converted the FAQ accordion into individual, self-contained cards (`rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70`) spaced with `space-y-3.5`.
   - Replaced plus icons with an arrow down / chevron down (`fa-solid fa-chevron-down`).
   - Added smooth 200ms chevron rotation (`rotate(180deg)`) via CSS and JS when expanded (`[aria-expanded="true"]`).
   - Enclosed the chevron inside a rounded badge (`h-8 w-8 rounded-xl`) that transitions to a subtle Jubro blue accent when expanded.
   - Separated the expanded answer text with a subtle top border (`border-t border-gray-100 dark:border-slate-800/60`) and generous internal padding.

3. **Kanban Card Pill Top Margin Gap**:
   - Added explicit `.kanban-card-pills { margin-top: 12px; }` in [`css/global.css`](../../css/global.css) and updated [`js/main/kanban.js`](../../js/main/kanban.js) to ensure an explicit 12px gap above Employment Type and Work Setup pills, providing clear separation from the date/platform row.

## Files affected

- `index.html`: Refined comparison table markup with badge headers and circular indicator badges; restructured FAQ into individual cards with chevron down toggles.
- `css/global.css`: Added explicit `.kanban-card-pills { margin-top: 12px; }`, FAQ chevron rotation and badge accent styles, and comparison table spacing rules.
- `js/main.js`: Updated `setupFaqAccordion()` to handle chevron rotation toggling.
- `js/main/kanban.js`: Applied `mt-3` to `.kanban-card-pills`.
- `docs/context/2026-11-10-fix-landing-table-faq-and-kanban-pill-gap.md`: This change record.

## Verification

- **Unit tests**: Ran `npm test` — all 188 unit tests passed.
- **Browser tests**: Ran `node --experimental-websocket test/statusCustomization.browser.mjs` — passed all tests across all 6 viewports with zero errors.
- **BiDi screenshot verification**:
  - Captured full-page light and dark mode screenshots (`landing-light-1440-full.png`, `landing-dark-1440-full.png`, `landing-light-390-full.png`, `landing-dark-390-full.png`) and verified comparison table spacing and individual FAQ chevron cards.
  - Captured board card screenshots (`kanban-card-pill-gap-light.png`, `kanban-card-pill-gap-dark.png`) confirming computed 12px `marginTop` above Kanban card pills.

## Limitations

- None identified.
