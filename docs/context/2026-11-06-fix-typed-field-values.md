# Preserve canonical field value types

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

List editing used generic `input.value` extraction for every control. Checkbox values could therefore change from Boolean `true`/`false` to strings such as `"true"` or `"on"` after editing and reload.

## Changes and resulting behavior

Field values now pass through a shared type-aware normalization boundary. Checkbox editors read `input.checked` and persist Booleans. Blank checkbox cells become `false`. Text, select, and date values remain strings, while strict import validation accepts only valid type-compatible values. Existing object and primitive legacy checkbox strings are normalized by checkbox column type only; text fields containing the same words remain text. Cloud-loaded state passes through the same legacy normalization before sync.

## Files affected

- `js/services/trackerData.js`: canonical field types, normalization, strict typed import validation, and legacy checkbox migration.
- `js/main/listView/editModal.js`: type-aware editor controls and save extraction.
- `js/main/table.js`: shared type-aware table save path.
- `js/main/trackerTableActions.js`: typed empty cells for new rows.
- `js/storage/storage.js`: normalize known legacy local values on read.
- `js/storage/firebaseTrackerSync.js`: normalize known legacy cloud values at parse boundary.
- `test/listEditStale.test.mjs`, `test/storage.test.mjs`, `test/firebaseTrackerSync.test.mjs`, and `test/trackerData.test.mjs`: Boolean and legacy regression coverage.
- `docs/architecture.md`, `docs/features.md`, `docs/data-and-auth.md`, and `docs/development.md`: local-only overview updates.

## Verification

- `npm test`: 33 passed, 0 failed.
- `rg --files -g '*.js' -g '*.mjs' | xargs -r -n1 node --check`: passed.
- JSON parsing check for `package.json`, `package-lock.json`, and `vercel.json`: passed.
- `git diff --check`: passed.
- Tests cover List checkbox extraction, Table normalization path, local storage reload, Firestore parser normalization, primitive/object legacy checkbox values, text preservation, date validation, and typed empty import cells.

## Limitations

Unknown malformed legacy values are preserved conservatively instead of guessed. Firestore revision enforcement across multiple devices remains outside this cycle; JUBRO-003 only rejects stale same-browser local saves.
