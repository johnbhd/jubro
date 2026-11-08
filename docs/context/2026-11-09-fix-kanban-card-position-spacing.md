# Fix position spacing and layout in Kanban card

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

In the Kanban card, the position text was rendered below a container that included the 44px (2.75rem) drag handle and card menu toggle. Because the drag handle expanded the title row's height, an unnatural vertical gap of approximately 26px separated the company name from the position text. The user requested to fix the position in the Kanban board so it sits directly below the company name with small text and a small gap.

## Changes and resulting behavior

In [`js/main/kanban.js`](../../js/main/kanban.js):
- Reorganized the card header layout:
  - Separated the left information block (`mainInfo`) from the right action controls (`actions`).
  - Grouped the company name and position role together in a dedicated vertical text column (`titleCol`) positioned immediately adjacent to the favicon.
  - Applied `mt-0.5 block truncate text-xs text-gray-500` to the position text (and aligned `kanban-guide-position` in the example card), placing it right below the company name with a tight, natural 2px margin and secondary text size.
  - Moved the drag handle and 3-dots card menu to a dedicated right-aligned flex group (`actions`) with subtle negative margin offsets (`-mr-1.5 -mt-1`), preserving full 44px touch targets without pushing or distorting the vertical text hierarchy.

## Files affected

- [`js/main/kanban.js`](../../js/main/kanban.js): Reorganize header row and adjust position typography and spacing in Kanban cards.
- [`docs/context/2026-11-09-fix-kanban-card-position-spacing.md`](README.md): This change record.

## Verification

- `npm test`: 152 unit tests passed (152 pass, 0 fail).
- `node --experimental-websocket test/statusCustomization.browser.mjs`: Automated Firefox BiDi suite across 6 responsive viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) and 2 themes (light & dark).
- Visual verification: Captured and inspected screenshot confirming tight, clean layout below company name.
- `git diff --check`: Verified zero trailing whitespaces or formatting issues.

## Limitations

None identified.
