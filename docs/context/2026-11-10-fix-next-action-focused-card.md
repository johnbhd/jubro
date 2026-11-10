# Refine Next Action into a focused three-part card

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

The preceding Next Action presentation already had a blue label and right-aligned date, but its left icon was unboxed, the date aligned to the action row rather than the full content block, and light mode reused a dark pill. The requested refinement was a softly outlined action card with an icon box, grouped label/action, and centered right-hand date, without any check/completion control.

## Changes and resulting behavior

- The section now has exactly three parts when both values exist: a 28px outlined calendar-icon box, label/action content, and a compact date pill. There is no fourth control or checkmark icon.
- The title-case blue label is smaller and lighter-weight than the primary action text. The calendar and date icons remain decorative and use the installed Font Awesome assets.
- The date pill is centered beside the content and stays right-aligned. A wrapping flex layout and safely wrapping action text prevent overflow when space is limited.
- Dark mode uses a restrained navy surface with soft blue border and dark bordered date pill. Light mode uses an off-white surface, pale blue outline, and neutral gray pill. Existing 12px–14px padding is retained; no glow or shadow was added.
- Empty, action-only, and date-only visibility behavior remains unchanged. Saved action/date values, date formatting, fields, schema, storage, revisions, and synchronization are unchanged. No completion event or state was added.
- Only real-card Next Action construction and scoped styles changed. Company/favicon, position, metadata, employment/work-setup pills, drag handle, menu, Status select, status accent, toolbar, List, and instructional guide remain unchanged. No dependencies were added.

## Files affected

- `js/main/kanban.js`: Icon box and grouped content within the existing Next Action rendering block.
- `css/global.css`: Scoped three-part layout, hierarchy, blue outline, icon box, and theme-specific date surfaces.
- `test/kanbanCardEnrichment.test.mjs`: Icon-box/content structure and full long-action text assertions alongside existing visibility and read-only tests.
- `test/nextAction.browser.mjs`: Five fixture cases, vertical centering, icon-box geometry, theme surfaces, outline/no-shadow, hierarchy, wrapping and overflow checks.
- `docs/features.md` and `docs/development.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-fix-next-action-focused-card.md`: This tracked record.

## Verification

- The extended unit regression failed before implementation because the previous task icon lacked its outlined box.
- `npm test`: 188 passed, 0 failed. Action/date, action-only, date-only, neither, and long-action cases are covered.
- `JUBRO_NEXT_ACTION_ONLY=1 node test/statusCustomization.browser.mjs`: Passed with zero JavaScript errors, dark/light at 390, 430, 768, 1024, 1440, and 1920px. Tests cover the three-part structure, square outlined icon box, centered/right-aligned date, title-case hierarchy, theme-specific pill, blue border without shadow, compact short content, wrapping long content, no interactive completion control, unchanged company/position/status, and unchanged stored workspace data. Existing landing regressions also passed.
- Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-UA1l4Z`. Visually inspected dark/390px and light/1440px screenshots, including the action-only card.
- JavaScript syntax: All 83 tracked/unignored JS/MJS files passed `node --check`.
- JSON: All 3 tracked/unignored JSON files parsed successfully.
- `git diff --check`: Passed.

## Limitations

- Physical devices, other browser engines, production Firebase, and the full drag/entry browser workflows were not tested. The previously documented Custom Fields click-workflow assertion remains outside this presentation task.
- Tailwind generation was not rerun because the local CLI is unavailable. Authored global styles were verified directly in Firefox.
- No push or deployment was performed.
