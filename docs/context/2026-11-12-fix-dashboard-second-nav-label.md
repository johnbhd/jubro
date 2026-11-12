# Restore Dashboard text in the second navigation

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: fix

## Problem or goal

The Quick Overview redesign renamed the second-navigation trigger and hid its text at 1024–1279px. The user clarified that this navigation control should retain the Dashboard name and visible tablet/desktop text, while the popup itself remains Quick Overview.

## Changes and resulting behavior

- Restored Dashboard as the trigger's visible text, accessible label, and tooltip.
- Removed the new 1024–1279px text-hiding rule. Dashboard text now remains visible at all widths from 768px upward. Mobile keeps the previously approved accessible icon-only treatment.
- The modal title, Quick Overview metrics, empty state, period controls, and Add behavior are unchanged. No data, auth, storage, revision, or sync changes.
- Updated browser assertions to distinguish the intentionally different navigation name and popup title.

## Files affected

- `board/index.html`: restore second-navigation Dashboard naming only.
- `css/global.css`: remove the intermediate-width icon-only override.
- `test/toolbarWidth.browser.mjs`: assert Dashboard text/accessibility and visibility from 768px upward.
- `test/quickOverview.browser.mjs`: expect Dashboard as the trigger label while retaining Quick Overview as the modal title.
- `docs/features.md` and `docs/architecture.md`: update local-only, Git-ignored documentation without force-adding it.

## Verification

- Updated the toolbar test first and observed it fail with "Second nav retains the Dashboard name" against the previous implementation.
- `npm test`: 214 passed, 0 failed after the change, including a fresh rerun after the interrupted turn.
- `JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: passed at 390, 430, 768, 1024, 1280, 1440, and 1920px in dark/light, with zero JavaScript errors. Verified Dashboard naming, visible tablet/desktop text, useful Search width, protected Job Search context, no overlapping controls or horizontal overflow, and unchanged workspace storage. Shared landing checks also passed.
- `JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs`: fresh rerun passed six widths in both themes with zero JavaScript errors. Confirmed the Dashboard trigger still opens Quick Overview, with metrics, empty states, period changes, view/search independence, active-search switching, Add/Cancel/Save, and Escape/focus behavior preserved. Shared landing checks also passed.
- `node --check` passed for both affected browser scripts.
- `git diff --check`: passed.

## Limitations

Browser checks use local headless Firefox and Firebase fixtures, not physical devices or live accounts. No project dependencies added. No push performed.
