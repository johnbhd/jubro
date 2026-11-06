# Fix Kanban dark-mode column visibility

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Kanban status titles used `text-gray-900` while dark columns had no matching
dark-theme override, so labels such as Applied, Interview, Rejected, and No
status could disappear into the Board background. Columns also looked like
floating cards instead of grouped status areas.

## Changes and resulting behavior

- Added semantic Kanban header, title, count, empty-state, and empty-board
  classes.
- Added light-theme column surfaces, borders, header separators, and readable
  title/count colors.
- Added dark-theme column surfaces with readable light title/count/empty-state
  colors and a visible header separator.
- Removed the restrictive column max-width so columns use available wide-screen
  space while retaining their minimum width and horizontal mobile scrolling.
- Kept card rendering, status movement, data persistence, Add Application
  appearance, Board/List/Table behavior, and theme switching logic unchanged.

## Files affected

- [css/global.css](../../css/global.css) — Kanban light/dark surfaces, header
  hierarchy, contrast, and responsive column width rules.
- [js/main/kanban.js](../../js/main/kanban.js) — semantic classes for rendered
  Kanban headers and empty states.
- [test/kanban.test.mjs](../../test/kanban.test.mjs) — regression assertions for
  theme-aware header and grouping styles.
- Local-only ignored [docs/features.md](../features.md) and
  [docs/development.md](../development.md) — updated Kanban and verification
  notes.

## Verification

- Focused Kanban suite: `16 passed, 0 failed`.
- Full `npm test`: `78 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- JSON parsing over tracked JSON files: passed.
- `git diff --check`: passed.
- Firefox headless local CSS fixtures: dark and light at 1440px; dark at 390px,
  430px, 768px, 1024px, and 1920px. Headers, counts, column grouping,
  multi-card columns, metadata spacing, and horizontal mobile scrolling were
  visually checked.
- `npm run build:css`: unavailable with exit `127` because the local
  `tailwindcss` executable is missing. The fix is authored in `css/global.css`,
  which the Board loads directly.

## Limitations

The populated visual browser checks used a temporary local fixture with the
real project CSS, not live authenticated Firebase data. Live production
browser behavior and deployed asset caching were not checked. Add Application
workflow behavior remains deferred to JUBRO-203.
