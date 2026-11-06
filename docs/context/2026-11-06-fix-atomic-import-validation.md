# Validate imports before replacing workspace data

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Import parsing previously accepted incomplete structures and could mutate application state before the full payload was known to be valid. Full backups also did not enforce their own marker and version.

## Changes and resulting behavior

Single-tracker and full-backup imports now parse, validate, and normalize the complete payload before any workspace replacement. Full backups require `app: "Jubro"` and `version: 1`. Validators check tracker, column, option, row, cell, active-reference, and supported-type shapes. Short rows receive typed empty cells; extra cells, malformed structures, unsupported types, invalid dates, and invalid checkbox values fail before mutation. Duplicate tracker IDs receive `_2`, `_3`, and later suffixes. Imported ownership and revision fields are ignored; the current `Storage` workspace assigns ownership and revision. File-picker cancellation resolves cleanly.

## Files affected

- `js/services/trackerData.js`: shared strict import validators and normalization.
- `js/services/jsonService.js`: parser methods, user-safe errors, and cancel-safe file selection.
- `js/main/trackerEvents.js`: confirmed atomic single-tracker replacement with stale-save protection.
- `js/auth/auth.js`: user-safe full-backup validation errors.
- `test/jsonService.test.mjs`: JSON parsing and version-error coverage.
- `test/trackerData.test.mjs`: schema, typed-value, duplicate-ID, ownership, and version coverage.
- `docs/features.md`, `docs/data-and-auth.md`, and `docs/development.md`: local-only format and verification updates.

## Verification

- `npm test`: 33 passed, 0 failed.
- `rg --files -g '*.js' -g '*.mjs' | xargs -r -n1 node --check`: passed.
- JSON parsing check for `package.json`, `package-lock.json`, and `vercel.json`: passed.
- `git diff --check`: passed.
- Parser tests cover valid single/full formats, malformed JSON, missing markers, unknown versions, invalid rows, typed cells, duplicate IDs, and foreign ownership metadata.
- Single import handler uses `Storage.replace` with the loaded revision and does not assign the new state until replacement succeeds.

## Limitations

End-to-end file-picker interaction and real cloud backup replacement were not run because Firebase CDN access timed out. Full backup replacement remains destructive after explicit confirmation, by existing product design.
