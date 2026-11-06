# Kanban Board Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a status-driven Kanban Board as Jubro's default view and simplify Board hierarchy while preserving List, Table, and all Phase 1 persistence safeguards.

**Architecture:** Add one focused `kanban.js` method group to `TrackerApp`. It derives columns and cards from the existing tracker rows, sends status changes through `save()` and `refresh()`, and shares existing search/filter state. Expand the current view selector to `kanban/list/table`; keep Table and advanced actions in More.

**Tech Stack:** HTML, Vanilla JavaScript ES Modules, existing Tailwind/custom CSS, Node built-in test runner, existing Firebase/localStorage layers.

**Spec:** `docs/superpowers/specs/2026-11-06-kanban-board-hierarchy-design.md`

## Global Constraints

- Preserve `this.state` as the canonical tracker state.
- Derive Kanban columns from the current Status select options; do not hard-code five statuses.
- Route status movement through existing storage, ownership, revision, and sync APIs.
- Do not call Firebase from Kanban.
- Preserve safe DOM rendering, typed values, List/Table consistency, and bounded sync.
- Do not rebuild Add Application, delete Table, redesign Dashboard, add Next Action, migrate frameworks, or migrate Firebase.
- Keep code and tests readable; no compressed one-line logic.

## Review Focus

- A tracker with no Status select must keep its rows visible rather than disappear; test the fallback Applications column.
- A row with a stale/removed status option must remain visible; test the extra safe status column.
- A failed local status save must not leave a moved card visible; test reload and no successful refresh.
- Search must hide Kanban cards without changing state or sync; test the Kanban selector path.
- Legacy `table` view preference must not keep Board secondary; test migration to `kanban` while preserving explicit `list`.

### Task 1: Kanban Derivation and Renderer

**Files:**
- Create: `js/main/kanban.js`
- Create: `test/kanban.test.mjs`

**Interfaces:**
- Produces `getKanbanStatusColumn(tracker)`, `getKanbanColumns(tracker)`, `groupKanbanRows(tracker)`, and `kanbanMethods` for `TrackerApp`.
- `getKanbanColumns(tracker)` returns ordered objects with `value`, `label`, and `color`.
- `groupKanbanRows(tracker)` returns `{ columns, groups }`, where each group contains source row indexes.
- `kanbanMethods.renderKanban(tracker)` renders only through DOM APIs.

- [ ] **Step 1: Write failing pure-helper tests**

Add tests for configured custom statuses, empty columns, row grouping, unknown/blank row statuses, and a tracker without a Status select.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs`

Expected: FAIL because `js/main/kanban.js` does not yet provide the helpers.

- [ ] **Step 3: Implement derivation helpers and `renderKanban()`**

Use the current utility methods through `this` for display values, but keep status grouping pure and safe. Build company, position, date/source text, status controls, empty-column copy, and an empty-tracker CTA with `textContent`, `createElement`, and validated color styles. Add native drag events only as an enhancement; the status `<select>` must work without drag.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs`

Expected: PASS, including grouping and fallback cases.

- [ ] **Step 5: Commit the focused renderer**

```bash
git add js/main/kanban.js test/kanban.test.mjs docs/superpowers/specs/2026-11-06-kanban-board-hierarchy-design.md docs/superpowers/plans/2026-11-06-kanban-board-hierarchy.md
git diff --cached --check
git commit -m "feat: add status-driven kanban renderer"
```

### Task 2: Integrate Canonical State, Movement, and Search

**Files:**
- Modify: `js/main/main.js`
- Modify: `js/main/trackerTableActions.js`
- Modify: `js/main/trackerEvents.js`
- Modify: `js/main/trackerSearch.js`
- Modify: `js/main/listView/boardView.js`
- Modify: `test/kanban.test.mjs`
- Modify: `test/viewConsistency.test.mjs`

**Interfaces:**
- Consumes `kanbanMethods.renderKanban()` and `groupKanbanRows()` from Task 1.
- Produces `TrackerApp.moveKanbanRow(rowIndex, statusValue)` and view values `kanban`, `list`, `table`.

- [ ] **Step 1: Add failing integration tests**

Test `refresh()` calls Kanban rendering, successful status movement mutates the canonical select cell and refreshes without a second save, rejected save reloads instead of refreshing, and search selects `#kanbanView [data-row-index]` while leaving data unchanged.

