# Compact Next Action with a right-aligned date pill

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

The user clarified that the supplied description, not an attached image, defines the desired Board-card Next Action presentation: a left task/calendar icon, small blue Next Action label, saved action text, and a dark calendar date pill at the far right without a blue circular completion button or empty button slot.

The previous renderer stacked a muted label, action, and plain date vertically. It did not contain the completion button referenced in the description. This change implements the described final presentation rather than requiring an image.

## Changes and resulting behavior

- Real Board-card Next Action sections use a compact grid: task/calendar icon at left, blue label above the saved action, and a right-aligned date pill beside the action.
- The date pill contains only a decorative calendar icon and the existing formatted date, such as Nov 12. No completion button, new action, or reserved checkmark space exists.
- Retained the existing section surface, border, padding, action text styling, date formatter, and canonical values. The blue label and dark rounded date surface are scoped to the requested section.
- Shared Board-card rendering keeps the presentation consistent without hard-coding a Google-specific branch. The Google/fafa/Nov 12 combination is test data only; production always reads saved company/action/date values.
- Action-only, date-only, and empty values retain their existing visibility behavior. Long action text can wrap without overlapping the date.
- Other card sections, column styling, toolbar/navigation, List rendering, empty-guide presentation, storage, revisions, and sync logic are unchanged. Dashboard's tablet text from the preceding commit remains intact. No dependencies were added.

## Files affected

- `js/main/kanban.js`: Only real-card Next Action DOM construction changed.
- `css/global.css`: Scoped icon/label/action/date grid and date-pill styling.
- `test/kanbanCardEnrichment.test.mjs`: Extended existing combination coverage with the specified saved values, passive icons, no button, and unchanged canonical data.
- `test/nextAction.browser.mjs`: New focused geometry/theme/read-only checks.
- `test/statusCustomization.browser.mjs`: Focused Next Action mode.
- `docs/features.md` and `docs/development.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-fix-next-action-date-pill.md`: This tracked record.

## Verification

- Extended the unit regression before implementation. It failed because the previous plain date lacked the required calendar pill icon.
- `npm test`: 188 passed, 0 failed. Existing action-only, date-only, and blank-state checks remain green.
- `JUBRO_NEXT_ACTION_ONLY=1 node test/statusCustomization.browser.mjs`: Passed with zero JavaScript errors, dark/light at 390, 430, 768, 1024, 1440, and 1920px. Verified label/action/date values, two decorative icons, no interactive completion control, far-right date alignment, horizontal balance, compact geometry, no section overflow, unchanged card company/position/status, and unchanged stored workspace data. Existing six-width landing regressions also passed.
- Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-T8LylI`. Visually inspected dark/390px and light/1440px screenshots showing fafa and the right-aligned Nov 12 pill.
- JavaScript syntax: All 83 tracked/unignored JS/MJS files passed `node --check`.
- JSON: All 3 tracked/unignored JSON files parsed successfully.
- `git diff --check`: Passed.

## Limitations

- Physical devices, other browser engines, and production Firebase were not tested. The broader entry/drag browser suite was not rerun; its separately documented Custom Fields click-workflow assertion remains outside this presentation change.
- CSS generation was not rerun because the local Tailwind CLI is unavailable; authored global styles were verified directly in Firefox.
- No push or deployment was performed.
