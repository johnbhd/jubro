# Consolidate account and settings into Board main navbar

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: feature

## Problem or goal

Previously, the Jubro Board navigation mixed global application and account utilities with Job Search controls inside the second workspace navbar (`#appNavbar`). The second navbar contained a `⋮` More menu with `Import JSON` and `Export JSON`, while global navigation (brand, home, settings, theme, account, logout) lacked a dedicated top-level container on the Board page.

The goal was to separate navigation responsibilities into two clean levels:
1. **Top/Main Navbar**: Global actions (Jubro branding, Account/User, Go to Home, Settings, Theme, Backup import/export, Logout).
2. **Workspace Navbar**: Job Search-specific actions only (Job Search switcher, Search + Sort, Board/List views, Dashboard, Custom Fields, Add Application).
3. Remove the `⋮` More menu and popup from the second workspace navbar.

## Changes and resulting behavior

1. **Board Main Navbar (`#boardTopNavbar`)**:
   - Added a top navbar above `#appNavbar` in [`board/index.html`](../../board/index.html).
   - Left side: Jubro brand logo and title linking to `/` (`[JB] Jubro | Your job application Board`, with subtitle responsive on desktop and hidden on narrow mobile screens).
   - Right side:
     - Guest state: Displays a dedicated Settings gear button (`#btnGuestSettings`, `aria-label="Jubro settings"`, `title="Settings"`).
     - Signed-in state: Displays a User Account button (`#btnUserAccount`, `aria-label="Account menu"`) displaying the authenticated user's name or "Account".
     - Auth changes seamlessly switch between `⚙` and `👤` without page reload.
2. **Consolidated Global Dropdown (`#boardTopNavDropdown`)**:
   - Built a unified dropdown supporting mouse, touch, and keyboard accessibility:
     - **User/Account Info**: When signed in, displays user avatar, display name, and email.
     - **Navigation & Settings**: Contains `Go to Home` (navigates to `/`) and `Settings` (opens the existing `#settingsModal` dialog).
     - **Theme**: Quick options for `Light` and `Dark` mode with explicit checkmark (`✓`) on the active selection; updates the DOM immediately and persists to `localStorage` without triggering tracker mutations or cloud sync.
     - **Backup**: Houses `Import JSON` (`#btnImport`) and `Export JSON` (`#btnExport`), directly reusing the existing safe JSONService and Firebase sync logic.
     - **Logout**: Danger-styled `Logout` (`#btnNavLogout`) at the bottom of the menu for authenticated users only, calling `authService.logout()` with full workspace isolation and switching back to guest state.
     - **Accessibility**: Escape key closes the dropdown and returns focus to the active trigger button; clicking outside closes the dropdown; all actions use semantic `<button>` and `<a>` elements.
3. **Workspace Navbar Cleaned**:
   - Removed `#btnMenu` (`⋮`) and `#navDropdown` from `#appNavbar` in [`board/index.html`](../../board/index.html).
   - Removed dead `#btnMenu` and `#navDropdown` event listeners and handlers from [`js/main/trackerEvents.js`](../../js/main/trackerEvents.js).
   - Removed dead CSS selectors in [`css/global.css`](../../css/global.css) and added comprehensive styling for `#boardTopNavbar` and `#boardTopNavDropdown` in light and dark modes.
   - Expanded mobile width allocation for `#appNavbar .job-search-selector` now that `btnMenu` no longer occupies toolbar space.

## Files affected

- [`board/index.html`](../../board/index.html): Added `#boardTopNavbar` with dropdown and removed `#btnMenu` / `#navDropdown` from `#appNavbar`.
- [`js/main/boardNav.js`](../../js/main/boardNav.js): Created module managing top navbar trigger states, dropdown open/close, theme toggles, auth listeners, and modal openings.
- [`js/app.js`](../../js/app.js): Initialized `initBoardTopNavbar()` on application startup.
- [`js/main/trackerEvents.js`](../../js/main/trackerEvents.js): Cleaned up removed `btnMenu` / `navDropdown` wiring and closed dropdown on import.
- [`css/global.css`](../../css/global.css): Added light and dark mode styles for `#boardTopNavbar` and `#boardTopNavDropdown`, removed dead menu styles, and tuned mobile selector width.
- [`test/statusCustomization.browser.mjs`](../../test/statusCustomization.browser.mjs): Updated assertions for the removed `btnMenu` and added end-to-end tests for the new main navbar, guest/signed-in state transitions, theme switches, and keyboard behavior.
- [`docs/context/2026-11-09-feature-main-navbar-account-settings-consolidation.md`](README.md): This change record.

## Verification

- `npm test`: 152 unit tests passed (152 pass, 0 fail).
- `node --experimental-websocket test/statusCustomization.browser.mjs`: All browser BiDi end-to-end tests passed across 6 responsive viewports (390px, 430px, 768px, 1024px, 1440px, 1920px) and 2 themes (light & dark).
- Visual inspection: Verified screenshots for 390px mobile, 1024px desktop, light mode, and dark mode.
- `git diff --check`: Verified zero trailing whitespaces or formatting issues.

## Limitations

None identified.
