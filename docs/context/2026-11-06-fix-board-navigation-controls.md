# Simplify Board navigation controls

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

The Board toolbar showed Add Application text, kept Table inside the More menu, and forced a white Dashboard menu surface in dark mode. The requested navigation was a compact plus-only Add Application control and one inline Board/List/Table switch while retaining dropdown actions.

## Changes and resulting behavior

- Changed the main Add Application control to a plus-only button with its accessible label and title preserved.
- Added Table to the same flex view switch as Board and List.
- Removed the duplicate Table action from the dropdown.
- Kept Dashboard, Import, and Export dropdown actions.
- Made the Dashboard dropdown button transparent in light and dark themes; normal hover styling remains.
- Removed unused Add Application label styling and the obsolete Table-menu event handler.

## Files affected

- `board/index.html`: updated toolbar controls and dropdown contents.
- `css/global.css`: removed label styling and the forced white Dashboard surface.
- `js/main/trackerEvents.js`: removed the obsolete dropdown Table handler.
- `test/kanban.test.mjs`: verified inline Table navigation, retained dropdown actions, plus-only Add Application, and transparent Dashboard styling.
- Local-only ignored `docs/features.md`: updated Table navigation description.

## Verification

- `npm test`: 78 passed, 0 failed.
- `rg --files -g '*.js' -g '*.mjs' | xargs -r -n1 node --check`: passed.
- `git diff --check`: passed.
- No storage, Firebase, tracker-schema, or persistence behavior changed.
- No browser visual check was performed.

## Limitations

Responsive visual appearance still needs browser confirmation at narrow widths. Dropdown actions remain available, but Table is now accessed from the inline view switch.
