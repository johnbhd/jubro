# Light Navbar Polish, Auth Navigation Redirects, and Success Flash Toasts

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: feature

## Problem or goal

Four focused user experience and authentication flow improvements were required:
1. **Light Mode Navbar Spacing**: On the landing page (`index.html`), the unscrolled light mode navbar felt cramped against viewport edges, lacked comfortable inner breathing room, and had inconsistent edge margins across screen sizes.
2. **Homepage Sign-In Destination**: After completing sign-in from the landing page, users remained on the marketing page instead of being brought directly to their workspace. The sign-in flow needed to navigate to `/board/` only after full workspace preparation and any required guest transfer decision were resolved.
3. **Logout Destination**: Signing out from any workspace view (Board, List, Dashboard) left users in the workspace as a guest instead of returning them cleanly to the homepage (`/`).
4. **Success Toast Feedback**: Users needed immediate, non-intrusive feedback confirming successful sign-in (`Login successful`) and sign-out (`Logout successful`). Because these actions navigate between pages, toasts could not be rendered immediately before unload; they needed a one-time flash mechanism that survives the navigation, renders once on the destination page, auto-dismisses, and never repeats on refresh.

All existing guest usage, account isolation, guest-to-account transfer policy, revision management, and dark-mode styling needed to be preserved without regressions.

## Changes and resulting behavior

1. **Light Mode Navbar Layout & Spacing**:
   - In [`css/global.css`](../../css/global.css), refined `html:not(.dark) #homeBody .site-navbar` with responsive page insets:
     - Desktop (>= 1024px): `width: calc(100% - 64px)`, `max-width: 1376px`, `padding: 10px 24px`, matching the landing content width.
     - Tablet (640px–1023px): `width: calc(100% - 48px)`, `padding: 12px 20px`.
     - Mobile (< 640px): `width: calc(100% - 32px)`, `padding: 10px 18px`.
   - Refined light navbar surface tokens with subtle `#d9dee7` border and soft ambient shadow (`0 2px 6px rgb(23 32 51 / 0.04)`), preventing harsh pure-white canvas or heavy floating glows.
   - Preserved dark-mode unscrolled navbar and scrolled pill navbar behavior completely without regression.

2. **Auth Navigation & Lifecycle Sequencing**:
   - Created [`js/auth/authNavigation.js`](../../js/auth/authNavigation.js) with:
     - `finishSignIn()`: Checks if current page is homepage; if so, sets `'Login successful'` flash toast in `sessionStorage` and navigates to `/board/`. If already in workspace, displays the toast directly.
     - `logoutAndRedirect()`: Coalesces concurrent sign-out attempts, calls `authService.logout()` (which cleans up Firebase auth and switches cleanly to guest workspace), sets `'Logout successful'` flash toast in `sessionStorage`, and routes to `/`.
   - In [`js/auth/auth.js`](../../js/auth/auth.js):
     - Integrated `finishSignIn()` into email/password registration, login, and Google sign-in workflows after `authService.prepareWorkspace` and guest transfer prompts finish. Added `authActionInProgress` guard preventing duplicate submissions or race conditions.
     - Updated `Auth.prototype.logout` to invoke `logoutAndRedirect()`.
   - In [`js/main/boardNav.js`](../../js/main/boardNav.js):
     - Updated the board top navbar logout button (`#btnNavLogout`) to call `logoutAndRedirect()`.
   - In [`js/main.js`](../../js/main.js):
     - Guaranteed that already-authenticated users who manually navigate to `/` can view the homepage without forced redirects.

3. **Unified Flash Toast System**:
   - Created [`js/toast.js`](../../js/toast.js) providing:
     - `setFlashToast(message)`: Stores typed, sanitized success messages in `sessionStorage` under `jubro_flash_toast`.
     - `consumeFlashToast()`: Reads and immediately removes flash metadata, validating payload structure so malformed or foreign entries are discarded safely.
     - `showToast(message, { success })`: Renders or reuses `#jubroToast` with polite accessibility semantics (`role="status"`, `aria-live="polite"`), a green `✓` icon for success, dark/light theme-aware background and borders, and auto-dismiss after ~3 seconds (2.6s for standard toasts).
     - `showFlashToast()`: Consumes any pending flash toast on destination page load.
   - In [`js/main.js`](../../js/main.js) and [`js/app.js`](../../js/app.js), invoked `showFlashToast()` on DOM ready, ensuring both homepage (after logout) and Board (after login) consume and render the flash message once.
   - Updated [`js/main/trackerActions.js`](../../js/main/trackerActions.js) to reuse `showToast` from `js/toast.js` instead of duplicating toast DOM manipulation.

