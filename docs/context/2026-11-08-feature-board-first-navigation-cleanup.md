# Cycle D: Board-first landing, terminology, and final regression fixes

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

Public navigation still described tracker management, and landing instructions still taught creation before opening the workspace. Final verification also exposed stale preview/import behavior and selector geometry during viewport changes.

## Changes and resulting behavior

- Landing and shared navigation use Open Jubro links to `/board/`. Removed the duplicate Trackers navigation item and changed visible instructions to Board-first entry. The legacy collection URL remains a redirect and is no longer advertised in the sitemap.
- Account, transfer/conflict, import, and status-dialog messages use Job Search terminology. Internal tracker identifiers, storage keys, backup schema, and Firestore documents are unchanged.
- Landing preview now renders without optional aggregate counters, counts real application rows, hides static preview examples initially, and refreshes on both successful and failed account loading. A failed load cannot leave the previous workspace's title/cards/link visible.
- Existing Board import now imports Storage explicitly and captures workspace/revision/active-target context before awaiting the file chooser. A file opened for a previous search cannot replace the newly selected search.
- Selector popovers reposition after viewport resize/layout, preventing a desktop coordinate from overflowing a narrow viewport. Retry content is placed inside the workspace wrapper rather than beside it in the flex body.
- Corrected contradictory local overview descriptions of sample rows, collection routing, inline title editing, and Add behavior.

## Files affected

- Modified `index.html`, `components/navbar.html`, `components/footer.html`, `board/index.html`, and `sitemap.xml` for navigation, preview defaults, and wording.
- Modified `js/main.js`, `js/auth/auth.js`, `js/auth/firebaseAuth.js`, `js/main/statusSettings.js`, and `js/services/trackerData.js` for previews and user-facing language.
- Modified `js/main/jobSearch.js` and `js/main/trackerEvents.js` for responsive positioning, Retry placement, and safe import context.
- Expanded `test/statusCustomization.browser.mjs`; corrected its static server's root-directory handling and scoped CTA assertions to links rather than hidden authentication buttons.
- Created this context record. Local-only index/project/architecture/features/data-and-auth/development overviews and the execution ledger were updated without force-adding ignored documentation.

## Verification

- `npm test`: 149 passed, zero failed. No Node tests removed; focused replacement assertions retain existing behavior coverage.
- Full Firefox/BiDi runner passed with no browser JavaScript errors, both themes, six widths (390, 430, 768, 1024, 1440, 1920), and existing mouse/touch Board/List input cases.
- New browser checks cover landing/shared CTA destinations, legacy redirect, real validated Board import, pending-import rejection after switching, failed-account landing-preview clearing, and failed empty account Retry without default creation.
- Observed the stale import and failed-preview assertions fail before their fixes and pass afterward. Measured and corrected selector overflow at viewport 390px after a desktop resize.
- Independent read-only review ran all 149 Node tests, found no Critical issues, and identified the preview failure plus stale-import issue. Both were fixed and verified. Its documentation contradictions were corrected.
- JavaScript syntax checks, package/deployment JSON parsing, and `git diff --check` passed before commit. No dependencies added.
- Final disposable browser screenshots/results: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-yhgnty/`. Reviewed representative dark mobile guide and light desktop Add screenshots during Cycle C.

## Limitations

`npm run build` remains blocked locally by the missing existing `tailwindcss` executable; authored CSS works in browser checks and generated CSS was not manually changed. Live Firebase, Vercel redirect deployment, other browser engines, and physical mouse/touch hardware remain unverified. No push or deployment performed. The next task is physical-device and live-test-account acceptance verification, not another feature cycle.
