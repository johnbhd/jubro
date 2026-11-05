# Jubro contributor instructions

Before changing this project, read [the context rules](docs/context/README.md) and recent dated records in `docs/context/`.

If the local documentation exists, start with [the documentation index](docs/README.md), then read the pages relevant to the task. The overview pages are intentionally ignored by Git and may not exist in a fresh checkout; inspect the source when they are absent. Treat the implementation as the authority when documentation disagrees with it.

For every completed feature, fix, refactor, documentation, configuration, or other project change:

1. Create a new `docs/context/YYYY-MM-DD-type-short-name.md` record using the actual completion date in `Asia/Manila`.
2. Describe the purpose, previous and resulting behavior, affected files, verification performed, and remaining limitations.
3. Update any relevant local overview documents that exist.
4. Include the new record in the same commit as its corresponding change. Do not commit unrelated user changes or push without authorization.

Use the template and naming rules in `docs/context/README.md`. Read-only investigations do not need a change record. Never describe unverified work as tested or unfinished work as completed.
