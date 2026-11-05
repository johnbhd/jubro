# Context rules and change records

This directory contains the shared rules and dated history of completed Jubro changes. It is tracked by Git even though the overview files directly under `docs/` are ignored.

## Required workflow

1. Before editing, read this file and the recent records relevant to the task. Read local overview documents when available, and inspect the source they describe.
2. Complete the requested work and run checks appropriate to the change. Separate confirmed results from assumptions and untested behavior.
3. Create one new Markdown record directly in `docs/context/` for each completed logical change. This applies to features, fixes, refactors, documentation, tests, configuration, dependencies, and other maintenance.
4. Update relevant local overview documents when they exist. A fresh checkout may contain only this directory and the source, so a record must explain its change without depending on ignored files.
5. Stage the new record with the corresponding changed project files. Review the staged diff, then include both in the same commit. Do not force-add the ignored overview files.
6. Keep unrelated user changes out of the commit. If committing is not authorized or fails, leave the record with the change and explicitly report that the commit is pending. Never claim a commit or push occurred when it did not.

Read-only questions, investigations, and checks that make no project changes do not require a record. A single task that completes several independent changes needs a separate record for each; incidental edits supporting one change can share its record.

## Naming

Use `YYYY-MM-DD-type-short-name.md` with the actual completion date in `Asia/Manila`, a lowercase type, and a descriptive lowercase slug separated by hyphens.

Types include `feature`, `fix`, `refactor`, `docs`, `test`, and `chore`. Choose the type that best describes the completed work; do not create empty files for every type.

Examples of filenames, not historical claims:

```text
2026-11-06-feature-tracker-filters.md
2026-11-06-fix-list-row-order.md
2026-11-06-docs-project-context.md
```

Several changes on the same day use different descriptive slugs. If a filename still collides, add a meaningful distinguishing suffix or a numeric suffix such as `-2`; never overwrite an unrelated record.

## Record requirements

- Explain the original problem or goal and the resulting behavior.
- List the affected files, using relative links where useful. Explicitly identify local-only files that are absent from Git.
- Record the commands or manual checks actually performed and their observed results. Explain skipped checks and any verification limits.
- Note compatibility, storage, deployment, or follow-up implications when relevant. Write `None identified` when there are no known limitations rather than inventing work.
- Describe completed work accurately. A blocked or unfinished task must not be presented as completed.
- Preserve prior records. Make factual corrections transparently; a later behavior change belongs in a new record, not a rewrite of old history.
- Do not copy secrets, credentials, real user data, or sensitive personal information into a record.

## Template

Copy this structure into a new dated Markdown file and replace the prompts with facts. Do not commit unfilled placeholders.

```markdown
# Descriptive change title

## Date and type

- Date: YYYY-MM-DD (Asia/Manila)
- Type: feature | fix | refactor | docs | test | chore

## Problem or goal

Describe the previous behavior or missing capability and the requested outcome.

## Changes and resulting behavior

Describe what changed and what a user or contributor experiences afterward.

## Files affected

List the relevant paths and the purpose of each change. Identify local-only files.

## Verification

List the checks actually performed, their results, and anything not checked.

## Limitations

Record known limits or remaining risks, or write "None identified."
```

## Commit policy

Commit the completed change and its new record together. For example, after reviewing only the files for a particular fix:

```sh
git add js/main/trackerSearch.js docs/context/2026-11-06-fix-search-results.md
git diff --cached --check
git diff --cached
git commit -m "fix: correct tracker search results"
```

The paths and date above are illustrative. Use the actual affected paths and completion date. Do not use `git add .` to sweep unrelated changes into a commit. Pushing is a separate action requiring authorization.
