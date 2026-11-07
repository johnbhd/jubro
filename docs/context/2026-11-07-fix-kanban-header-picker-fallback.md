# Correct Kanban headers, circular palette, and No status menu

## Date and type

- Date: 2026-11-07 (Asia/Manila)
- Type: fix

## Problem or goal

The initial JUBRO-201.1 implementation tinted an inset header because the column owned padding. Color choices stretched across fractional grid tracks, producing ovals. No status lacked the menu trigger used by configured columns. This correction is limited to those presentation and interaction issues.

## Changes and resulting behavior

The header now touches the column's inner top, left, and right borders. Padding lives in the header and card-list body rather than around both. Top-only header radii match the column, the stronger accent border remains, and neither cards nor column bodies receive status tint. Overflow remains visible; native top-layer menus are not clipped.

Palette tracks and button width/height are fixed at 44px. Buttons use inline-flex centering, zero padding, and 50% radius. Ten choices occupy two rows of five. Borders, hover outlines, selected rings, and focus outlines do not resize the buttons.

No status reuses the existing popover, focus behavior, palette, and dialog. Only Change color is exposed. Its dialog explicitly labels this color as session-only. The chosen controlled key lives on the current UI controller, not in tracker state or a Status option. It survives nonpersistent redraws, not a page reload. This uses the user-approved nonpersistent fallback alternative and avoids a new persistence/import schema. Cancel, save, and menu actions for this fallback perform no canonical save or sync. Blank row values remain blank. Configured status mutations are unchanged.

## Files affected

- `css/global.css`: edge-to-edge header padding/radii, body padding, fixed circular palette and hover treatment.
- `js/main/kanban.js`: remove outer/header margin utilities, attach fallback menu, resolve temporary fallback color.
- `js/main/statusSettings.js`: reuse menus/dialogs for the color-only fallback without canonical mutations.
- `test/statusCustomization.browser.mjs`: regression assertions for header geometry, equal heights, all menu triggers, menu viewport fit, fixed circles, centered selection, fallback cancel/save isolation, and existing customization behavior.
- `docs/context/2026-11-07-fix-kanban-header-picker-fallback.md`: this record.
- Local-only ignored `docs/features.md`: current header, palette, and fallback-menu behavior.

## Verification

- Before implementation, new browser assertions reproduced inset headers and missing fallback menu. A separate run reproduced noncircular swatches.
- `npm test`: 94 passed, 0 failed. Existing unit/integration test count is unchanged; new visual/interaction assertions live in the optional browser suite.
- `node test/statusCustomization.browser.mjs`: Firefox with repository Firebase fixtures, not live Firebase. Checks include configured rename/color/reorder, matching row updates and filters, drag/drop and mobile-select handlers, cancellation, stale save/snapshot rejection, reload persistence, and no JavaScript errors.
- Both themes at 390, 430, 768, 1024, 1440, and 1920px, height 900px: header geometry/height, all four unclipped menus, 44px touch targets, 44px circular swatches, centered checkmarks, dialog fit, and no page overflow. Board and dialog screenshots captured in all configurations. Visually reviewed screenshots covering both themes and all six widths.
- Latest screenshot artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-bkWE10/` (disposable local files, not committed assets).
- JavaScript/MJS syntax checks across `js`, `test`, and `scripts` passed. `git diff --check` passed.
- No dependency, schema, storage, ownership, revision, sync, card design, toolbar, column width, or JUBRO-203 implementation changes.
- No commit, push, deployment, or generated-asset build. Commit remains pending authorization; preserve this record with its corresponding changes.

## Final correction report

1. Inset root cause: column-level `p-3` surrounded the header.
2. Structure/CSS: remove outer padding and header bottom margin; pad header and card-list separately; match top radii.
3. Full width: browser geometry confirms all headers touch their inner column borders, without neutral gaps.
4. Dark mode: subtle tinted headers, strong dots/borders, readable text, neutral cards verified.
5. Light mode: pale tinted headers and unchanged neutral cards verified.
6. Oval root cause: fractional grid columns stretched buttons whose dimensions only had minimums.
7. Sizing: fixed 44px grid tracks, width, and height; no growth or full-width buttons.
8. Circles: every swatch is 44 by 44px in all twelve theme/viewport combinations.
9. Selection: centered checkmark and ring remain; hover/focus do not change geometry.
10. Fallback menu: same real 44px trigger, top-layer popover, Escape and focus handling.
11. Fallback actions: Change color only, explicitly session-only; no Rename, Move, or Delete.
12. Fallback semantics: blank row cells remain blank; no fabricated Status option or canonical save.
13. Rename: existing atomic row/option updates and active filters pass regression checks.
14. Color: configured color choices persist through the original save path and fill the full header.
15. Reorder: configured option order and header presentation move together; boundary actions remain disabled.
16. Drag/drop: renamed status drop and mobile-select handlers pass.
17. Mobile: 390/430px checks passed, with horizontal Board scrolling and fitting dialog.
18. Tablet: 768/1024px checks passed.
19. Desktop: 1440/1920px checks passed.
20. Tests: 94 passed, 0 failed; optional browser acceptance suite passed separately.
21. Checks: JavaScript/MJS syntax and whitespace checks passed.
22. Limits: fallback color resets on page reload. Local Firefox/fixture verification only; no physical devices, other engines, live accounts, or build/deployment verification. Native dialog/popover support remains required.

## Limitations

Fallback color is intentionally session-only, disclosed in the dialog. No new persistent fallback metadata was introduced. Browser verification uses local Firefox and simulated Firebase, not physical devices or live accounts. No new dependencies. JUBRO-203 remains untouched.

## Integration authorization

On 2026-11-07 the user authorized committing the remaining Board/List work and
pushing only development. This record accompanies that implementation commit;
earlier no-commit/no-push statements describe the implementation-stage checks.
The preceding cross-column drag commit remains separate and unchanged.
