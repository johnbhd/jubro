# Full-width mobile navigation sign-in button and landing page views update

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: fix

## Problem or goal

1. Inside the landing page mobile navigation dropdown (`#mobileTrackerMenu`), the "Open Jubro" button stretched to full width, but the "Sign In" button remained a narrow inline-flex element aligned to the left because `#navbarGuest` and `#btnSignIn` lacked full-width styling on mobile viewports.
2. In the landing page (`index.html`), view descriptions still referenced historical "Board Views" without explicitly highlighting the Kanban board and List view pairing that defines Jubro.

## Changes and resulting behavior

- Updated `components/navbar.html`:
  - Adjusted the action buttons container from `sm:flex-row` to `lg:flex-row`, ensuring action buttons remain vertically stacked inside the floating mobile menu card on all viewports below 1024px.
- Updated `css/global.css`:
  - Added responsive rules under `@media (max-width: 1023px)` ensuring `#navbarGuest`, `#btnSignIn`, `#navbarAuthenticated`, `#btnAccount`, `#navbarAuthLoading`, and `#btnOpenModal` all expand to `width: 100% !important;` inside `#mobileTrackerMenu`.
  - Display flex layout applied to active guest and authenticated wrappers on mobile viewports.
  - On desktop (`min-width: 1024px`), buttons retain their natural compact sizing in the scrolled horizontal navbar row without overflowing or overlapping.
- Updated `index.html`:
  - Updated section title to `How to Use Kanban Board & List Views`.
  - Updated explanatory copy to describe switching between a status-driven Kanban board and a focused List view inside each Job Search.
  - Updated video copy: `Use the Kanban board to see applications by stage, then switch to List view for a cleaner reading layout for each application.`
  - Renamed the feature card from `Board View` to `Kanban Board`.
  - Updated hero and about descriptions to specify organizing applications with a clean and simple Kanban board and list view.
- Updated test suite:
  - `test/statusCustomization.browser.mjs`: Added automated browser assertions verifying that when opening the mobile navigation dropdown at `< 1024px` viewports across light and dark themes, `#btnSignIn` matches the full width of `#btnOpenModal` within 2px tolerance.

## Files affected

- [components/navbar.html](../../components/navbar.html): Removed premature `sm:flex-row` from dropdown actions so they stack vertically on all viewports below 1024px.
- [css/global.css](../../css/global.css): Added 100% width and flex display rules for mobile dropdown buttons at `max-width: 1023px`.
- [index.html](../../index.html): Replaced generic view wording with explicit Kanban board and list view terminology across hero, about, and how-it-works sections.
- [test/statusCustomization.browser.mjs](../../test/statusCustomization.browser.mjs): Added browser assertion verifying full-width mobile dropdown sign-in button.
- [docs/features.md](../features.md): Updated shared presentation documentation.

## Verification

- `npm test`: Passed all 149 unit tests.
- `node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across all 2 themes and 6 viewports (390px, 430px, 768px, 1024px, 1440px, 1920px), including the full-width mobile nav sign-in assertion and scrolled desktop navbar layout tests.
- `git diff --check`: Clean, 0 whitespace errors.

## Limitations

None identified.
