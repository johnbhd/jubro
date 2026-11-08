# Compact Board toolbar and direct Dashboard navigation

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

Dashboard and sorting lived inside More, the desktop search consumed excessive width, and mobile navigation occupied two levels. The approved update makes Dashboard directly reachable and keeps primary mobile navigation on one row.

## Changes and resulting behavior

- Dashboard moves into the toolbar with its existing modal behavior, accessible expanded state, and trigger-focus restoration. More retains Import JSON and Export JSON.
- Search and sorting share one bordered control. Labels are Newest, Oldest, Manual, and Select field; existing sort values and render-only behavior remain unchanged. Dependent field filters appear beneath this control rather than in More.
- Mobile uses six non-shrinking 40px icon controls alongside a shrinking Job Search selector. The title truncates independently from its chevron. Tablet retains action labels and uses the Search icon, per the user's selected approach.
- Below 1024px Search opens a temporary row beneath the primary toolbar. Close/Escape restores focus without clearing the query or sort. Desktop shows inline search capped at 440px and full action labels.
- Kept canonical mutations, storage, revisions, and sync paths unchanged. Added no dependencies and did not regenerate Tailwind assets.

## Files affected

- `board/index.html` and `css/global.css`: toolbar structure, responsive presentation, grouped search/filter controls, accessible labels, and Dashboard dialog semantics.
- `js/main/jobSearch.js`: safely rendered title/chevron nodes.
- `js/main/trackerEvents.js`, `trackerKeyboard.js`, and `trackerSorting.js`: retain sorting beside Search and manage temporary search visibility independently of filters.
- `js/main/trackerDashboard.js`: expanded state and focus restoration.
- `test/statusCustomization.browser.mjs`: responsive geometry, direct Dashboard access, search/filter placement, focus, and zero-revision assertions. Its fixture server omits the external Google Font import so landing navigation does not depend on that service responding.
- This context record; ignored local architecture/features/development overviews and execution ledger updated separately.

## Verification

- `npm test`: 149 passed, zero failed.
- New browser assertion failed before implementation because Dashboard/Sort remained in More. Screenshot inspection exposed a hidden-button display conflict; the new desktop-alignment assertion reproduced it before the CSS fix.
- Focused Firefox/BiDi runner passed with no JavaScript errors in dark/light themes at 390, 430, 768, 1024, 1440, and 1920px. It checks one-line navigation, icon/text breakpoints, touch dimensions, long-title truncation, search expansion, focus, selector/dialog fit, and unchanged revisions.
- Full Firefox/BiDi status customization and mouse/touch Board/List drag regression also passed, with no browser errors. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-woWNaS/`.
- Reviewed representative dark/mobile and light/1024px toolbar screenshots. Final focused artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-Nlh6fW/`.
- JavaScript syntax, package/deployment JSON parsing, and `git diff --check` passed.
- `npm run build` remains blocked by `tailwindcss: not found`. No dependency installation or generated asset edits performed.

## Limitations

Physical devices, other browser engines, live Firebase, and deployed behavior are not verified. Initial browser attempts included a transient popover-geometry failure and external-font navigation timeouts; the complete successful run is distinguished above. No push or deployment. Static landing-preview and public-link changes follow in the next commit.
