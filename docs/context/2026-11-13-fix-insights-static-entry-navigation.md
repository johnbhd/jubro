# Insights static entry and first-navbar actions

## Date and type

- Date: 2026-11-13 (Asia/Manila)
- Type: fix

## Problem or goal

The user reported that View Insights did not open the page and requested Insights and Quick Overview in the first navbar. The previous implementation had no physical dashboard entry and relied on Vercel rewrites. Its browser fixture repeated that rewrite, and its navigation test forced a second navigation after clicking the link, masking ordinary static-server compatibility problems.

## Changes and resulting behavior

- Added a real `dashboard/index.html`. It loads a small entry module that fetches trusted local Board markup, validates the shared shell, removes scripts, installs the body, and imports shared startup once. The URL remains `/dashboard/` with the same tracker query. Forms, auth, ownership, and workspace data are not duplicated.
- Shared startup now handles an already-parsed document as well as normal DOMContentLoaded entry. Shell/network/markup failures show Retry without creating or changing workspace data.
- Insights and Quick Overview are both in the first/top navbar. Insights is removed from the second workspace toolbar. Both top actions stay hidden during unresolved loading or unavailable-workspace Retry.
- Compact header spacing and account-name truncation preserve mobile space. The small brand tagline hides on tablet when full action labels need room.
- Removed dashboard-specific rewrites and the browser fixture shortcut. Browser acceptance now clicks View Insights, Back to Board, and first-navbar Insights and waits for the resulting real startup rather than forcing a replacement URL.
- Existing analytics, canonical ownership/revision checks, Add/Edit forms, and sync behavior remain unchanged. No dependencies were added.

## Files affected

- Created `dashboard/index.html` and `js/dashboardEntry.js`: static route, shared-shell loading, safe failure UI.
- Modified `js/app.js`: normal and late-import startup compatibility.
- Modified `board/index.html`, `css/global.css`: first-navbar placement, loading guards, responsive header spacing.
- Removed the prior uncommitted dashboard rewrite additions from `vercel.json`; its resulting content matches the committed configuration.
- Created `test/dashboardEntry.test.mjs` and `test/dashboardEntryLoader.test.mjs`: physical route, navbar placement, and safe network/HTTP/markup failure regressions.
- Modified `test/insights.browser.mjs`, `test/toolbarWidth.browser.mjs`, and `test/statusCustomization.browser.mjs`: real navigation clicks, first-navbar expectations, and ordinary static serving.
- Updated ignored local `docs/architecture.md`, `docs/features.md`, and `docs/development.md`. Earlier context records remain unchanged.

## Verification

- New physical-entry and first-navbar tests failed first: the dashboard file was missing and Insights was still in the second toolbar. Both pass after the fix.
- Entry failure tests cover network failure, non-OK HTTP response, and invalid shared markup. They verify visible Retry and no storage writes.
- `npm test`: 255 passed, 0 failed, preserving existing auth, ownership, transfer, and analytics regressions.
- Combined Insights/loading/toolbar browser run passed with zero JavaScript errors. It used the real static dashboard page, an actual View Insights click, both themes at 390, 430, 768, 1024, 1440, and 1920px, toolbar checks including 1280px, shared loading/Retry/stale-account checks, and landing regressions. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-goefdP`.
- Final focused Insights browser run passed with zero JavaScript errors. It clicked View Insights, Back to Board, and first-navbar Insights without forced replacement navigation, preserved the active search and Board/List preference, and passed both themes at six widths plus shared landing regressions. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-gMVJx5`.
- An intermediate attempt timed out during Firefox session creation while the unit suite was running. A combined follow-up passed the target assertions but aborted during a shared landing reload with NS_BINDING_ABORTED. The final sequential run completed successfully; neither failure was hidden by changing product behavior.
- Entry/startup and affected browser JavaScript syntax checks passed. Configuration/package JSON parsed. `git diff --check` passed.

## Limitations

The entry makes one local request for the shared workspace shell. Failure uses Retry rather than an assumed-empty workspace. Live Firebase, deployed hosting, physical devices, and native active-window keyboard delivery are not verified. The previously reported missing local Tailwind executable is unchanged; this fix uses authored CSS and existing utilities. Changes and this record remain uncommitted; no push performed.
