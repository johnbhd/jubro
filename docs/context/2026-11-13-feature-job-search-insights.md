# Dedicated Job Search Insights workspace

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: feature

## Problem or goal

Quick Overview provided a lightweight summary but its View Insights action was disabled. The requested deeper progress view needed its own `/dashboard/` URL without introducing another workspace, ownership policy, analytics store, or fictional status history.

## Changes and resulting behavior

- `/dashboard/` and `/dashboard` reuse the Board HTML shell through Vercel rewrites. `TrackerApp` renders a dedicated Job Search Insights page by pathname. This avoids copying the header, Job Search management, auth UI, and modal implementations into another page. Other static servers require an equivalent rewrite.
- Workspace navigation now exposes Board, List, and Insights. Quick Overview remains a separate top-header summary action and a modal, with an enabled same-search View Insights link. Back to Board preserves the current Job Search. Explicit `view=kanban|list` links select the requested Board view without overwriting the saved preference; actual user view changes still use the existing preference.
- Insights reuses startup, loading/Retry, authentication resolution, guest transfer, canonical state, selector switching, revision checks, sync notifications, and Add/Edit forms. Analytics loading has neutral placeholders. Switching searches updates the canonical URL and redraws from that search only.
- Pure helpers calculate 7 Days, 30 Days (default), 3 Months, and All Time. Period selection stays page-local. Application Date is resolved by name, never by a guessed array position, unrelated date field, save timestamp, or sync timestamp. Local calendar arithmetic handles inclusive boundaries and DST. The rolling three-month start clamps the corresponding date before advancing to the first included day.
- Applications, current Interview status, and current Offer status metrics use the selected application-date period. Need Attention and Pipeline use the entire current search. Interview/Offer counts explicitly do not represent historical transitions. Quick Overview uses the same attention rules and now includes older applications outside its application-date filter.
- Need Attention requires meaningful action text, a valid date through tomorrow, and nonterminal status. Rejected and Withdrawn remain excluded. The preview shows at most five urgent rows, sorted oldest due date first, with relative labels. View Upcoming expands to all valid pending actions, including future dates. Rows open the existing editor.
- Activity uses daily bars for seven days, five six-day buckets for thirty days, weekly buckets for three months, and monthly buckets for All Time. Bars retain textual counts and labels. Undated/invalid-date records count in All Time totals but not bounded periods or activity bars; the page explains this. Period-empty activity does not hide the current pipeline or attention.
- Pipeline follows schema Status order and existing Kanban colors, including custom hex colors, then unconfigured values and No status. Platform uses canonical options and Other for unknown/blank values. Work Setup and Employment Type show meaningful period values only. No conversion claims or scores are introduced.
- Empty searches show No insights yet and the existing Add Application action. UI-only examples never enter calculations. Add Cancel does not mutate data. Canonical refresh updates Insights after existing application actions.
- Rendering uses textContent, DOM construction, and existing validated status colors. The metric grid becomes 2 × 2 on mobile; major sections stack and charts contain horizontal scrolling. Both themes reuse existing workspace surfaces. The empty CTA has a blue 44px primary touch target.
- Review found that moving Quick Overview to the top header could bypass the workspace loading boundary. The opener is now hidden during loading/Retry, and modal opening checks loading, workspace availability, and ownership. Focus returns to the actual summary opener.

## Files affected

Inspected existing startup, tracker state/actions/events, Job Search management, Board/List view and field helpers, Quick Overview, auth readiness, loading controller, status/date validation, theme styles, Vercel configuration, relevant context records, and local documentation.

Created:

- `js/main/insights/calculations.js`: pure dates, metrics, attention lists, activity buckets, and breakdowns.
- `js/main/insights/navigation.js`: dedicated-route detection and same-search navigation links.
- `js/main/insights/render.js`: canonical schema extraction, safe dashboard rendering, period and upcoming interactions, existing Add/Edit integration.
- `test/insights.test.mjs`, `test/insightsNavigation.test.mjs`, `test/insightsSchema.test.mjs`: calculation, schema, timezone, navigation, and read-only regressions.
- `test/insights.browser.mjs`: actual-startup page, theme, responsive, isolation, form, and navigation checks.
- This context record.

Modified:

