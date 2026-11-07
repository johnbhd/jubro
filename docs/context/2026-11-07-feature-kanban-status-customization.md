# Customize canonical Kanban Status options

## Date and type

- Date: 2026-11-07 (Asia/Manila)
- Type: feature

## Problem or goal

JUBRO-201.1 requires users to rename, recolor, and reorder their pipeline from the Board without creating a second status configuration. The existing Status select options already determine Kanban columns and application values. Current source has Board and List only: Table was removed in an earlier change, and Dashboard remains under More. Older references to a Table renderer and a 75-test baseline do not describe this checkout.

## Changes and resulting behavior

- Each configured status has a colored dot, subtle header tint, accent border, count, and accessible customization menu. Application cards retain neutral surfaces.
- Rename trims names, rejects blanks and case-insensitive duplicates, updates matching object and primitive row cells atomically, preserves unrelated fields and cell metadata, and updates active List/Board filters.
- Color selection stores a controlled key in the existing option `color` property. The shared option-color helper also serves List badges, filter markers, edit controls, and dashboard presentation.
- Move left/right reorders the actual Status options and does not change application assignments. First/last boundary actions are disabled.
- Native popovers provide compact menus above scrolling content; native dialogs provide modal focus containment. Buttons support keyboard focus, Escape, outside dismissal, and focus restoration.
- Missing colors receive deterministic visual defaults without a save on load. Renaming an uncolored legacy option explicitly stores its previous fallback color key so its accent does not change unexpectedly.
- The No status, missing-Status Applications, and orphan-value fallback columns remain readable and have no customization menu. The existing empty-board CTA remains intact. Status deletion is not added.
- Each changed customization uses one existing save call followed by a nonpersistent shared refresh. Cancel, invalid input, boundary moves, unchanged values, and menu interactions do not save. Local save rejection or a thrown storage error reloads persisted state. Dialogs reject replaced tracker/schema snapshots.
- An integration test exposed an existing supporting reliability defect: a normal save could replace a newly acknowledged cloud revision with the open controller's older snapshot. Normal account saves now preserve the acknowledged revision already in storage after ownership/local-revision validation. Explicit replacement still accepts reconciled cloud snapshots. This is necessary for consecutive signed-in customization saves; it does not add a new sync path or replace existing transaction protection.

## Files affected

Created:

- `js/services/statusColors.js`: trusted palette, legacy hex validation, deterministic fallback resolution.
- `js/main/statusSettings.js`: canonical Status mutations, column menus, rename/color dialogs, focus behavior.
- `test/statusCustomization.test.mjs`: 13 focused unit/integration tests.
- `test/statusCustomization.browser.mjs`: repeatable optional Firefox/WebDriver BiDi acceptance and visual checks.
- `docs/context/2026-11-07-feature-kanban-status-customization.md`: this record and detailed implementation report.

Modified:

- `js/main/kanban.js`: shared option colors, header dots/accents, configured-status menu entry points.
- `js/main/main.js`: compose the new settings methods into the existing TrackerApp.
- `js/main/trackerUtils.js`: shared trusted option-color presentation for existing consumers.
- `js/services/trackerData.js`: controlled color-key imports, legacy hex support, preserve absent color metadata.
- `js/storage/storage.js`: preserve acknowledged account cloud revisions during normal saves.
- `css/global.css`: header accents, menus, dialogs, palette, keyboard focus, theme and viewport styling.
- `test/storage.test.mjs`: regression for cloud acknowledgement preservation across open-controller saves.

Local-only ignored documents updated: `docs/features.md`, `docs/architecture.md`, `docs/data-and-auth.md`, and `docs/development.md`. The implementation plan is also local-only at `docs/superpowers/plans/2026-11-07-kanban-status-customization.md`.

## Verification

