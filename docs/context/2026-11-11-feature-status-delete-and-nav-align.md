# Status column delete, top nav icon alignment, and guest sign-in option

## Date and type

- Date: 2026-11-11 (Asia/Manila)
- Type: feature

## Problem or goal

On the Jubro Kanban Board page:
1. The 3-dot column menu on status headers supported Rename, Change color, and Move left/right, but had no way to delete an unwanted status option (such as `Rejected`).
2. In the top navbar account dropdown (`#boardTopNavDropdown`), the `Export JSON` and `Logout` menu items had misaligned icons relative to `Go to Home`, `Settings`, `Import JSON`, and the theme toggles.
3. For guest users viewing the board page, the account dropdown did not offer an option to sign in, showing only `Go to Home` before the Theme and Import/Export sections.

## Changes and resulting behavior

- Added status column deletion in [`js/main/statusSettings.js`](../../js/main/statusSettings.js):
  - Implemented `deleteStatusOption(optionIndex)` on `statusSettingsMethods`.
  - Removes the status choice from the status column's `options` array.
  - Validates index boundaries and prevents deletion when `options.length <= 1` (a board must retain at least one status).
  - Automatically resets any application row with that status to `value: ''` so cards move safely to the blank/unmanaged fallback rather than referencing a deleted option.
  - Prunes the deleted status name from `activeListFilters` if active.
  - Saves the updated workspace with one atomic revision and logical sync.
  - Triggers non-persisting UI refresh and displays a success toast (`Status "${deletedName}" deleted.`).
  - Added a `Delete status` action with class `.kanban-status-menu-action-delete` to `createKanbanStatusMenu(optionIndex)`. If only one status remains, the button is disabled with `aria-disabled="true"`.
- Styled delete menu item and standardized top navbar dropdown icons in [`css/global.css`](../../css/global.css):
  - Added `.kanban-status-menu-action-delete` styles with red accent text and subtle hover backgrounds in both light and dark modes.
  - Enforced `display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; flex-shrink: 0; text-align: center;` on all `#boardTopNavDropdown [role="menuitem"] i.fa-solid:not(.theme-check)` icons to guarantee identical 20px centered alignment across all items.
- Added `Sign In Now` and aligned icons in [`board/index.html`](../../board/index.html):
  - Added `<button id="btnNavSignIn">` directly after `Go to Home` (`#btnNavHome`) and before `Settings` (`#btnNavSettings`).
  - Applied `w-5 text-center shrink-0` to all icons in `#boardTopNavDropdown` (`#btnNavHome`, `#btnNavSignIn`, `#btnNavSettings`, `#btnThemeLight`, `#btnThemeDark`, `#btnImport`, `#btnExport`, `#btnNavLogout`).
- Managed guest vs. authenticated UI states in [`js/main/boardNav.js`](../../js/main/boardNav.js):
  - Bound `#btnNavSignIn` click event to dynamically import `auth.js` and open the sign-in modal (`(new Auth()).open()`).
  - In `updateAuthUI(user)`, dynamically toggled `#btnNavSignIn` visibility: shown for guest users (`user == null`), and hidden for authenticated users (`user != null`).
  - For authenticated users, `#btnNavSettings` and `#dropdownLogoutWrapper` are shown; for guest users, they are hidden.
  - Ensured `initBoardTopNavbar(auth = authService)` accepts an optional injected auth service for testing and calls `updateAuthUI(initialUser)` on initialization so guest state is guaranteed on startup.
- Added comprehensive automated tests:
  - In [`test/statusCustomization.test.mjs`](../../test/statusCustomization.test.mjs): verified deleting a status option removes it from column options, clears matching application row statuses, prunes active filters, and rejects deleting the last remaining status.
  - In [`test/boardNavDropdown.test.mjs`](../../test/boardNavDropdown.test.mjs): verified markup ordering, icon width styling, and guest vs. authenticated visibility switching of `btnNavSignIn`, `btnNavSettings`, `btnGuestSettings`, `btnUserAccount`, and `dropdownLogoutWrapper`.

## Files affected

- [`board/index.html`](../../board/index.html): Added `#btnNavSignIn` markup and standardized menu item icon width classes to `w-5 text-center shrink-0`.
- [`css/global.css`](../../css/global.css): Added `.kanban-status-menu-action-delete` hover styles and dropdown icon width/centering rules.
- [`js/main/boardNav.js`](../../js/main/boardNav.js): Handled `#btnNavSignIn` click and auth state transitions, and allowed auth dependency injection.
- [`js/main/statusSettings.js`](../../js/main/statusSettings.js): Added `deleteStatusOption` and `Delete status` menu item with disable protection.
- [`test/statusCustomization.test.mjs`](../../test/statusCustomization.test.mjs): Added unit tests for status option deletion.
- [`test/boardNavDropdown.test.mjs`](../../test/boardNavDropdown.test.mjs): Added DOM tests for top navbar dropdown icon alignment and guest/authenticated states.
- `docs/features.md` (local-only, git-ignored): Updated status customization and accounts/settings documentation.

## Verification

- `node --import ./test/register-loader.mjs --test test/boardNavDropdown.test.mjs` — passed (2/2 tests).
- `node --import ./test/register-loader.mjs --test test/statusCustomization.test.mjs` — passed (15/15 tests).
- `npm test` — passed (203/203 unit tests).
- `node --experimental-websocket test/authNavigation.browser.mjs` — passed with code 0.
- `git diff --check` — passed with no whitespace or syntax issues.

## Limitations

None identified.