- `board/index.html`, `css/global.css`: shared Insights container, navigation/summary actions, real Insights link, loading placeholders, responsive theme styling, and CTA sizing.
- `js/main/main.js`, `js/main/trackerActions.js`: page-aware canonical rendering and refresh without duplicate workspace controllers.
- `js/main/listView/boardView.js`: explicit view entry and same-search return navigation.
- `js/main/jobSearch.js`: reset tracker-specific Upcoming expansion on workspace changes.
- `js/main/quickOverview.js`, `js/main/trackerDashboard.js`, `js/main/trackerEvents.js`: shared attention rules/metric definitions, full-search attention count, guarded summary opening, opener focus, and Insights link lifecycle.
- `js/main/workspaceLoading.js`: select analytics placeholders for the dedicated route.
- `vercel.json`: dedicated dashboard rewrites.
- `test/dashboardEmpty.test.mjs`, `test/quickOverview.browser.mjs`, `test/toolbarWidth.browser.mjs`, `test/workspaceLoading.browser.mjs`, `test/statusCustomization.browser.mjs`: summary scope/focus/ownership guards, updated navigation expectations, fixture rewrite, loading coverage, and browser diagnostics.
- Local-only ignored `docs/architecture.md`, `docs/features.md`, `docs/development.md`, and `docs/plans/2026-11-13-job-search-insights.md`: architecture, behavior, verification, and task guidance. No ignored overview was force-added.

## Verification

- Baseline `npm test`: 239 passed, 0 failed. Latest full run: 252 passed, 0 failed, including 13 additional tests across Insights and Quick Overview.
- Test-first calculation/navigation imports failed before their implementations existed, then passed. Focus restoration and pending-owner exposure tests each reproduced incorrect behavior before the fix, then passed. A browser assertion reproduced the undersized empty Add action before scoped CTA sizing fixed it.
- `JUBRO_INSIGHTS_ONLY=1 JUBRO_LOADING_ONLY=1 node test/statusCustomization.browser.mjs`: passed with zero JavaScript errors. Verified dedicated analytics loading, both themes, populated/empty Insights at 390, 430, 768, 1024, 1440, and 1920px; shared Board/List skeleton matrices; transfer dialog access; Retry; stale account completion; hidden summary action during unresolved ownership; same-search navigation; Add Cancel; editor reuse; and read-only analytics. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-8pHNap`.
- `JUBRO_INSIGHTS_ONLY=1 JUBRO_OVERVIEW_ONLY=1 JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: passed with zero JavaScript errors. Verified final blue empty CTA touch target, navigation icon visibility, all Insights theme/width combinations, Quick Overview populated/empty matrices, canonical metric updates and status colors, and toolbar widths including 1280px. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-wqn2pk`.
- Both completed combined browser runs also passed shared landing regressions in dark/light at six widths. Headless Firefox reported inactive-window native keyboard skips; synthetic focus fallback was used. Earlier isolated overview/toolbar fixture attempts aborted with Firefox NS_BINDING_ABORTED, not a product assertion; the completed combined run passed their actual assertions.
- Final `JUBRO_INSIGHTS_ONLY=1 node test/statusCustomization.browser.mjs` passed with zero JavaScript errors after adding the explicit Insights Add Save regression. Verified one canonical application, one revision, immediate empty-to-populated refresh, and the same active Job Search on return to Board. Both theme/six-width matrices and shared landing regressions passed again. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-Q2gGpG`.
- Visually inspected dark desktop populated Insights and light mobile empty Insights. Final screenshot confirmed the blue padded CTA, compact navigation, existing illustration, and no page overflow.
- Twenty affected/new JavaScript modules passed syntax checks. All project JSON parsed. `git diff --check` passed.
- Independent read-only review found one P1 loading/ownership issue, fixed with a RED-to-GREEN regression and the full green suite. No further actionable findings were reported. Live Firebase and deployed Vercel routing were outside that review.
- `npm run build` could not run because the local `tailwindcss` executable is absent. All new presentation classes are authored in `css/global.css`; no new Tailwind utility generation, package changes, or dependencies were required. Production build remains unverified.

## Limitations

No status-transition history exists, so Interview/Offer metrics describe current status within an application-date cohort, not when that stage was reached. Application date names must be recognizable; missing fields yield explained undated records rather than guessed dates. Live Firebase, deployed rewrite behavior, physical-device interaction, and native active-window keyboard delivery remain unchecked. Plain static servers need the documented dashboard rewrite. The recommended next task is live-account/deployment acceptance and restoring the existing local build tooling, not additional analytics features. Changes and this record remain uncommitted pending commit authorization; no push performed.
