# Replace Dashboard analytics popup with Quick Overview

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

Dashboard previously offered a select-field grouping control, option count cards, a large pie chart, and an application-date chart. Replace it with the approved Quick Overview: important current numbers, a compact status summary, and useful onboarding without building future Insights.

## Changes and resulting behavior

- Popup and toolbar action now use Quick Overview. The default subtitle is "A quick look at your job search this month." Other periods receive selected-period copy. Existing time presets/custom dates remain; the grouping selector is gone.
- Four cards show Total Applications, Interviews, Offers, and Need Attention, using real canonical rows in the selected application-date period. They form four desktop columns and a mobile two-by-two grid.
- Pure calculation helpers count trimmed, case-insensitive Interview/Offer values, not guessed meanings of arbitrary renamed statuses. Need Attention requires action text and a strictly valid Next Action Date due through tomorrow in local calendar time. Rejected/Withdrawn are excluded even with an action in V1. Invalid dates and blank actions/dates do not count.
- Named schema resolution supports reordered, missing, custom, primitive-cell, and object-cell data without treating unrelated positional fields as Status or Next Action. If no application-date field exists, all rows remain the applicable scope; Next Action Date cannot become the period filter.
- Status Summary replaces both historical charts with a segmented bar and readable counts for Applied, Interview, Offer, Rejected, and Other. Common groups reuse Kanban option colors, including safe custom hex values; blank/custom statuses group into neutral Other. Zero-count groups are omitted and division by zero is avoided.
- A genuinely empty search shows a clipboard icon, "No applications yet", explanatory copy, four subdued zeros, and Add Application. A populated search outside the period shows a different period-empty message. Neither shows a summary or Insights action.
- Empty-state Add closes the overview and opens the existing blank form. Cancel creates no row or revision. Saving uses the existing canonical validation/persistence path. Populated View Insights is explicitly disabled with a coming-soon explanation; no Insights route exists or was added.
- Existing close/backdrop/Escape and trigger-focus restoration remain. Canonical refresh updates an open overview. Board/List selection, search text, and visible-card filtering do not change overview data. Job Search switching/auth changes retain existing safe UI closure and ownership protections.
- At 1024–1279px, the longer toolbar label becomes its accessible icon to preserve Search width. Text remains at 768–1023px and 1280px upward; mobile remains icon-only. Other toolbar layout is unchanged.
- Removed the now-unreferenced historical chart module and its chart-only CSS. No schema, storage, Firebase, sync, or dependency changes.

## Files affected

- `js/main/quickOverview.js`: new pure attention, metric, and status-summary helpers.
- `js/main/trackerDashboard.js`: existing period/modal lifecycle with new compact rendering.
- `js/main/main.js`: new overview element references; obsolete grouping/chart references removed.
- `js/main/trackerEvents.js`: period refresh and empty-state Add wiring.
- `board/index.html`: overview shell, accessible controls, empty state, metrics/summary containers, gated Insights, and toolbar terminology.
- `css/global.css`: scoped light/dark overview styling, metric grid, summary, empty illustration, controls, responsive label, and removal of dead chart styles.
- `js/main/dashboardCharts.js`: removed after confirming no remaining production consumers.
- `test/quickOverview.test.mjs`: new pure calculation/date/timezone tests.
- `test/dashboardEmpty.test.mjs`: replace superseded Dashboard assertions with overview rendering/schema/state tests.
- `test/quickOverview.browser.mjs`: new real-startup-instance interaction/theme/responsive checks.
- `test/statusCustomization.browser.mjs`: focused overview runner mode and fixture-only startup-instance exposure.
- `test/workspaceSurfaces.browser.mjs`: verify new empty overview rather than obsolete chart/message DOM.
- `test/toolbarWidth.browser.mjs`: approved responsive Quick Overview label expectations.
- `docs/features.md`, `docs/architecture.md`, `docs/development.md`: local-only, Git-ignored overview and verification documentation updated without force-adding.

## Verification

- Baseline `npm test`: 209 passed, 0 failed before implementation.
- Calculation tests were written first and failed for missing helper behavior; all four then passed.
- New overview DOM tests failed against the old renderer; all three then passed. A later failing named-field regression proved the old date helper could substitute Next Action Date; the overview-specific guard fixed it.
- Final `npm test`: 214 passed, 0 failed.
- `JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs`: passed at 390, 430, 768, 1024, 1440, and 1920px in dark/light, with zero JavaScript errors. Verified both states, exact 12/3/1/3 fixture metrics, status counts/proportions, custom status color, no overflow, period-empty recovery, search/view independence, canonical refresh, active-search switching, Add/Cancel/Save, one revision for a real Add, and Escape/focus restoration. Shared landing regressions passed.
- The first Add-after-switch browser failure came from creating a second TrackerApp after normal startup; the original duplicate listener opened a stale form and canonical guards rejected the save without a revision. The focused fixture now observes the real startup instance; no production test hooks were added.
- `JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: passed seven widths (including 1280px), both themes, zero JavaScript errors. It first caught a 233px Search at 1024px; the responsive overview-icon rule restored useful width without sacrificing the Job Search selector.
- `JUBRO_SURFACES_ONLY=1 node test/statusCustomization.browser.mjs`: passed six widths, both themes, zero JavaScript errors, including existing Board/List, modal, and landing checks.
- Visually inspected generated dark 1440px populated and light 390px empty screenshots. The referenced screenshot files were not supplied; no pixel-match claim is made.
- Independent read-only review found no actionable issues and independently passed seven focused tests plus whitespace checks. No second review was needed.
- JavaScript syntax checks passed for all affected/new scripts; `package.json` and `package-lock.json` parsed successfully and remain unchanged. `git diff --check` passed.

## Limitations

Insights remains intentionally disabled; historical analytics were not rebuilt elsewhere. Need Attention uses the selected application-date scope, excludes terminal-status actions in V1, and does not infer semantic meaning for custom status names. Without an application-date field, period filtering cannot narrow rows. Existing custom-date defaults and modal focus behavior (including no new Tab focus trap) remain unchanged.

Browser verification used local headless Firefox and Firebase fixtures, not live accounts or physical devices. Superdesign CLI was unauthenticated, so the approved written layout and existing Jubro theme were used without an external canvas. No project dependencies were added or CSS build required. Work stayed in the user-approved development checkout; no merge, deployment, or push was performed.
