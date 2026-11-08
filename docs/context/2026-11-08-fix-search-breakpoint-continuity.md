# Preserve active Search across toolbar breakpoints

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: fix

## Problem or goal

Final acceptance probing found that a user interacting with inline desktop Search could lose the input and focus when the viewport narrowed. Desktop visibility alone had not marked the temporary search panel open.

## Changes and resulting behavior

- Focus or pointer interaction within the shared search panel marks it open and updates the mobile trigger's expanded state. Narrowing the viewport retains that active panel instead of hiding the focused input.
- Closing still explicitly clears the open state, preserves the query/sort, and restores mobile trigger focus. This is UI state only: no data writes, revisions, or synchronization.
- The same native controls and existing responsive styles are reused. No resize listener, duplicate input, new persisted preference, or dependency was added.

## Files affected

- `js/main/trackerEvents.js`: retain active search-panel intent on focus/pointer interaction.
- `test/statusCustomization.browser.mjs`: trusted mouse focus followed by desktop/mobile resizes, query/focus/expanded-state assertions, and zero revision checks.
- This record and the ignored local execution ledger.

## Verification

- Trusted mouse focus followed by 1440px to 390px resizing failed before the interaction handler: the input became zero-width, focus moved to the body, and the expanded state stayed false.
- The focused Firefox/BiDi suite passed after the fix, including repeated mobile/desktop/mobile resizing, all six standard widths in both themes, and scrolled public-navigation geometry. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-kXRyTX/`.
- Initial programmatic-focus probes were insufficient because this headless context reported no document focus. The final regression uses actual browser-generated pointer actions rather than dispatching a synthetic focus event.
- Final full browser regression passed after the fix (`jubro-status-browser-6SP22J`), including prior status/drag/management/import cases. `npm test`: 149 passed, zero failed. JavaScript syntax, JSON parsing, and diff checks passed. The expanded 390px Search screenshot was inspected.

## Limitations

Browser-generated mouse input is not physical-device verification. Live Firebase and deployed behavior remain unverified. No persistence architecture changed and nothing was pushed.
