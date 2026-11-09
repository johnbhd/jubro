# Add Work Setup and Employment Type default fields

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: feature

## Problem or goal

Jubro's default application schema previously supported eight fields: `Company`, `Position`, `Platform`, `Status`, `Date`, `Link`, `Next Action`, and `Next Action Date`. Job seekers frequently evaluate opportunities based on working arrangement (`On-site`, `Hybrid`, `Remote`) and contract/employment nature (`Full-time`, `Part-time`, `Internship`, `Contract`, `Freelance`, `Temporary`). Previously, users had to manually define custom fields to track these parameters, and they did not benefit from built-in color-coded badges, preconfigured options, or balanced form integration.

The goals:
1. Extend Jubro's default application schema with `Work Setup` (select) and `Employment Type` (select).
2. Integrate both fields cleanly into Add Application and Edit Application modals in a balanced 2-column desktop/tablet grid that stacks on mobile.
3. Keep both fields optional (defaulting to `""` / `Select`).
4. Support preselected values and value clearing (`None`) in Edit mode.
5. Provide automatic List view badge rendering and filter chips via existing select column capabilities.
6. Ensure search matches `Work Setup` and `Employment Type` queries.
7. Preserve full backward compatibility for legacy 8-column trackers and imports.

## Changes and resulting behavior

1. **Default Schema Definition**:
   - In [`js/tracker/defaultTracker.js`](../../js/tracker/defaultTracker.js), added `Work Setup` (select) with options `On-site` (`#64748b`), `Hybrid` (`#8b5cf6`), and `Remote` (`#10b981`), and `Employment Type` (select) with options `Full-time` (`#3b82f6`), `Part-time` (`#06b6d4`), `Internship` (`#f59e0b`), `Contract` (`#ec4899`), `Freelance` (`#84cc16`), and `Temporary` (`#94a3b8`).
   - The canonical default column order is now:
     1. `Company` (text)
     2. `Position` (text)
     3. `Platform` (select)
     4. `Status` (select)
     5. `Date` (date)
     6. `Link` (text)
     7. `Work Setup` (select)
     8. `Employment Type` (select)
     9. `Next Action` (text)
     10. `Next Action Date` (date)

2. **Column Indexes & Field Keys**:
   - In [`js/main/listView/indexes.js`](../../js/main/listView/indexes.js), mapped `workSetup` and `employmentType` using `-1` fallback so legacy 8-column trackers without these columns safely evaluate to `-1` without aliasing `Next Action` or `Next Action Date`.
   - Updated fallback indices for `nextAction` (8) and `nextActionDate` (9).
   - Added canonical field keys `'workSetup'` and `'employmentType'` in `getListColumnFieldKey`.

3. **Search Integration**:
   - In [`js/main/trackerSearch.js`](../../js/main/trackerSearch.js), added `'work setup'`, `'worksetup'`, `'employment type'`, `'employmenttype'`, and `'platform'` to searchable column names, enabling instant filtering when searching for terms like "remote", "hybrid", "full-time", or "internship".

4. **Add & Edit Application Modals**:
   - In [`js/main/listView/editModal.js`](../../js/main/listView/editModal.js):
     - Added `<label class="block"><span class="text-sm font-medium text-gray-700">...</span>` and styled select controls in `createListEditInput` during `mode === 'add'` to achieve pixel-perfect alignment across both form columns.
     - Added `this.ensureListEditModal()` to `openListEditModal(rowIndex)` ensuring the edit dialog DOM exists even if invoked directly from Kanban view before visiting List view.
     - Added a `None` clear button in `setupListEditSelectFields` allowing users to clear optional select fields in Edit mode.
   - Both Add and Edit modals maintain a balanced 2-column desktop/tablet layout:
     - Row 1: `Company` | `Position`
     - Row 2: `Platform` | `Status`
     - Row 3: `Date` | `Link`
     - Row 4: `Work Setup` | `Employment Type`
     - Row 5: `Next Action` | `Next Action Date`
     - Stacks seamlessly to 1 column on mobile screens (< 640px).

5. **Theme & Dark Mode Styling**:
   - In [`css/global.css`](../../css/global.css), added dark mode rules for `.dark .application-add-fields select` and `.dark .list-edit-select-option .text-gray-500` / `.hover\:text-gray-900:hover` ensuring clean visual contrast and theme consistency across light and dark modes.

## Files affected

- [`js/tracker/defaultTracker.js`](../../js/tracker/defaultTracker.js): Added `Work Setup` and `Employment Type` column specifications and default options.
- [`js/main/listView/indexes.js`](../../js/main/listView/indexes.js): Added column index lookups and field key mappings.
- [`js/main/trackerSearch.js`](../../js/main/trackerSearch.js): Added `work setup` and `employment type` names to searchable columns.
- [`js/main/listView/editModal.js`](../../js/main/listView/editModal.js): Updated Add select input markup, added `None` option for clearing selects in Edit mode, and ensured modal existence in `openListEditModal`.
- [`css/global.css`](../../css/global.css): Added styling rules for select controls and option dropdowns in dark mode.
- [`test/jobSearch.test.mjs`](../../test/jobSearch.test.mjs): Updated 10-column default schema assertion.
- [`test/applicationForm.test.mjs`](../../test/applicationForm.test.mjs): Updated draft length assertions and indices for Next Action; added typed tests for Work Setup and Employment Type.
- [`test/workSetupEmploymentType.test.mjs`](../../test/workSetupEmploymentType.test.mjs): Added unit tests for schema, index resolution, fallback safety on legacy trackers, search matching, and import normalization.
- [`docs/features.md`](../features.md): Documented the 10-column default schema, field order, and modal behaviors.

## Verification

1. **Unit Tests**:
   - `npm test`: Ran complete test suite. All 181 unit tests passed with 0 errors across 15 test files.
2. **Browser Test Suite**:
   - `node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across 2 themes and 6 viewport widths with 0 errors.
   - `JUBRO_SURFACES_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across all surface hierarchy checks with 0 errors.
3. **Visual Regression Screenshots**:
   - Generated and inspected visual artifacts across Desktop (`1440px`), Tablet (`768px`), and Mobile (`390px`) in both Light and Dark themes:
     - `light-1440-modal-add-application.png` & `dark-1440-modal-add-application.png`: Verified 2-column balanced layout with clean default placeholders and "Select" empty value.
     - `light-1440-modal-edit-application.png` & `dark-1440-modal-edit-application.png`: Verified preselected values (`Remote`, `Full-time`).
     - `light-1440-modal-edit-worksetup-dropdown.png` & `dark-1440-modal-edit-worksetup-dropdown.png`: Verified open dropdown with `None` (clear) and color-coded options (`On-site`, `Hybrid`, `Remote`).
     - `light-390-modal-add-application.png` & `dark-390-modal-add-application.png`: Verified single-column responsive stacking and vertical scrolling.

## Limitations

- Work Setup and Employment Type are not rendered directly on Kanban cards, keeping Kanban cards compact and focused on essential identity, status, and Next Action. They appear naturally in List view badges, List view filter chips, Edit modals, and Custom Fields management.
