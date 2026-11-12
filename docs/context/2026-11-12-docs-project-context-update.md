# Refresh local project overview documentation for current context

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: docs
- Source baseline: `b52b090`

## Problem or goal

Several sections and review timestamps in the local overview documents under `docs/` still reflected the `2026-11-06` and `2026-11-08` baselines, including outdated references to a 6-column default tracker schema, the retired second-navbar `More` menu, `/trackers/` as a primary local entry URL, and missing module ownership entries for recent Board top-navbar, Job Search management, application form, guest transfer decision, and auth navigation modules.

## Changes and resulting behavior

- Updated the review baselines across `docs/README.md`, `docs/project.md`, `docs/architecture.md`, `docs/features.md`, `docs/data-and-auth.md`, and `docs/development.md` to `2026-11-12`.
- Synchronized `docs/project.md` with the current Board and List UI-only `EXAMPLE` guides and Quick Overview summary popup.
- Synchronized `docs/architecture.md` with the two-tier Board navigation (`#boardTopNavbar` + `#boardTopNavDropdown` above `#appNavbar`), removing the stale `#appNavbar` `More` menu reference and adding module ownership entries for `js/main/boardNav.js`, `js/main/jobSearch.js`, `js/main/jobSearchManagement.js`, `js/main/applicationForm.js`, `js/storage/guestTransferDecision.js`, `js/auth/authNavigation.js`, `js/auth/syncChoice.js`, and `js/toast.js`.
- Synchronized `docs/features.md` with the consolidated Board top navbar and `#boardTopNavDropdown` `Backup` section for single-tracker `Import JSON` and `Export JSON`.
- Synchronized `docs/data-and-auth.md` with the 10-column default schema (`Company`, `Position`, `Platform`, `Status`, `Date`, `Link`, `Work Setup`, `Employment Type`, `Next Action`, `Next Action Date`), legacy 8-column compatibility, and the `jubro_auth_flash` `sessionStorage` key.
- Synchronized `docs/development.md` with `/board/` as the primary local entry route (with `/trackers/` redirecting to `/board/`) and the expanded `npm test` regression coverage.
- No runtime application files or dependencies were modified.

## Files affected

Committed files:

- [`docs/context/2026-11-12-docs-project-context-update.md`](2026-11-12-docs-project-context-update.md): this context record.

Local-only files (intentionally Git-ignored):

- `docs/README.md`: updated review baseline.
- `docs/project.md`: updated review baseline, empty guides, and Quick Overview workflow summary.
- `docs/architecture.md`: updated two-tier Board navigation description and module ownership table.
- `docs/features.md`: updated Board top navbar and single-tracker backup menu location.
- `docs/data-and-auth.md`: updated 10-column default tracker schema and `jubro_auth_flash` session key.
- `docs/development.md`: updated local `/board/` entry instructions and `npm test` coverage list.

## Verification

- Verified all relative links in `docs/*.md` and `docs/context/2026-11-12-docs-project-context-update.md` resolve to existing files in the repository.
- Verified `git check-ignore` continues to ignore the six local overview files under `docs/` while tracking `docs/context/2026-11-12-docs-project-context-update.md`.
- Ran `npm test`: all 214 unit tests passed.
- Ran `git diff --check`: passed with zero whitespace or formatting issues.

## Limitations

The local overview files directly under `docs/` remain Git-ignored by design and stay on this device. No application code, build outputs, or remote branches were changed.
