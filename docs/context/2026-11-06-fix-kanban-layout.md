# Fix Kanban layout clipping and Add Application CTA

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

The new Kanban Board could place status content too close to the sticky Board
toolbar, rely on missing generated utility classes, clip or undersize column
content, render date and platform without visible separation, and show only an
ambiguous plus icon on tablet and desktop. The goal was a focused responsive
correction without changing Kanban behavior or the Add Application flow.

## Changes and resulting behavior

- Added stable Kanban layout styles in `css/global.css` for toolbar layering,
  Board top spacing, horizontal scrolling, readable column widths, natural
  column growth, card visibility, internal card spacing, and focus/shadow room.
- Replaced renderer reliance on missing utility classes for the card list and
  metadata row with focused Kanban classes.
- Rendered date and platform metadata with a visible `·` separator when both
  values exist; each value remains independently optional.
- Kept Add Application icon-only below 640px and exposed its full label from
  640px upward. Added `title` and a correctly capitalized accessible label.
- Preserved existing status movement, shared refresh, search, Board/List/Table
  navigation, ownership/revision checks, typed values, and sync behavior.

## Files affected

- [board/index.html](../../board/index.html) — toolbar hooks, responsive CTA
  label, and Kanban scroll-area hooks.
- [css/global.css](../../css/global.css) — authored responsive Kanban and
  toolbar layout rules.
- [js/main/kanban.js](../../js/main/kanban.js) — card list and metadata
  rendering classes plus metadata separator.
- [test/kanban.test.mjs](../../test/kanban.test.mjs) — metadata and layout
  regression assertions.
- Local-only ignored overview files [docs/features.md](../features.md) and
  [docs/development.md](../development.md) — updated feature and build notes.

## Verification

- Focused Kanban suite: `15 passed, 0 failed`.
- Full `npm test`: `77 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- JSON parsing over tracked JSON files: passed.
- `git diff --check`: passed.
- `npm run build:css`: unavailable with exit `127` because the local
  `tailwindcss` executable is missing; no generated CSS output changed.
- Browser and responsive-width checks were unavailable in this environment.

## Limitations

The visual fix is verified through source assertions and automated rendering
tests, but live browser checks at 390px, 430px, 768px, 1024px, and 1440px were
not available. JUBRO-203 and later Phase 2 work remain unchanged.
