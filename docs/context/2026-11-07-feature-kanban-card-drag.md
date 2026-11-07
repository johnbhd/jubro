# Drag application cards between status columns with mouse or touch

## Date and type

- Date: 2026-11-07 (Asia/Manila)
- Type: feature

## Problem or goal

The Board already had basic native desktop drag handlers, gated by a fine-pointer capability query, and a Status select fallback. The approved plan extends existing dragging to touch, gives destination feedback and horizontal edge scrolling, prevents invalid/stale drags, and retains the canonical status save path. Dragging changes application status, not card ordering.

## Changes and resulting behavior

- Native mouse dragging remains native and no longer depends on a capability query that reported no fine pointer even during real mouse input in local Firefox.
- Touch holds activate after 300ms. Movement greater than 8px beforehand cancels without preventing normal scrolling. Native dragging is temporarily disabled for that touch session and restored during cleanup.
- Buttons, links, inputs, selects, editable areas, and role-button controls cannot initiate card dragging. Pointer origin is checked even when native dragstart targets an ancestor card.
- Active cards become subdued. Touch gestures get an inert, accessibility-hidden, pointer-transparent neutral preview. Valid destination columns get a status-colored outline without changing layout or card surfaces.
- Horizontal edge scrolling uses the outer 40px of the Board and at most 12px per animation frame. It stops on cancellation, invalid state, or completion.
- A session records the originating tracker, rows array, row reference, and source index. External text/file drops, invalid session tokens, replaced trackers/rows, and List view cannot commit a move. Controller cleanup runs before Board redraw; blur, page hiding, Escape, touch cancellation, additional touches, and outside release cancel safely.
- Only a valid changed destination reaches the existing `moveKanbanRow()` path. Same-column drops do not save. Successful moves use the existing save/revision/sync and shared refresh, followed by the existing polite toast announcement. No direct Firebase calls or new persistent schema were added.
- No status still represents `""`. Moves into and out of that column preserve blank-string semantics. Missing Status fields remain nondraggable.
- Thrown save errors now reload canonical stored state before propagating, matching rejected-save recovery. Gesture cleanup happens before persistence so errors do not strand previews or listeners.
- Existing rename, color, reorder, menus, neutral cards, toolbar, filtering, and keyboard/mobile Status select remain intact. JUBRO-203 is untouched.

## Files affected

Created:

- `js/main/kanbanDrag.js`: transient gesture lifecycle and drop validation, delegated persistence.
- `test/kanbanDrag.test.mjs`: 11 focused native/touch/session/cancellation/scroll tests.
- `docs/context/2026-11-07-feature-kanban-card-drag.md`: this record.

Modified:

- `js/main/kanban.js`: bind/destroy drag controllers; reuse existing canonical status mutation; recover thrown saves.
- `css/global.css`: cursor, subdued source, destination outline, and neutral touch preview.
- `test/kanban.test.mjs`: thrown-save canonical reload regression.
- `test/statusCustomization.browser.mjs`: native mouse initiation, drop event contract, touch gestures, cancellation, edge scrolling, same-column/external drops, No status movement, and drag screenshots.
- Local-only ignored documents: `docs/features.md`, `docs/architecture.md`, `docs/development.md`, and implementation ledger `docs/superpowers/plans/2026-11-07-kanban-card-drag.md`.

Prior uncommitted status-customization changes remain preserved. This task did not create a clean worktree that would omit those dependencies, and did not commit them without authorization.

## Verification

- Baseline `npm test`: 94 passed, 0 failed.
- Final `npm test`: **106 passed, 0 failed**, including 11 new controller tests and the thrown-save test.
- Focused red/green checks reproduced the absent gesture helper, mouse capability gating, ancestor-card drag from interactive controls, and missing canonical reload on thrown save.
- `node test/statusCustomization.browser.mjs`: passed the available checks using actual Board modules and repository Firebase fixtures. Covered existing status customization, List/filter consistency, dropdown movement, real native mouse drag initiation/accepted dragover, DOM drop persistence, touch hold/drop, swipe cancellation, Escape, extra touches, touchcancel, redraw, outside release, blank-status movement, edge scroll, stale saves, and reload persistence. No JavaScript errors.
- Browser matrix: dark/light at 390, 430, 768, 1024, 1440, and 1920px, height 900px. Board, palette, and touch-preview screenshots captured. Reviewed representative mobile and desktop drag screenshots in both themes; cards remain neutral and destination outlines do not shift layout.
- Latest artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-FByka3/` (disposable local files).
- Important qualification: `nativeDropCompleted` was **false**. The local Firefox/BiDi input sequence emitted native dragstart/dragover, but no drop/dragend on mouse release. The suite explicitly reports this, cancels the unfinished native session, and checks the DOM dragstart/drop contract separately. This is not an end-to-end native release pass.
- Touch checks use synthetic DOM touch events and controlled timers, not physical touchscreen input. Normal browser/OS gesture arbitration and iOS long press remain unverified.
- `node --check` across JavaScript/MJS under `js`, `test`, and `scripts`: passed. `git diff --check`: passed.
- Independent read-only code review found no critical or important correctness issues. One minor deferred: an empty/invalid render retains the already-destroyed controller reference until a later nonempty render, temporarily retaining old DOM references. Event listeners and gesture timers have already been removed.

## Limitations

Real desktop release, physical touch behavior, iOS long press, other browser engines, live Firebase, and production hosting were not verified. The Status dropdown remains available as the accessible/mobile alternative. Horizontal edge scrolling is included; vertical drag auto-scrolling and within-column reordering are not. No dependencies or schema changes. No build, deployment, commit, or push performed. Commit remains pending authorization; include this record with the corresponding implementation when committing.

## Drag-only commit isolation (2026-11-07)

The user authorized committing the earlier cross-status drag feature separately
from vertical card ordering. This commit was reconstructed against the previous
HEAD in a disposable snapshot, leaving the live working files unchanged.

The commit includes only the drag controller, its Kanban bindings/styles, gesture
unit tests, thrown-save regression, and this record. It excludes status
customization, full-width header/picker changes, List dragging, vertical placement,
vertical scrolling, ordering mutations, and the newer controller-reference fix.
Those changes remain in the working tree for separate commits.

The shared optional status-customization browser harness also remains uncommitted:
it contains both the other feature's setup and newer vertical-order checks. The
browser results above describe verification performed during implementation, not
an independently runnable browser harness included in this isolated commit.

Verification of the isolated commit snapshot: npm test passed 92/92 (the earlier
HEAD baseline of 80 plus 11 gesture tests and one thrown-save test). The controller
passed node --check. The complete current working tree still passed 123/123 during
commit preparation. No push or deployment was requested. Physical-touch/native
mouse-release limitations and the deferred empty-render reference remain as
recorded above.
