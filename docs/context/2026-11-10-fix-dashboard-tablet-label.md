# Restore Dashboard text on tablet and desktop

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: fix

## Problem or goal

Dashboard's toolbar label was hidden below 1280px, including medium screens where the user wanted the text visible. Restore the label without sacrificing the protected Job Search title or creating horizontal overflow.

## Changes and resulting behavior

- Dashboard text is visible from 768px upward; narrow mobile keeps the existing accessible icon.
- Custom Fields retains its existing icon-only treatment below 1280px. Other labels, control order, and styling remain unchanged.
- The Search + Sort control may shrink to 220px under width pressure, allowing Dashboard text and a long protected Job Search title to coexist around 1024px. Its 340px preferred width, 350px cap, compact Sort, and right-hand grouping remain unchanged.
- No application data, authentication, storage, revision, or sync behavior changed. No dependencies were added.
- The separately requested Google-card Next Action edit is not part of this completed change. The current renderer has neither the referenced circular checkmark nor the described left task icon, and the static hero image also differs. Clarification/reference was requested; Next Action markup, styling, and saved data were left untouched.

## Files affected

- `css/global.css`: Dashboard label breakpoint and minimum available Search width.
- `test/toolbarWidth.browser.mjs`: Dashboard's tablet-label expectation, independent of Custom Fields.
- `test/statusCustomization.browser.mjs`: Matching Dashboard label expectation in the existing toolbar matrix.
- `docs/architecture.md` and `docs/features.md`: Local-only overview updates; ignored by Git.
- `docs/context/2026-11-10-fix-dashboard-tablet-label.md`: This tracked record.

## Verification

- The new label expectation failed before implementation at dark/768px.
- `npm test`: 188 passed, 0 failed.
- `JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs`: Passed, zero JavaScript errors, both themes at 390, 430, 768, 1024, 1280, 1440, and 1920px. Existing ordinary-name readability, long-title overflow protection, Search/Sort sizing, dropdown anchoring, mobile controls, and unchanged workspace-data checks also passed. The same run passed six-width landing regressions.
- Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-I0dS9z`. Visually inspected the light/1024px toolbar with Dashboard text visible and the complete Internship Search name.
- `node --check test/toolbarWidth.browser.mjs` and `node --check test/statusCustomization.browser.mjs`: Passed.
- `git diff --check`: Passed.

## Limitations

- Next Action editing remains pending clarification of the target UI/image.
- The broader entry browser suite was not rerun; its previously documented Custom Fields click-workflow assertion remains outside this label change.
- Physical devices and production services were not tested. Tailwind generation was not rerun because the local CLI is unavailable; this change uses authored global CSS.
- No push or deployment was performed.
