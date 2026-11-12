# Add an instructional example to empty List view

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

Empty Kanban Boards already displayed an instructional example application, but empty List view only said "No rows yet." Add an equivalent List guide without creating fake application records or changing real application behavior.

## Changes and resulting behavior

- A valid Job Search with zero canonical rows now shows a dashed EXAMPLE card in List, using the existing guide surface and List's position-first identity layout.
- The guide displays instructional date/platform, position, company, and employment/work-setup content. Its status badge and accent follow the first configured Status option, including legacy string options and custom colors. Missing Status fields/options omit the badge safely.
- The example has no application row index, editing/menu controls, or drag session. Application counts remain zero; no example enters canonical rows, exports, search/filter results, revisions, or sync.
- An explanatory paragraph and Add Application button reuse the existing blank application form. Opening and canceling do not save. Saving one real application removes the guide; removing the last application restores it.
- Filtering a populated Job Search does not create an example. Existing real List card rendering remains unchanged.

## Files affected

- `js/main/listView/render.js`: render the UI-only guide for confirmed empty rows and connect its CTA to the existing form.
- `css/global.css`: compact wrapping guide content and CTA alignment; reuse existing light/dark guide styles.
- `test/listViewIdentity.test.mjs`: three regression tests for read-only rendering, status compatibility, counts, controls, and guide lifecycle.
- `test/listGuide.browser.mjs`: focused real-browser checks for responsive themes, Add/Cancel/Save, search exclusion, and restoration after deletion.
- `test/statusCustomization.browser.mjs`: wire the focused `JUBRO_LIST_GUIDE_ONLY=1` check into the existing Firefox fixture runner.
- `docs/features.md`: update local List behavior documentation; local-only and Git-ignored.

## Verification

- Added the three unit tests first and observed all three fail because the guide was absent; existing five List identity tests passed.
- `node --import ./test/register-loader.mjs --test test/listViewIdentity.test.mjs`: 8 passed after implementation.
- `npm test`: 207 passed, 0 failed.
- `JUBRO_LIST_GUIDE_ONLY=1 node test/statusCustomization.browser.mjs`: passed with zero JavaScript errors. Verified List guide at 390, 430, 768, 1024, 1440, and 1920px in dark and light themes, no horizontal overflow, readable title color, zero-row counts, unchanged canonical storage on render/Cancel, and existing blank Add form. Saving created one real row/revision; search with no matches did not show an example; deleting the last row restored it. The runner also passed its shared landing checks.
- Visually inspected generated dark 390px and light 1440px screenshots. Mobile retains the existing stacked filter sidebar, so the guide follows that sidebar below the initial viewport.
- `node --check` passed for the modified List renderer and all three affected test scripts.
- Parsed `package.json` and `package-lock.json` successfully; no JSON changes or dependencies added.
- `git diff --check`: passed.

## Limitations

Browser verification used local headless Firefox with Firebase fixtures, not a live account or physical touch device. No CSS rebuild was needed: new layout styles use authored global CSS and existing utilities. The existing List sidebar layout is unchanged. No push was performed.
