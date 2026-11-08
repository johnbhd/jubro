# Fix Board Settings Dropdown Styling, Positioning, and Top Cropping

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

Following the consolidation of global account and settings actions into the Board main navbar (`#boardTopNavbar`), opening the settings/account dropdown menu (`#boardTopNavDropdown`) on `board/index.html` suffered from visual defects:
1. **Top cropping**: The dropdown had `top-11 sm:top-12` classes which were not present in the static `css/tailwind.css` bundle. In the flex container `#boardTopNavActions`, the browser computed `top: auto`, resulting in a negative top offset (`-98px`) that pushed the dropdown upward and clipped the top items ("Go to Home") against the top edge of the browser viewport.
2. **Width collapse and cramped typography**: The dropdown used `w-56` and `w-60` (also missing from `tailwind.css`), collapsing the container width to min-content (~58px) and compressing icons and text into narrow wrapped columns.
3. **Dual checkmarks**: Due to Font Awesome's `.fa-solid` declaration having equal specificity to Tailwind's `.hidden` and loading later in the document `<head>`, `<i class="fa-solid fa-check theme-check hidden">` remained visible as `inline-block`, causing both Light and Dark theme options to show checkmarks simultaneously.

The goal was to anchor the dropdown cleanly below the trigger button with reliable vertical gap (`calc(100% + 8px)`), establish standard Jubro dropdown geometry (`width: 16rem;`, `rounded-2xl`, proper padding, hover highlights, elevated box shadows), and guarantee strict hidden state enforcement for theme checkmarks and hidden menu sections in both light and dark themes across all responsive viewports.

## Changes and resulting behavior

1. **Explicit Dropdown Positioning and Dimensions**:
   - In [`css/global.css`](../../css/global.css), added `#boardTopNavDropdown` styling with `position: absolute; top: calc(100% + 8px); right: 0; width: 16rem; max-width: calc(100vw - 2rem);` and `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);`.
   - In [`board/index.html`](../../board/index.html), updated `#boardTopNavDropdown` markup with `w-63 rounded-2xl p-2 shadow-xl` and standard flex spacing.
   - Set `#boardTopNavbar { overflow: visible; }` and `#boardTopNavActions { position: relative; }` to prevent header bounding box clipping.

2. **Refined Menu Item Styling & Typography**:
   - Replaced compressed item padding and sizes in [`board/index.html`](../../board/index.html) with standard `px-3 py-2 rounded-xl text-sm font-medium gap-3` across all menu items.
   - Enhanced user header layout (`#dropdownUserHeader`) with 40px rounded avatar and clear typography for user name and email.
   - Added smooth hover transitions in [`css/global.css`](../../css/global.css) (`hover:bg-gray-100` / `#f3f4f6` in light mode, `#374151` in dark mode).

3. **Strict Hidden State & Theme Checkmark Enforcement**:
   - In [`css/global.css`](../../css/global.css), added `#boardTopNavDropdown .hidden, #boardTopNavDropdown [hidden], #boardTopNavDropdown .theme-check.hidden { display: none !important; }`, preventing Font Awesome's `display: inline-block` from overriding `.hidden`.
   - Set `.dark #boardTopNavDropdown .theme-check { color: #60a5fa !important; }` for crisp blue checkmark contrast against dark slate surfaces.

4. **Dark Mode Surface Polishing**:
   - Added deep multi-layer box shadows in dark mode: `box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5), 0 10px 15px -5px rgba(0, 0, 0, 0.4) !important;`.
   - Refined icon color accents (`#9ca3af` normal, `#d1d5db` hover) and user avatar circle background.

## Affected files

- [`board/index.html`](../../board/index.html): Polished dropdown markup, removed missing arbitrary Tailwind classes, applied standard spacing and sizing.
- [`css/global.css`](../../css/global.css): Added explicit CSS positioning, dimensions, hidden state enforcement, and dark mode surface polish for `#boardTopNavDropdown`.
- [`docs/context/2026-11-09-fix-board-settings-dropdown-styling-and-offset.md`](2026-11-09-fix-board-settings-dropdown-styling-and-offset.md): This change record.

## Verification performed

1. **Full Unit Test Suite**:
   - Command: `npm test`
   - Result: 152/152 tests passed (including guest/signed-in state transitions, ownership isolation, cloud revisions, and form workflows).

2. **Full Responsive Browser Test Suite**:
   - Command: `node --experimental-websocket test/statusCustomization.browser.mjs`
   - Result: 100% passed across all 6 viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) and 2 themes (light, dark) with zero browser console errors.

3. **Visual Regression Verification & Bounding Box Checks**:
   - Executed BiDi browser inspection measuring `#boardTopNavDropdown` bounding box rects:
     - Trigger button bottom: `60px`; Dropdown top: `68px` (precisely `calc(100% + 8px)`).
     - Dropdown width: `256px` (`16rem`).
     - Dropdown right edge: `972px` (flush with trigger button right edge).
   - Captured and visually verified screenshots:
     - `dropdown_guest_1024_light.png`: Light mode desktop guest dropdown cleanly positioned with single checkmark on Light theme.
     - `dropdown_guest_1024_dark.png`: Dark mode desktop guest dropdown with single checkmark on Dark theme.
     - `dropdown_user_1024_dark.png`: Signed-in user dropdown with user profile header, Home, Settings, Theme, Backup, and Logout.
     - `dropdown_guest_390_dark.png`: Mobile (390px) guest dropdown fitting cleanly within mobile margins.
     - `dropdown_user_390_dark.png`: Mobile (390px) signed-in user dropdown with zero horizontal or vertical clipping.

## Remaining limitations

None identified.
