# Refine Board and List light-mode surface hierarchy

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

Board and List used a gray-100 page with white headers, sidebar, cards, and nested controls. The layers lacked separation. Refine light surfaces without changing workspace layout, data, or dark styling.

## Changes and resulting behavior

- Existing theme architecture remains Tailwind utilities plus authored CSS and a root `.dark` class. New semantic variables exist only on `html:not(.dark) #appBody`; they do not alter landing, public pages, or dark tokens.
- App background changes from Tailwind gray-100 (approximately #F3F4F6) to #EEF1F5. Header, toolbar, and List sidebar use #F8F9FB. Nested surfaces use #F4F6F8. White remains appropriate for application cards, menus, and modal surfaces.
- Neutral default borders use #D9DEE7; nested borders use #E3E7ED. Header/toolbar shadow boundaries avoid changing control geometry. Cards use a 1px/2px low-opacity neutral shadow, not heavy elevation.
- Kanban bodies mix 4% of the existing trusted status accent into the off-white surface. Headers mix 10%. Status names, counts, dots, top borders, and card left accents remain intact. Empty column boxes use translucent white, a quiet dashed border, and secondary text.
- Add/Edit controls, Custom Fields rows/controls, List search, card status selects, and secondary actions use quieter surfaces and visible borders. Focus uses a small blue outline. Placeholder text uses #667085 rather than the suggested lower-contrast muted gray.
- List canvas remains transparent over the gray page. Rows remain white. Unselected filter pills are white with visible borders; selected pills use deep navy and white text. Count badges use pale semantic colors with dark text.
- Status badges expose their existing color through a DOM-only custom property. Light CSS derives pale backgrounds/dark semantic text. Existing inline colors continue to control dark badges. Platform/favicons are unchanged.
- Dashboard modal framing is off-white with white metric/chart cards. Metric text is deep navy for readability; existing semantic borders remain. Elevated Custom Fields and Add/Edit modal shells remain white with off-white nested rows/controls. Account/settings and other menus remain white, neutrally bordered, and lightly shadowed.
- No workspace creation, auth, storage, revision, sync, filtering, sorting, favicon, drag/drop, or application behavior was changed. No dependencies were added.

## Files affected

Modified:

- `css/global.css`: scoped light tokens and role-based surfaces.
- `js/main/listView/badges.js`: presentation-only status badge class/accent property.
- `test/favicon.test.mjs`: fake style API and status presentation regression.
- `test/statusCustomization.browser.mjs`: optional surface verification entry using the existing Firefox/Firebase-fixture harness.

Created:

- `test/workspaceSurfaces.browser.mjs`: responsive theme, contrast, modal, and unchanged-data checks; optional dark-baseline comparison.
- This context record.

Inspected but not modified: `board/index.html`, `js/services/statusColors.js`, `js/main/kanban.js`, `js/main/listView/render.js`, `js/main/listView/filters.js`, `js/main/listView/settings.js`, `js/main/listView/editModal.js`, `js/main/applicationForm.js`, `js/main/trackerDashboard.js`, `js/main/dashboardCharts.js`, and relevant local architecture/development/features documentation.

Updated local-only, Git-ignored overviews: `docs/features.md` and `docs/development.md`.

## Verification

- Before implementation, the new light workspace background assertion failed against the original gray-100 computed color. Dark computed surfaces and dimensions were captured before implementation.
- `npm test`: 154 passed, 0 failed. Existing status, ordering, gesture, isolation, import, revision, and sync coverage remains green.
- `JUBRO_SURFACES_ONLY=1 JUBRO_DARK_BASELINE=/data/data/com.termux/files/usr/tmp/jubro-status-browser-CpLKVU/dark-surfaces.json node test/statusCustomization.browser.mjs`: passed with no JavaScript errors. This mode runs focused workspace surfaces plus landing regressions, not the complete Board workflow suite.
- Browser matrix: Board, List, Dashboard, Custom Fields, Add, and Edit in both themes at 390, 430, 768, 1024, 1440, and 1920px. Modal panels fit horizontally; Board/List have no page overflow. Canonical stored workspace JSON remains unchanged throughout the surface/modal checks.
- Dark computed backgrounds, text colors, borders, shadows, and dimensions match pre-change snapshots across all six widths for the sampled Board/List components and modal shells.
- Targeted light text contrast checks meet 4.5:1 for Board headings/card secondary text, selected filters, status badges, and List placeholders. This is not a full accessibility audit or a claim that subtle decorative borders meet text contrast requirements.
- Inspected light screenshots for desktop Board, mobile List, and tablet Custom Fields. Final artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-7oiEfB`.
- JavaScript syntax checks: 71 tracked/new JavaScript and module files passed. Tracked JSON parsing passed. `git diff --check` passed.

## Limitations

No physical-device or production Firebase testing. The full Board browser workflow suite was not repeated; its separately documented Custom Fields toolbar click failure remains outside this theme task. Modal surface tests use direct existing application methods and do not prove that click workflow. Build was not repeated because the local Tailwind CLI is missing; authored CSS requires no regenerated utilities. No push performed.
