# Revert List view changes and restore list header panel

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

Per user instruction to undo all changes in List view, restore the List view header card (`Applications \n List view`) and revert List badge image class overrides.

## Changes and resulting behavior

1. **Restored List Header Panel**:
   - In [`board/index.html`](file:///data/data/com.termux/files/home/projects/codev/jubro/board/index.html), removed `hidden` attribute and class from `.list-panel`.
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), removed `.list-panel { display: none !important; }`.
   - The original List view panel displaying the `Applications \n List view` heading and controls is fully restored to visibility.
2. **Restored List View Badges**:
   - In [`js/main/listView/badges.js`](file:///data/data/com.termux/files/home/projects/codev/jubro/js/main/listView/badges.js), restored standard `image.className = 'h-5 w-5 rounded'`.
3. **Preserved Tracker Navigation Improvements**:
   - The enlarged Job Search chevron icon (`font-size: 15px`) and the light/dark hover styling for `#btnDashboard` and `#btnCustomFields` in the main toolbar remain intact.

## Files affected

- `board/index.html`: Restored `.list-panel` visibility.
- `css/global.css`: Removed `.list-panel` display override.
- `js/main/listView/badges.js`: Restored standard List favicon image class.
- `docs/context/2026-11-09-revert-list-view-changes.md`: Context record for this change.

## Verification

1. **Unit Tests**:
   - Ran `npm test`. All 152 unit tests passed with 0 failures.
2. **Formatting**:
   - `git diff --check`: 0 errors or warnings.

## Limitations

- None identified.
