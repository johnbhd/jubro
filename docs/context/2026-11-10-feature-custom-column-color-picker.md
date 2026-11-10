# Centered column-color palette with a native Custom Color picker

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: feature

## Problem or goal

The Change Column Color dialog used five fixed-width grid tracks, leaving the palette clustered toward the left. Users could choose presets but could not save custom colors through the Board, despite existing color rendering and import validation already accepting safe six-digit hex values.

The requested outcome was a centered full-content-width 5×2 palette, with nine presets and a final rainbow Custom Color slot, preserving modal copy, padding, actions, pending selection, and canonical persistence.

## Changes and resulting behavior

- Five equal flexible tracks distribute the existing 44px circles across the full modal content width. The two rows align and retain normal modal padding and right-aligned Cancel/Save.
- Blue, Green, Yellow, Orange, Red, Purple, Pink, Cyan, and Indigo remain preset choices. A CSS conic-gradient Custom Color button replaces only the final slate/gray UI slot. The global palette still includes slate, so existing metadata and deterministic fallback colors are unchanged.
- The final button has a title, accessible name, real button semantics, visible focus, and the same pressed/checkmark/ring treatment as presets. It triggers a hidden native color input without a new dependency.
- Native input/change events update only pending dialog state. Save uses the existing Status option mutation; Cancel, opening, and pending changes do not save. Existing slate and hex colors are preserved when saved unchanged.
- `isStatusColorValue()` centralizes the already-supported key/six-digit-hex validation across mutations, import normalization, and shared rendering. Unknown keys, arbitrary CSS, short hex, and alpha hex remain rejected. No schema, storage-key, ownership, or sync architecture migration was introduced.
- Custom color is saved in the existing option `color` property. Column border, header tint, dot, card accent, and other shared option consumers use the same helper as presets.
- The "No status" column can choose a custom color through the same modal, but retains its existing explicit session-only behavior. Blank application statuses and stored workspace data remain unchanged.
- No unrelated card, toolbar, navigation, account, or application behavior changed. No dependencies were added.

## Files affected

- `js/main/statusSettings.js`: Nine presets plus native Custom Color control, pending state, preserved initial values, shared validation.
- `js/services/statusColors.js`: Shared safe color-value predicate and existing rendering resolution.
- `js/services/trackerData.js`: Reuse shared validation without broadening accepted import formats.
- `js/main/kanban.js`: Resolve session-only No status colors through the shared helper instead of a key-only lookup.
- `css/global.css`: Equal full-width palette tracks, trusted rainbow gradient, and hidden native-input styling.
- `test/statusCustomization.test.mjs`: Three new focused tests; expanded backup and real Storage/Firebase-fixture integration checks.
- `test/colorDialog.browser.mjs`: Focused real-DOM palette, pending/Cancel, preset/custom save, reload, fallback, and responsive checks.
- `test/statusCustomization.browser.mjs`: Focused color-dialog mode.
- `docs/features.md`, `docs/data-and-auth.md`, `docs/architecture.md`, and `docs/development.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-feature-custom-column-color-picker.md`: This tracked record.

## Verification

- Test-first: custom save, unchanged custom save, and the expanded account sync integration failed before implementation because the Board mutation rejected hex values.
- `npm test`: 191 passed, 0 failed. New coverage includes custom mutation/round-trip presentation, invalid custom values/fallbacks, and unchanged custom saves. Full-backup tests preserve preset keys and custom hex. The real account fixture verifies four customization actions produce four revision increments and four logical uploads, each with two compatibility-document writes.
- `JUBRO_COLOR_ONLY=1 node test/statusCustomization.browser.mjs`: Passed with zero JavaScript errors. Verified preset/custom Save, input/change pending state, Cancel without stored changes, one revision per saved change, shared column/dot/header/card styling, reload persistence, unchanged slate save, and session-only blank-status color behavior.
- Responsive matrix: dark/light at 390, 430, 768, 1024, 1440, and 1920px. Confirmed ten 44px circles in two aligned rows, equal centered distribution across full content width, final rainbow slot, selected custom semantics/checkmark, unchanged copy, right-aligned footer, and no modal overflow. Existing landing regressions also passed.
- Final focused artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-5ejX08`. Visually inspected dark/390px and light/1440px modal captures from the preceding successful run (`/data/data/com.termux/files/usr/tmp/jubro-status-browser-mX3z7f`); production UI styling was unchanged between these runs.
- JavaScript syntax: All 84 tracked/unignored JS/MJS files passed `node --check`; the final browser helper was also checked after removing temporary diagnostics.
- JSON: All 3 tracked/unignored JSON files parsed successfully.
- `git diff --check`: Passed.

## Limitations

- Native OS color-picker interaction was not manually exercised. The headless test verifies the focusable button and native-input click boundary using a stub, then dispatches real DOM input/change events. Automated keyboard-action probes did not trigger native button activation, including on an independent unmodified button; this headless-runner behavior was not worked around in production code. Physical Enter/Space activation and OS-picker interaction remain device checks, not claimed passes.
- Browser verification used local Firefox and Firebase fixtures, not physical devices, production accounts, other engines, or deployed Firebase rules. The broader browser suite was not rerun; its separately documented Custom Fields click-workflow assertion remains outside this feature.
- The "No status" column color remains session-only by existing policy. No new fallback persistence model was added.
- Tailwind generation was not rerun because the local CLI is unavailable; authored global styles were verified directly in Firefox.
- No push or deployment was performed.
