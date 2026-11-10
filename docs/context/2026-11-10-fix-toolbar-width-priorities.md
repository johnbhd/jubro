# Protect Job Search context in the Board toolbar

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

Desktop Search reserved a 400–420px preferred width while the Job Search navigation could shrink to almost nothing. Tablet action labels also competed with the title. The title span separately reserved an unnecessary 22px, clipping Internship Search even inside a 200px selector. On mobile, the selector's viewport-based cap could exceed its shrinking parent and overlap neighboring controls.

The requested change was layout-only: protect active workspace context, reduce Search width, retain compact sorting and adjacent chevrons, and preserve all existing controls and product behavior.

## Changes and resulting behavior

- At 768px and above, Job Search navigation does not shrink and the selector has a 200px minimum and 240px maximum. Ordinary names are fully readable; genuinely long names retain ellipsis.
- Removed the title span's extra percentage-based width reservation. Flexbox now allocates title space beside the non-shrinking chevron, retaining the existing 6px gap instead of spreading the arrow across the button.
- Below 768px, the title container shares remaining space with fixed-size icon controls. Its button respects the parent width, avoiding overlap. No desktop minimum is imposed on mobile.
- Search and Sort remain grouped. The combined desktop control now prefers 340px, can shrink to 260px, and is capped at 350px rather than growing on large screens. Sort is constrained to 100–110px; the existing option-specific width helper and sort behavior are unchanged.
- Dashboard and Custom Fields use their existing accessible icons below 1280px, restoring text labels at larger widths. Add Application uses its existing accessible primary-action icon below 1024px and keeps its label above that breakpoint. Board/List retain their existing segmented control and label breakpoint.
- Existing temporary Search behavior below 1024px, dropdown anchoring/content, control heights, toolbar ordering, theme surfaces, and application logic are unchanged. No production JavaScript, HTML, storage, authentication, Firebase, or synchronization code changed. No dependencies were added.

## Files affected

- `css/global.css`: Flex priorities, responsive widths, title-space allocation, and secondary label breakpoints.
- `test/toolbarWidth.browser.mjs`: Focused real-DOM responsive regression checks and screenshots.
- `test/statusCustomization.browser.mjs`: Focused toolbar mode, 1280px coverage, and updated label expectations in the existing toolbar matrix.
- `docs/architecture.md`, `docs/features.md`, `docs/development.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-fix-toolbar-width-priorities.md`: This tracked record.

## Verification

- Added browser checks before changing production CSS. The initial run exposed overlapping mobile controls and insufficient sort sizing. A later measured failure showed Internship Search needed 160px while the old title-span cap allowed only 158px in a 200px selector; removing the redundant cap fixed that case without increasing the minimum.
- `npm test`: 188 passed, 0 failed.
- `JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: Passed, zero JavaScript errors. Both themes verified at 390, 430, 768, 1024, 1280, 1440, and 1920px. Checks cover four ordinary names, bounded long titles, adjacent visible chevrons, non-overlapping 40px controls, one-row alignment, compact search/sort widths, accessible secondary icons, temporary Search/Escape, anchored dropdowns, no page-level horizontal overflow, and unchanged stored workspace data. The same run also passed existing landing regressions across six widths and both themes.
- Final focused artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-0d8CJW`. Representative screenshots from the preceding successful focused run were visually inspected at dark 768/1024/1440px and light 390/1280px (`/data/data/com.termux/files/usr/tmp/jubro-status-browser-aZ8oG3`).
- `JUBRO_ENTRY_ONLY=1 node test/statusCustomization.browser.mjs`: Its existing toolbar and dropdown matrices passed, including 1280px. The broader run then failed at `Custom Fields opens and closes reliably from Board and List views with zero writes.` This separate click-workflow failure is already documented in the November 9 workspace surface record and local development overview; it was not fixed or bypassed in this layout task.
- JavaScript syntax checks: All 82 tracked/unignored JS/MJS files passed `node --check`; the two changed browser files were checked again after their final edits.
- JSON checks: All 3 tracked/unignored JSON files parsed successfully.
- `git diff --check`: Passed.

## Limitations

- The broader entry browser suite is not green because of the separately documented Custom Fields click-workflow assertion. Focused layout checks do not prove that workflow.
- Physical devices, other browser engines, production Firebase, and deployment were not tested. Browser checks use local headless Firefox with Firebase fixtures.
- CSS generation was not rerun: this checkout lacks the Tailwind CLI, as confirmed during the preceding landing task. The change uses already-loaded authored global CSS, not new generated utilities.
- No push or deployment was performed.
