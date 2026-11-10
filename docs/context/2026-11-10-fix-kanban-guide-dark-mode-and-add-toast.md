# Fix Kanban empty guide dark mode contrast and add application success toast

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

In Jubro's Kanban Board:
1. When a Job Search had no applications, the instructional example card in the first column rendered "Company Name" with `text-gray-900` without dark-theme styles, causing it to appear black on the dark card background in dark mode. The example card was also missing Employment Type and Work Setup pills and used an unpolished Next Action container lacking dark-mode token support.
2. When a new job application was saved, the notification displayed the default bottom-centered toast rather than the top-right card-styled success toast with a checkmark indicator.

## Changes and resulting behavior

- Updated the Kanban empty pipeline guide card in [`js/main/kanban.js`](../../js/main/kanban.js):
  - Added `dark:text-gray-100` to `.kanban-guide-company` and `.dark .kanban-guide-company { color: #f9fafb !important; }` in [`css/global.css`](../../css/global.css) so "Company Name" displays in crisp white in dark mode.
  - Added theme-adaptive muted styles for `.kanban-guide-position`, `.kanban-guide-details`, and `.kanban-guide-icon` in dark mode.
  - Added `[💼 Full-time]` and `[📍 Remote]` pills between `Application Date · Platform` and `Next Action`, maintaining visual parity with the 10-field default schema order on regular cards.
  - Upgraded the example Next Action block to use `.kanban-card-next-action.kanban-next-action-layout` with a calendar icon box, "Next Action" label, and a "Next Action Date" badge, ensuring it receives polished styling in both light and dark modes.
- Updated application creation and toast notification in [`js/main/applicationForm.js`](../../js/main/applicationForm.js), [`js/main/trackerActions.js`](../../js/main/trackerActions.js), and [`js/toast.js`](../../js/toast.js):
  - Passed `{ success: true }` in `addApplicationDraft()` when displaying `"Application added."`.
  - Updated `trackerActionsMethods.showToast(message, options)` to forward options to `presentToast(message, options)`.
  - Updated `showToast()` in `toast.js` so `"Application added."` automatically receives `.jubro-toast-success` styling with a `✓` checkmark.
  - Positioned in the top right (`top: 1.25rem; right: 1.25rem`, responsive `1rem` on mobile) with green accent border, shadow, and auto-dismissal.

## Files affected

- [`js/main/kanban.js`](../../js/main/kanban.js): Updated the example guide card to include dark mode company name classes, Employment Type and Work Setup pills, and the modern Next Action layout.
- [`css/global.css`](../../css/global.css): Added `.dark .kanban-guide-*` rules ensuring high-contrast white text, muted secondary text, and dark icon containers in dark mode.
- [`js/main/applicationForm.js`](../../js/main/applicationForm.js): Passed `{ success: true }` when showing `"Application added."`.
- [`js/main/trackerActions.js`](../../js/main/trackerActions.js): Forwarded toast options through `trackerActionsMethods.showToast`.
- [`js/toast.js`](../../js/toast.js): Treated `"Application added."` as a success toast with top-right positioning and checkmark icon.
- [`test/applicationForm.test.mjs`](../../test/applicationForm.test.mjs): Added unit test verifying `addApplicationDraft()` triggers a success toast with `{ success: true }`.
- [`test/kanbanGuideAndToast.test.mjs`](../../test/kanbanGuideAndToast.test.mjs): Added test suite verifying guide card dark mode classes, pills, Next Action layout, and toast DOM behavior.
- `docs/features.md` (local-only, git-ignored): Updated Kanban Board features documentation.

## Verification

- `node --test test/kanbanGuideAndToast.test.mjs` — passed (3/3 tests).
- `npm test` — passed (200/200 tests).
- `node --experimental-websocket test/authNavigation.browser.mjs` — passed with zero errors.
- `git diff --check` — passed with no formatting or whitespace issues.

## Limitations

None identified.
