# Erase manual drag reorder hint text in list view

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

When the List view sort dropdown was set to "Manual", Jubro displayed a helper message paragraph containing the text:
`Drag applications to reorder this page.`
The user requested to erase only this text to keep the List view clean, without affecting card reordering or other view components.

## Changes and resulting behavior

In [`js/main/listView/render.js`](../../js/main/listView/render.js), updated the hint rendering logic:
- When `this.listSortSelect?.value === 'manual'`, the hint string resolves to `''`.
- Guarded creation and insertion of the `.application-order-hint` DOM element so that empty strings are not rendered or appended to the card container.
- When `date-desc` or `date-asc` sorting is active, the guidance `'Choose Manual to reorder.'` continues to display if appropriate.
- Card drag-and-drop ordering via `createListDrag` remains completely intact and functional.

## Files affected

- [`js/main/listView/render.js`](../../js/main/listView/render.js): Suppress creation of the `.application-order-hint` element when sorting is set to `manual`.
- [`docs/context/2026-11-09-fix-erase-list-drag-reorder-hint.md`](README.md): This change record.

## Verification

- `npm test`: 152 passed, 0 failed.
- `node --experimental-websocket test/statusCustomization.browser.mjs`: Automated Firefox BiDi suite across 6 responsive viewports and 2 themes.
- `git diff --check`: Verified zero trailing whitespaces or formatting issues.

## Limitations

None identified.
