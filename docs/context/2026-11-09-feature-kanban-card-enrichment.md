# Kanban Card Enrichment: Work Setup, Employment Type, Company Link, and Next Action Polish

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: feature

## Problem or goal

While Jubro's data schema recently introduced default fields for `Work Setup` and `Employment Type`, the Kanban application cards did not display these attributes. Job seekers had to open the edit modal to see whether an opportunity was Remote, Hybrid, or On-site, and whether it was Full-time, Internship, or Contract.

Additionally:
1. Company names and favicons on Kanban cards were static non-clickable text, requiring users to open the edit modal or switch to list view to access job posting URLs.
2. The `Next Action` card container had tight internal padding and could benefit from stronger typographic hierarchy between the section label, the action text, and the target date.
3. Card interaction isolation was required so that opening an external job posting would never accidentally initiate card drag-and-drop or trigger application editing.

## Changes and resulting behavior

1. **Employment Type and Work Setup Compact Pills**:
   - Rendered compact visual pills between the application metadata row (`Date · Platform`) and the Next Action container.
   - Strictly ordered as `[💼 Employment Type] [📍 Work Setup]`.
   - Employment Type displays a briefcase icon (`fa-solid fa-briefcase`) with soft navy/slate styling in both light and dark themes.
   - Work Setup displays a location icon (`fa-solid fa-location-dot`) with semantic color coding:
     - `Remote`: soft blue badge (`#f0f9ff` light, `rgba(12, 74, 110, 0.4)` dark).
     - `Hybrid`: soft purple badge (`#faf5ff` light, `rgba(88, 28, 135, 0.4)` dark).
     - `On-site` / `Office`: soft green badge (`#ecfdf5` light, `rgba(6, 78, 59, 0.4)` dark).
     - Other / custom: neutral soft gray badge.
   - Pills wrap smoothly using flexbox (`gap: 1.5`).
   - If either value is empty or unset (`""` or `"-"`), its pill is cleanly omitted. If both are unset, the entire pill container row is omitted.
   - Respects custom field visibility configuration (`isListColumnVisible`).

2. **Clickable Company Favicon & Name**:
   - When a valid HTTP(S) `Job Link` exists, the company favicon and company name are wrapped in a single accessible anchor (`<a>`) linking to the external job URL with `target="_blank"`, `rel="noopener noreferrer"`, and an explicit `aria-label`.
   - On hover, the company name transitions to an accessible primary blue (`#2563eb` light, `#60a5fa` dark) and underlines; on focus-visible, it receives a clear keyboard focus outline.
   - Position remains separate, non-clickable plain text indented beneath the company name (`pl-12`).
   - When the URL is missing, blank, or unsafe (e.g. `javascript:`, `data:`), the company name and favicon render as standard non-clickable `<div>` elements without anchor behavior.

3. **Event Isolation and Drag Safety**:
   - Both `click` and `pointerdown` events on the company anchor call `event.stopPropagation()` to ensure clicking or tapping the link opens the external job posting without triggering card drag initialization or opening card modals.
   - Existing card dragging (drag handle and 300ms touch delay), card click, card 3-dot menu, and inline status select remain completely independent.

4. **Next Action Spacing & Typographic Hierarchy**:
   - Expanded container padding to `12px 14px` (`p-3`).
   - Standardized the uppercase tracking label (`NEXT ACTION`) in muted text (`text-[10px]`).
   - Styled the action text with medium weight (`text-xs font-medium text-gray-800 dark:text-gray-200`) and line-snug text wrapping (`break-words`).
   - Styled the date with clear separation (`text-[11px] font-normal text-gray-500 dark:text-gray-400`).
   - Handles action-only, date-only, and blank states gracefully (blank cards omit the entire container).

5. **Strict Card Information Order**:
   1. Favicon + Company (clickable link if valid HTTP(S) Job Link present)
   2. Position (plain text)
   3. Application Date + Platform (`Date · Platform`)
   4. Employment Type + Work Setup pills (`[💼 Internship] [📍 Remote]`)
   5. Next Action + Next Action Date container
   6. Status select dropdown

6. **Zero Data Mutation**:
   - Presentation-only enhancements with zero stored tracker schema changes, zero revision increments, and zero cloud sync writes.

## Files affected

- `js/main/kanban.js`: Render company link anchor when safe HTTP(S) URL is present, add stopPropagation handlers, render Employment Type and Work Setup pills with icons and visibility checks, and polish Next Action container typography and spacing.
- `css/global.css`: Added styles for `.kanban-card-company-link`, `.kanban-pill`, `.kanban-pill-employment`, `.kanban-pill-remote`, `.kanban-pill-hybrid`, `.kanban-pill-onsite`, `.kanban-pill-worksetup-default`, and `.kanban-card-next-action`.
- `test/kanbanCardEnrichment.test.mjs`: Added comprehensive unit tests covering pill combinations, link protocol security, event propagation safety, and Next Action formatting.
- `docs/features.md`: Updated Kanban Board documentation with card enrichment details.
- `docs/context/2026-11-09-feature-kanban-card-enrichment.md`: This change record.

## Verification

- **Unit tests**: Executed `npm test` across all 188 unit tests, including 6 new tests in `test/kanbanCardEnrichment.test.mjs`; all 188 tests passed.
- **Full browser test suite**: Ran `node --experimental-websocket test/statusCustomization.browser.mjs`; all 6 viewport widths across light and dark themes passed with zero errors (`passed: true`).
- **Visual inspection & artifacts**: Generated BiDi browser screenshots across desktop (1440px), tablet (768px), and mobile (390px) viewports in both light and dark themes (`kanban-card-light-1440.png`, `kanban-card-dark-1440.png`, `kanban-card-light-390.png`, `kanban-card-dark-390.png`). Verified layout balance, pill styling, color coding, link affordance, and typography.

## Limitations

- External job post favicons continue to rely on domain-derived favicon service fallbacks; applications without favicons fall back to standard initial avatar circles or briefcase icons.
