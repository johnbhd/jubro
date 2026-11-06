# Match Add Application button to nav UI

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

The previous Add Application restyle used blue, which did not match the
requested Jubro navigation palette. The controls needed a neutral nav-aligned
surface with white text.

## Changes and resulting behavior

- Replaced blue Add Application styling with a neutral slate surface.
- Kept white text in light and dark themes.
- Kept hover, shadow, focus, sizing, labels, and existing click behavior.
- Applied the same style to Board, List, and empty-board Add Application
  controls.

## Files affected

- [board/index.html](../../board/index.html) — neutral focus treatment for the
  Board Add Application control and shared class on the List control.
- [js/main/kanban.js](../../js/main/kanban.js) — shared class on the empty-board
  action.
- [css/global.css](../../css/global.css) — neutral light/dark palette and hover
  states.
- Local-only ignored [docs/features.md](../features.md) — corrected the local
  feature description from blue to neutral styling.

## Verification

- Full `npm test`: `79 passed, 0 failed`.
- `node --check` over tracked JavaScript/MJS files: passed.
- `git diff --check`: passed.
- Browser visual verification was not performed for this correction.

## Limitations

Live browser theme rendering was not checked. No Add Application behavior,
storage, schema, or sync logic changed.