4. **Styling & Accessibility**:
   - Added `.jubro-toast.jubro-toast-success` in [`css/global.css`](../../css/global.css) with fixed positioning below the navbar (`top: calc(env(safe-area-inset-top, 0px) + 10rem)`), top-right placement on desktop/tablet, and centered placement on mobile.
   - Styled with calm emerald green accent (`#15803d` border-left and icon in light mode, `#86efac` in dark mode) and elevated surface.
   - Avoids stealing focus or moving the page scroll.

## Affected files

- [`css/global.css`](../../css/global.css): Added light-mode navbar spacing rules, responsive container widths, and toast styling for light and dark modes.
- [`js/toast.js`](../../js/toast.js): New module managing session flash toasts and accessible DOM toast presentation.
- [`js/auth/authNavigation.js`](../../js/auth/authNavigation.js): New module managing sign-in destination routing and logout redirection.
- [`js/auth/auth.js`](../../js/auth/auth.js): Integrated sign-in completion hook and redirected logout flow.
- [`js/app.js`](../../js/app.js): Calls `showFlashToast()` on board workspace initialization.
- [`js/main.js`](../../js/main.js): Calls `showFlashToast()` on homepage initialization.
- [`js/main/boardNav.js`](../../js/main/boardNav.js): Routes top navbar logout through `logoutAndRedirect()`.
- [`js/main/trackerActions.js`](../../js/main/trackerActions.js): Reuses shared toast implementation.
- [`test/authNavigation.test.mjs`](../../test/authNavigation.test.mjs): Unit tests for login redirect, guest transfer resolution, sign-in failure, and logout redirection.
- [`test/toast.test.mjs`](../../test/toast.test.mjs): Unit tests for flash storage set/consume lifecycle, untrusted payloads, and session storage error handling.
- [`test/authNavigation.browser.mjs`](../../test/authNavigation.browser.mjs): Browser integration test verifying navbar padding, toast layout, login flow, logout from board/list/dashboard, and refresh behavior.
- [`test/statusCustomization.browser.mjs`](../../test/statusCustomization.browser.mjs): Integrated auth navigation browser checks into main browser test harness.
- [`docs/features.md`](../../docs/features.md): Updated overview documentation describing post-auth navigation and flash toast feedback.
- [`docs/context/2026-11-09-feature-light-navbar-auth-redirects-and-toasts.md`](2026-11-09-feature-light-navbar-auth-redirects-and-toasts.md): This change record.

## Verification performed

1. **Unit Test Suite**:
   - Command: `npm test`
   - Result: 174/174 tests passed (including 17 new tests across `authNavigation.test.mjs` and `toast.test.mjs`).

2. **Targeted Auth Navigation Browser Suite**:
   - Command: `JUBRO_AUTH_ONLY=1 node --experimental-websocket test/statusCustomization.browser.mjs`
   - Result: 100% passed across all 12 viewport/theme combinations:
     - Navbar inner padding verified within 18px–24px horizontal and 10px–14px vertical in light mode.
     - Navbar outer insets verified at >= 32px (desktop), >= 24px (tablet), >= 16px (mobile).
     - Toast placement verified below navbar without stealing focus or overflowing viewport.
     - Homepage sign-in verified to navigate to `/board/` and render `Login successful`.
     - Board refresh verified not to re-render login toast.
     - Logout from Kanban, List, and Dashboard verified to route to `/` and render `Logout successful`.
     - Authenticated homepage access verified without forced redirect.

3. **Full Browser Regression Suite**:
   - Command: `node --experimental-websocket test/statusCustomization.browser.mjs`
   - Result: 100% passed with zero errors across all workspaces, views, transfers, and themes.

4. **Visual Verification & Artifacts**:
   - Inspected captured screenshots across 6 viewports:
     - `light-390-auth-navbar.png`, `light-430-auth-navbar.png`, `light-768-auth-navbar.png`, `light-1024-auth-navbar.png`, `light-1440-auth-navbar.png`, `light-1920-auth-navbar.png`
     - `dark-390-auth-navbar.png`, `dark-430-auth-navbar.png`, `dark-768-auth-navbar.png`, `dark-1024-auth-navbar.png`, `dark-1440-auth-navbar.png`, `dark-1920-auth-navbar.png`

5. **Code Quality Checks**:
   - `git diff --check`: 0 formatting or whitespace issues.
   - `node --check`: Syntax verified across all modified files.

## Remaining limitations

None identified.
