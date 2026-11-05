# Establish project documentation and committed context records

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: docs
- Initial source baseline: `6002195`

## Problem or goal

The repository had a public README but no structured documentation directory or contributor rule requiring a dated history for completed changes. The requested outcome was local project overview documents directly under `docs/`, plus a Git-tracked `docs/context/` directory containing rules and a new record for every completed feature, fix, or other change.

## Changes and resulting behavior

- Added local overview documents for project purpose, architecture, existing features, data/authentication, and development. The documentation index links them in reading order.
- Added `docs/context/README.md` with naming rules, a reusable record template, verification requirements, and a policy requiring each record in the same commit as its corresponding change.
- Added a root `AGENTS.md` instruction directing contributors to read and follow the context rules before editing.
- Updated `.gitignore` to ignore `/docs/*` while explicitly allowing `/docs/context/`. A root-only exception allows `AGENTS.md` to be tracked while retaining the existing ignore rule for other `AGENTS.md` files.
- Kept dated records directly in `docs/context/`, with no `changes/` subfolder and no fabricated records for old features.
- Documented existing source concerns, including README/license drift, absent test scripts, and the board startup Firestore connection-test write. No application behavior was changed.

## Files affected

Committed files:

- [../../.gitignore](../../.gitignore): local/shared documentation ignore rules and root contributor-file exception.
- [../../AGENTS.md](../../AGENTS.md): contributor workflow entry point.
- [README.md](README.md): shared context rules and template.
- `docs/context/2026-11-06-docs-project-context.md`: this first completed-change record.

Local-only files, intentionally excluded from the commit:

- `docs/README.md`: documentation index and reading order.
- `docs/project.md`: purpose, users, scope, stack, and license.
- `docs/architecture.md`: pages, modules, events, styling, assets, and hosting layout.
- `docs/features.md`: current functionality and implementation locations.
- `docs/data-and-auth.md`: schemas, local keys, cloud synchronization, authentication, backups, and deletion.
- `docs/development.md`: setup, commands, verification guidance, deployment notes, and known gaps.

## Verification

- Ran an inline Node.js assertion check with Node `v24.18.0`: passed. It checked the approved folder layout, all nine new Markdown files, 124 relative links, balanced code fences, trailing whitespace, and the record's filename and required headings.
- Ran 18 `git check-ignore -q -- <path>` assertions: passed. All six overview files remain ignored; the root `AGENTS.md`, context rules, this record, and a future dated context path are trackable. Existing dependency, workflow, nested contributor-file, and local-agent ignore behavior remains intact.
- Ran `git diff --check`: passed. Reviewed the ignore-rule diff and the tracked/untracked/ignored file lists.
- Reviewed the written documentation against page entry points, module ownership, tracker defaults, npm scripts, storage/auth/sync/backup/deletion code, and the MIT license file.
- No package installation, application build, browser acceptance tests, live Firebase operations, or production checks were run for this documentation/configuration change.

## Limitations

The ignored overview documents stay on the current device and will not be restored by Git. Rules and dated records are shared through commits. The source review is not a browser, Firebase, or production acceptance test. Static hosting may include committed context files, so they must contain no secrets or sensitive user data. No push or deployment is part of this change.