- [ ] **Step 2: Run focused tests and verify the expected failure**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs test/viewConsistency.test.mjs`

Expected: FAIL because `TrackerApp` has no Kanban integration or movement method.

- [ ] **Step 3: Integrate the renderer and mutation path**

Attach `kanbanMethods` in `main.js`. Store `kanbanView` and `kanbanColumns` references. Render Kanban from `refresh()`. Implement `moveKanbanRow()` with typed select values, existing `save()`, reload on `false`, and `refresh({ persist: false })` after success. Extend search/filter selectors for Kanban and hide pagination there. Preserve existing Table/List paths.

- [ ] **Step 4: Update view preference handling**

Use `kanban` as the default, honor saved `list`, map legacy saved `table` to `kanban`, and keep Table selectable through the secondary control. Do not force List on mobile.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs test/viewConsistency.test.mjs`

Expected: PASS, including status movement and rejected-save behavior.

- [ ] **Step 6: Commit integration**

```bash
git add js/main/main.js js/main/trackerTableActions.js js/main/trackerEvents.js js/main/trackerSearch.js js/main/listView/boardView.js test/kanban.test.mjs test/viewConsistency.test.mjs
git diff --cached --check
git commit -m "feat: connect kanban to tracker state"
```

### Task 3: Board Workspace Hierarchy

**Files:**
- Modify: `board/index.html`
- Modify: `js/main/trackerEvents.js`
- Modify: `test/kanban.test.mjs`

**Interfaces:**
- Consumes view values and `moveKanbanRow()` from Task 2.
- Produces visible Board/List controls, header Add Application entry point, and secondary Table/Dashboard menu actions.

- [ ] **Step 1: Add failing hierarchy assertions**

Assert the Board markup exposes a Kanban container, Board/List primary buttons, a header Add Application control, and a secondary Table control. Add a focused handler test proving the new CTA calls the existing `addRow({ useJobDefaults: true, insertAtStart: true })` behavior.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs`

Expected: FAIL because the current HTML and event wiring expose only Table/List and no header CTA/Kanban container.

- [ ] **Step 3: Update Board markup and event wiring**

Add `kanbanView`/`kanbanColumns`, change the hidden selector to `kanban/list/table`, make Board/List the visible primary controls, add the header CTA, move Table and Dashboard into More, and retain import/export. Bind both header and existing List Add Job controls to the current add-row behavior without changing that behavior.

- [ ] **Step 4: Add minimal responsive styling and accessible labels**

Use existing Tailwind classes for horizontal Kanban scrolling, readable card widths, real buttons/selects, visible focus, and no page-level overflow. Do not redesign unrelated dialogs or views.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `node --import ./test/register-loader.mjs --test test/kanban.test.mjs`

Expected: PASS, including markup and CTA assertions.

- [ ] **Step 6: Commit hierarchy changes**

```bash
git add board/index.html js/main/trackerEvents.js test/kanban.test.mjs
git diff --cached --check
git commit -m "feat: make kanban the primary board view"
```

### Task 4: Full Verification and Context Record

**Files:**
- Create: `docs/context/2026-11-06-feature-kanban-board-hierarchy.md`
- Modify: `css/tailwind.css` only if the existing CSS build changes generated output

- [ ] **Step 1: Run full regression and repository checks**

Run `npm test`, `node --check` for every tracked `.js`/`.mjs`, parse every tracked `.json`, `npm run build:css`, and `git diff --check`.

- [ ] **Step 2: Perform source and manual checks**

Search for direct Firebase calls in Kanban, inspect safe rendering and view wiring, and manually verify Board/List/Table, custom statuses, failed local save, search, and responsive widths where a browser is available. Record unavailable browser checks as unverified.

- [ ] **Step 3: Write the dated context record**

Record previous/resulting behavior, files, actual checks, mobile/browser limits, preserved Table behavior, and explicitly state that JUBRO-203 and later Phase 2 work were not implemented.

- [ ] **Step 4: Review and commit the completed cycle**

Review `git diff`, `git status`, staged diff, and exact test output. Commit the context record and any generated CSS required by the project. Do not push.

## Final verification

Run the full suite after all tasks:

```bash
npm test
```

Expected: all existing and new tests pass with zero failures. Report browser, responsive, and live Firebase checks separately from automated results.
