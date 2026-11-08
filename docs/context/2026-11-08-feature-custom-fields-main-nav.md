# Move Custom Fields to main navigation

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

Previously, the "Customize Fields" button was only located inside the List view toolbar (`#btnListViewSettings`), requiring users to switch away from the Kanban Board to configure tracker schema and field visibility. Because custom fields and tracker schemas apply across the entire workspace (affecting Kanban cards, List columns, Add/Edit Application forms, and filters), field customization is a workspace-level setting rather than a List-only feature. Furthermore, having field customization tucked inside List view caused duplicate UI and poor discoverability.

The goal was to:
1. Promote Custom Fields into the primary Board navigation header (`#appNavbar`), placed between Dashboard and Add Application.
2. Remove the duplicate button from the List view header.
3. Allow opening and modifying custom fields seamlessly from both Board and List views using the existing `#listSettingsPopup` modal.
4. Ensure accessibility: `aria-expanded` tracking on `#btnCustomFields`, Escape key closing with focus restoration, and backdrop click closing.
5. Ensure workspace safety: switching Job Searches closes the modal via `closeSearchSpecificUI()` so an open dialog cannot mutate an inactive tracker.
6. Ensure responsive layout compliance across all breakpoints (desktop with icon + text, tablet and mobile with compact 40px icon-only button).

## Changes and resulting behavior

- Added `#btnCustomFields` to `board/index.html` between `#btnDashboard` and `#btnAddApplication` with sliders icon (`fa-solid fa-sliders text-xs`) and text label `Custom Fields`.
- Added CSS styles in `css/global.css`:
  - Transparent button backgrounds in light and dark mode matching `#btnDashboard`.
  - Icon-only presentation at tablet viewports (`< 1024px`) by hiding the text span.
  - Hiding the text span at mobile viewports (`< 768px`) and tuning `#appNavbar .job-search-selector` max-width (`min(72px, calc(100vw - 318px))`) to guarantee that all 7 toolbar actions fit comfortably within narrow 390px mobile viewports without wrapping or horizontal overflow.
- Updated `js/main/trackerEvents.js`:
  - Connected `#btnCustomFields` click handler to `this.toggleCustomizeFields()`.
  - Added `this.closeCustomizeFields?.()` to the global Escape key listener.
- Updated `js/main/listView/settings.js`:
  - Added `openCustomizeFields()`, `closeCustomizeFields()`, and `toggleCustomizeFields()` methods on `listSettingsMethods`.
  - In `openCustomizeFields()`, lazily ensures the modal DOM exists, renders toggles for current tracker schema, sets `aria-expanded="true"`, and focuses the modal close button.
  - In `closeCustomizeFields()`, hides the modal, resets `aria-expanded="false"`, and restores focus to `#btnCustomFields` if the modal was previously open.
  - Updated backdrop click handling so clicking outside the dialog content closes the modal.
  - Deprecated the duplicate `#btnListViewSettings` injection by making `ensureListViewSettingsButton()` clean up any legacy button.
- Updated `js/main/listView/render.js`:
  - Removed `ensureListViewSettingsButton()` from `renderListView()`.
- Updated `js/main/jobSearch.js`:
  - Added `this.closeCustomizeFields?.()` in `closeSearchSpecificUI()` so switching or closing job searches immediately dismisses the modal.
- Updated test suite:
  - `test/statusCustomization.browser.mjs`: Added `#btnCustomFields` to toolbar geometry and label visibility checks across all 6 viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) and both dark/light themes; added end-to-end tests validating opening from Board view, closing on Escape with focus restoration, absent `#btnListViewSettings` in List view, opening from List view, and closing on job search context switch without mutations.

## Files affected

- [board/index.html](../../board/index.html): Added `#btnCustomFields` toolbar button in main navbar.
- [css/global.css](../../css/global.css): Added responsive styling and theme rules for `#btnCustomFields`.
- [js/main/trackerEvents.js](../../js/main/trackerEvents.js): Attached click listener and Escape keyboard shortcut for `#btnCustomFields`.
- [js/main/listView/settings.js](../../js/main/listView/settings.js): Added modal lifecycle methods (`openCustomizeFields`, `closeCustomizeFields`, `toggleCustomizeFields`), outside-click handling, and deprecated `#btnListViewSettings`.
- [js/main/listView/render.js](../../js/main/listView/render.js): Removed `#btnListViewSettings` injection in List view rendering.
- [js/main/jobSearch.js](../../js/main/jobSearch.js): Added `closeCustomizeFields` invocation in `closeSearchSpecificUI`.
- [test/statusCustomization.browser.mjs](../../test/statusCustomization.browser.mjs): Added toolbar checks and functional browser tests for Customize Fields navigation.
- [docs/features.md](../features.md): Documented Custom Fields placement in main navigation and removal from List view header.
- [docs/architecture.md](../architecture.md): Documented Custom Fields navbar architecture.

## Verification

- `npm test`: All 149 unit tests passed cleanly across all suites.
- `node --experimental-websocket test/statusCustomization.browser.mjs`: 100% passed (0 errors across 2 themes and 6 viewport widths: 390px, 430px, 768px, 1024px, 1440px, 1920px).
- Confirmed that opening `#listSettingsPopup` from Board view, closing via Escape, opening from List view, closing via button, and switching job searches all produce 0 storage writes or revision changes.
- `git diff --check`: Clean, no whitespace or formatting errors.

## Limitations

None identified.
