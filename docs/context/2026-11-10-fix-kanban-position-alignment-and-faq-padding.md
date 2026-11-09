# Fix Kanban Position Alignment, Date/Pills Gap, and FAQ Vertical Gap & Padding

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

1. **Kanban Card Position Title Placement**:
   - The Position text on Kanban application cards was flush with the left boundary of the card, rendering directly beneath the 36px favicon rather than beneath the Company Name text. This occurred because a Tailwind utility class (`pl-12`) was previously assigned in JavaScript, but `pl-12` is not compiled in the static Tailwind stylesheet, leaving the position element with zero left indentation.
2. **Kanban Card Vertical Rhythm and Gaps**:
   - The Date & Platform metadata row had no top margin because `mt-2.5` was similarly not in the static Tailwind build.
   - The vertical gap between Position and Date/Platform, as well as between Date/Platform and Employment/Work Setup pills, lacked explicit spacing.
   - The horizontal gap between the Employment Type and Work Setup pills was too narrow.
3. **Landing Page FAQ Vertical Gap & Answer Bottom Padding**:
   - The FAQ accordion cards on the homepage were touching each other vertically without a distinct gap because the container previously used `space-y-3.5`, which is not defined in Tailwind.
   - The accordion answer container had insufficient bottom padding (`pb-5`, which also was not in the compiled Tailwind build), making the expanded answer text crowd against the bottom border of each card.

## Changes and resulting behavior

1. **Kanban Card Header Grid Alignment**:
   - Configured `.kanban-card-header-main` in [`css/global.css`](../../css/global.css) as a two-column CSS Grid (`grid-template-columns: auto 1fr; column-gap: 12px; align-items: center;`).
   - Gave `.kanban-card-company-link` and `.kanban-card-company-header` `display: contents;` so their children become direct grid items.
   - Placed the favicon at `grid-column: 1; grid-row: 1 / span 2; align-self: center;`.
   - Placed `.kanban-card-company-name` at `grid-column: 2; grid-row: 1;`.
   - Placed `.kanban-card-position` at `grid-column: 2; grid-row: 2; margin-top: 2px;` and removed the ineffective `pl-12` class in [`js/main/kanban.js`](../../js/main/kanban.js).
   - Position now aligns to the exact pixel beneath Company Name beside the favicon box. When a valid HTTP(S) job link exists, the anchor wraps only the favicon and company name; clicking Position does not activate the link, preserving strict DOM isolation.
2. **Kanban Card Spacing & Pill Gap**:
   - Added explicit `.kanban-card-meta { margin-top: 10px; column-gap: 0.5rem; }` in [`css/global.css`](../../css/global.css), guaranteeing a 10px gap between Position and Date/Platform metadata.
   - Added explicit `gap: 8px;` to `.kanban-card-pills` alongside the preserved `margin-top: 12px;`, providing clear vertical separation from metadata and balanced horizontal spacing between pills.
3. **Landing Page FAQ Spacing & Padding**:
   - Updated the FAQ container in [`index.html`](../../index.html) to `faq-list mt-10 space-y-4 sm:space-y-5`.
   - Added scoped CSS rules for `#homeBody .faq-item + .faq-item` (`margin-top: 1rem;` on mobile, `margin-top: 1.25rem;` on desktop), ensuring a clean 16px–20px vertical gap between FAQ cards.
   - Updated each FAQ answer container to use compiled utility classes `pb-8 pt-3` and added scoped rules for `#homeBody [data-faq-content]` (`padding-top: 0.875rem; padding-bottom: 1.75rem;` on mobile, `padding-bottom: 2rem;` on desktop), providing generous 28px–32px bottom padding when expanded.

## Files affected

- `js/main/kanban.js`: Applied `.kanban-card-header-main` class to header container, `.kanban-card-company-header` to fallback container, removed `pl-12` from `positionEl`, and set `gap-2` on pills.
- `css/global.css`: Added CSS Grid layout for card header (`.kanban-card-header-main`, `display: contents` for company link/header, grid placement for favicon, company name, and position); added `.kanban-card-meta` top margin and column gap; added `.kanban-card-pills` gap; added FAQ vertical margin and answer bottom padding.
- `index.html`: Updated FAQ list spacing classes and answer padding classes.
- `docs/features.md`: Documented card header grid alignment, metadata top margin, pill gaps, and FAQ card separation and expanded answer padding.
- `docs/context/2026-11-10-fix-kanban-position-alignment-and-faq-padding.md`: This change record.

## Verification

- **Unit tests**: Ran `npm test` — all 188 unit tests passed with 0 failures.
- **Headless browser layout tests & BiDi automation**:
  - Verified FAQ vertical gap is computed as 20px on desktop and >= 16px on mobile.
  - Verified FAQ expanded answer padding bottom is computed as 32px on desktop and >= 28px on mobile.
  - Verified Kanban card alignment: `companyLeft === positionLeft` (exact pixel match at 97px).
  - Verified Kanban card `metaMarginTop === '10px'`.
  - Verified Kanban card `pillMargin === '12px'`.
- **Screenshot artifacts**:
  - Inspected `kanban-card-pill-gap-light.png` and `kanban-card-pill-gap-dark.png`: Position renders neatly indented beneath Company Name, separated cleanly from Date/Platform and Employment/Work Setup pills.
  - Inspected `landing-light-1440-full.png` and `landing-dark-1440-full.png`: FAQ items display comfortable 20px card spacing with distinct borders.

## Limitations

- None identified.