- New core tests first reproduced missing default colors, rejected color-key imports, and absent customization methods. All 13 feature tests now pass.
- A focused storage regression first reproduced cloud acknowledgement loss. The corrected path passes alongside existing cloud conflict, transaction, ownership, and sync tests.
- `npm test`: **94 passed, 0 failed**, including the existing 80-test baseline and 14 new cases. Ownership, guest transfer, stale saves, input/import safety, typed values, view consistency, startup write removal, sync coalescing/order, and routing remain covered.
- `node test/statusCustomization.browser.mjs`: passed using actual Board source and local Firebase fixtures. Covered native pointer outside dismissal, native Escape, focus return, disabled boundary actions, blank/duplicate validation, both dialog cancellations, the requested color/rename/reorder scenario, List/filter consistency, renamed drop/select handlers, No status behavior, rejected stale save, replaced-dialog snapshot rejection, and reload persistence. No JavaScript errors were observed.
- Browser matrix: dark and light themes at **390, 430, 768, 1024, 1440, and 1920 pixels**, 900px height. Assertions confirmed menu/dialog viewport fit, 44px menu touch targets, no page-level horizontal overflow, and correct dark/light accent borders. Captured Board and color-dialog screenshots in all 12 configurations. Visually inspected representative desktop Board screenshots in both themes and mobile Board/color-dialog screenshots.
- Latest browser artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-aEkcd8/`. These are disposable local screenshots, not committed assets.
- `node --check` across JavaScript/MJS files under `js`, `test`, and `scripts`: passed. New/updated customization scripts were checked again after browser-test additions.
- Parsed `package.json`, `package-lock.json`, and `vercel.json`: all 3 passed.
- `git diff --check`: passed for source changes; checked again after documentation completion.
- No new dependency, generated CSS edit, build, deployment, production account access, commit, or push was performed. The change and record remain together in the working tree; commit is pending authorization.

## Detailed implementation report

1. **Files inspected:** contributor/context rules and recent history; local overview documents; `package.json`; `board/index.html` via existing tests; `js/main/kanban.js`, `main.js`, `trackerState.js`, `trackerEvents.js`, `trackerActions.js`, `trackerUtils.js`, `trackerSorting.js`; List settings, filters, badges, and edit modal; tracker validation/JSON services; Storage and Firebase sync; existing Kanban, storage, tracker-state, import, and Firebase fixture tests; relevant CSS. `table.js` and `trackerTableActions.js` are absent in the current source.
2. **Files created:** listed above, including the focused tests, browser runner, and this record. The ignored plan is local-only.
3. **Files modified:** listed above; existing List consumers reuse the updated shared option-color helper without separate color maps.
4. **Existing schema:** legacy option strings or `{ label, color }` objects; `color` previously accepted validated six-digit hex strings.
5. **Color model:** extend the same optional `color` property to controlled identifiers; no separate Kanban status store.
6. **Backward compatibility:** strings, absent colors, and valid legacy hex colors remain supported. Import normalization preserves absent color metadata and existing names/order.
7. **Defaults:** Applied blue, Screening cyan, Interview green, Offer purple, Rejected red. Other names use a stable label hash into the trusted palette. Render/load does not write.
8. **Header:** colored dot, readable title, count, 44px menu button, top accent, subtle tint; neutral cards.
9. **Menu:** Rename status, Change color, Move left, Move right. Native auto popover, real menu buttons, arrow-key navigation, Escape, outside dismissal, focus restoration.
10. **Rename:** native dialog using the existing List dialog visual language; trim, validate, mutate, save once, refresh once.
11. **Rows:** match old labels case-insensitively with surrounding whitespace ignored; normalize changed select values, preserve unrelated values and object metadata.
12. **Duplicates:** reject case-insensitive duplicates with a visible error before mutation.
13. **Blanks:** reject empty and whitespace-only names before mutation.
14. **Picker:** ten real buttons with accessible color names, `aria-pressed`, visible selected checkmark/ring, Cancel and Save.
15. **Palette:** blue, green, yellow, orange, red, purple, pink, cyan, indigo, slate.
16. **Color persistence:** the chosen key lives on the actual Status option and round-trips JSON/backups. One canonical save and one logical sync per changed choice.
17. **Move left:** splice the configured option one position earlier; save once.
18. **Move right:** splice it one position later; save once.
19. **Boundaries:** first-left and last-right disabled; mutation API rejects invalid movement without saving.
20. **No status:** system fallback remains visible for blank values, is not renamed, and has no customization menu.
21. **Deletion:** omitted intentionally; no new destructive status operation.
22. **List consistency:** immediate updated values, labels, filters, and shared colors; browser and automated checks passed.
23. **Table consistency:** not applicable; Table was already retired. It was not restored.
24. **Filters:** shared option sources refresh; selected matching filters follow a rename. Native select options are updated before assigning the renamed selected value.
25. **Drag/drop:** automated mutation checks and browser drop-handler regression save renamed labels and reject removed labels.
26. **Mobile status select:** options follow current names/order; browser change-handler check passed after rename/reorder.
27. **Imports/exports:** new keys accepted and preserved; valid old hex supported; unknown color keys/arbitrary CSS rejected; extra option style properties discarded.
28. **Legacy fixture:** string options render default colors, customize successfully, and survive validated import/export.
29. **Dark mode:** 6 viewport configurations passed; representative screenshots reviewed.
30. **Light mode:** 6 viewport configurations passed; representative screenshots reviewed.
31. **Mobile:** 390px and 430px viewport/menu/dialog/touch-target checks passed.
32. **Tablet:** 768px and 1024px viewport checks passed.
33. **Desktop:** 1440px and 1920px viewport checks passed.
34. **npm test:** passed.
35. **Test count:** 94 total, 94 passed, 0 failed; optional browser suite is separate from that count.
36. **Syntax:** JavaScript/MJS checks passed.
37. **JSON:** 3 repository JSON files parsed successfully.
38. **Whitespace:** `git diff --check` passed.
39. **Dependencies:** none added.
40. **Limits:** local Firefox with simulated Firebase and viewport sizes, not production Firebase or physical devices; modern native dialog/popover support required; generated asset build not run.
41. **JUBRO-203:** not implemented; existing Add Application behavior and empty-board CTA preserved.
42. **Recommended next task:** JUBRO-203 — replace placeholder application creation with the proper Add Application modal and explicit Save/Cancel behavior.

## Limitations

Live Firebase rules, real accounts, physical touch devices, other browser engines, and production hosting were not verified. The browser runner requires a local Firefox executable, Node WebSocket support, and free debugging port 9238. Native dialog/popover APIs require a modern browser. The existing empty-board CTA continues hiding configured empty columns when there are no applications. No new status creation or deletion workflow was added. Table remains retired. JUBRO-203 remains separate.

## Integration authorization

On 2026-11-07 the user authorized committing the remaining Board/List work and
pushing only development. This record accompanies that implementation commit;
earlier no-commit/no-push statements describe the implementation-stage checks.
The preceding cross-column drag commit remains separate and unchanged.
