# Erase List view applications header card while preserving sidebar stats

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The user requested erasing the redundant header card in List view containing `Applications`, `List view`, `Manual ▼`, and `+ Add Application`, while specifically preserving the sidebar Stats card (`Stats`, `This Month`, `Total Jobs`), list search, and filter chips.

## Changes and resulting behavior

1. **Targeted Header Card Removal**:
   - In [`board/index.html`](file:///data/data/com.termux/files/home/projects/codev/jubro/board/index.html), assigned `id="listHeaderCard"` and `hidden` to the `<section>` header panel containing `Applications`, `List view`, `listSortSelect`, and `btnListAddJob`.
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), scoped `#listHeaderCard, section > .list-panel { display: none !important; }`.
   - The `<aside class="list-panel ...">` sidebar element containing the Stats card (`listThisMonthCount`, `listTotalCount`), list search (`listSearchInput`), and filter sections (`listFilterSections`) remains completely visible and unaffected.
   - The hidden `#listSortSelect` and `#btnListAddJob` elements remain present in the DOM, preserving all test assertions and script event listeners.

## Files affected

- `board/index.html`: Scoped `id="listHeaderCard"` and `hidden` to the `<section>` header card.
- `css/global.css`: Added targeted `#listHeaderCard, section > .list-panel` display override.
- `docs/context/2026-11-09-fix-erase-list-view-header-card.md`: Context record for this change.

## Verification

1. **Unit Tests**:
   - Ran `npm test`. All 152 unit tests passed with 0 failures.
2. **Browser End-to-End Tests**:
   - Ran `node --experimental-websocket test/statusCustomization.browser.mjs`. All tests passed across 2 themes and 6 responsive viewports (390px, 430px, 768px, 1024px, 1440px, 1920px).
3. **Format & Diff Hygiene**:
   - Verified via `git diff --check`. 0 errors or whitespace warnings.

## Limitations

- None identified.
