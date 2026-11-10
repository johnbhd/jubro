# Align desktop Search with right-hand toolbar actions

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

The desktop toolbar placed its flexible spacer between Search and the action buttons. This left Search visually isolated near the center instead of grouped with the right-hand controls.

## Changes and resulting behavior

- At 1024px and above, the automatic left margin now belongs to Search instead of the action container. Search + Sort sits directly beside Board/List, Dashboard, Custom Fields, and Add Application.
- Job Search identity stays left-aligned. Existing widths, protected title space, control order, and responsive label rules are unchanged.
- Mobile/tablet temporary Search behavior below 1024px is unchanged. No production JavaScript, data, authentication, or sync logic changed. No dependencies were added.

## Files affected

- `css/global.css`: Desktop-only flex spacer placement.
- `test/toolbarWidth.browser.mjs`: Assert that Search directly precedes the right-hand action group with only the configured toolbar gap.
- `docs/architecture.md` and `docs/features.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-fix-search-right-action-group.md`: This tracked record.

## Verification

- The new browser assertion failed before the CSS change at dark/1280px because Search was separated from the actions.
- `npm test`: 188 passed, 0 failed.
- `JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: Passed with zero JavaScript errors. Toolbar checks cover both themes at 390, 430, 768, 1024, 1280, 1440, and 1920px, including the new desktop adjacency assertion and existing title, dropdown, overflow, Search, and read-only workspace checks. The runner also passed its six-width landing regression matrix.
- Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-hoeWtv`. Visually inspected dark and light 1440px screenshots showing Search joined to the right-hand controls.
- `node --check test/toolbarWidth.browser.mjs`: Passed.
- `git diff --check`: Passed.

## Limitations

- Physical devices and production services were not tested. The broader entry suite was not rerun; its previously documented Custom Fields click-workflow failure remains outside this alignment change.
- Tailwind generation was not rerun because the local CLI is unavailable; the patch uses already-loaded authored CSS.
- No push or deployment was performed.
