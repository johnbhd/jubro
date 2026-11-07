# Shared application card ordering in Board and List

## Date and type

- Date: 2026-11-07 (Asia/Manila)
- Type: feature

## Problem or goal

Board supported status changes by dragging, but not vertical card placement. List
had move buttons and date/manual sorting, but no drag ordering. The approved plan
adds mouse/touch before/after placement using one shared canonical row order,
without a second view-specific ordering schema or a new dependency.

## Changes and resulting behavior

- Board cards can move above/below other cards in the same or another column.
  The hovered card's own midpoint selects before/after. Header and trailing-space
  drops append after the destination's last underlying row, including hidden rows;
  an empty destination appends globally. Appending an already-last card within its
  existing status is a no-op, even when unrelated statuses follow it globally.
- List dragging requires Manual sorting and stays within the current visible
  page. Date-sorted List shows “Choose Manual to reorder.” Hidden/off-page cards
  cannot start or receive a drag. Both views use the same stored tracker.rows.
- Cross-column status and position changes occur before one ownership/revision-safe
  save and one logical sync. Other row values and their relative order stay intact.
  A status-cell update preserves existing object metadata and uses select
  normalization. No status remains blank; missing-Status trackers can reorder
  without creating a Status field. Orphan statuses retain the existing behavior.
- A changed canonical order selects the existing List Manual preference only
  after a successful save. A status-only change retains the current List sort.
  Search, filters, and the current page survive successful reorder/redraw.
- Existing List Move up/down buttons use visible neighbors through the same
  mutation. Board card menus now provide corresponding keyboard controls.
  Boundary actions are disabled; successful keyboard moves restore usable focus
  and announce the change. A date-sorted List button whose desired placement is
  already canonical switches to Manual and redraws without a data save.
- Native mouse and 300ms touch-hold behavior remain. Movement beyond 8px before
  activation preserves normal scrolling. A transient insertion line, subdued source,
  and neutral touch preview show placement. List previews disable inherited 150ms
  transform transitions. Active drags support document vertical edge scrolling
  alongside Board horizontal scrolling: 40px activation zones, at most 12px/frame.
- Source and destination row references are validated. External payloads, replaced
  state, hidden cards, unsupported List sorting, and invalid destinations cannot
  commit. Escape, outside release, extra touches, touchcancel, blur/hiding, redraw,
  view changes, and search/filter/page changes clear gestures without saving.
- Persistence rejection or exceptions reload canonical stored state. Invalid,
  canceled, or unchanged drops do not save. Controllers are destroyed and nulled
  before redraw, including empty renders, addressing the previously deferred
  destroyed-controller reference retention.
- Existing status customization, status dropdowns, neutral cards, horizontal Board
  scrolling, pagination, and application creation remain. JUBRO-203 is untouched.

## Files affected

Created:

- `test/applicationOrder.test.mjs`: canonical insertion, validation, no-op behavior,
  keyboard transitions, metadata preservation, failure recovery, real revision/sync
  counts, and import/export/cross-view ordering checks.
- `docs/context/2026-11-07-feature-application-card-order.md`: this record.

Modified (some already contained earlier uncommitted work):

- `js/main/trackerActions.js`: shared atomic position/status mutation and visible
  keyboard neighbor movement without clearing filters.
- `js/main/kanbanDrag.js`: shared Board/List gesture controller, midpoint placement,
  target validation, insertion feedback, cancellation, and vertical scrolling.
- `js/main/kanban.js`: bind ordering on all application columns, add keyboard move
  actions, and release destroyed controller references.
- `js/main/listView/render.js`: Manual-only controller, hint, and move-control data.
- `js/main/listView/sorting.js`: shared keyboard mutation and focus restoration.
- `js/main/listView/boardView.js`: cancel gestures when changing views.
- `js/main/trackerSearch.js`: cancel sessions before visibility/page changes and
  update visible-neighbor button boundaries.
- `css/global.css`: shared drag styling, non-shifting insertion markers, preview
  transition suppression, hints, and disabled actions.
- `test/kanbanDrag.test.mjs`: additional placement, Manual/visibility, stale-target,
  and vertical-scroll regressions.
- `test/statusCustomization.browser.mjs`: use application identity rather than
  historical row positions; exercise Board/List order, filters/pages, previews,
  keyboard fallback, screenshots, and persistence after reload.
- Local-only ignored overviews: `docs/features.md`, `docs/architecture.md`, and
  `docs/development.md`. Local-only execution ledger:
  `docs/superpowers/plans/2026-11-07-application-card-order.md`.

## Verification

- Baseline `npm test`: 106 passed, 0 failed.
- Final `npm test`: **123 passed, 0 failed**. The 17 added cases comprise 12
  canonical/integration tests and five additions to the gesture tests.
- Observed failing tests before fixing the missing canonical API, hovered lower-half
  anchor, date-sorted keyboard no-op, and same-column append no-op. The browser
  computed-style regression reproduced the inherited 0.15s preview transition
  before it was disabled.
- Real Storage/Firebase-fixture integration confirmed one revision and one logical
  upload for a combined position/status change. One upload writes the existing
  two compatibility documents. Full-backup export/import preserved canonical order
  and both renderers' order sources.
- `node test/statusCustomization.browser.mjs`: passed using actual application
  modules, disposable local data, and Firebase fixtures. Checked existing status
  customization plus vertical Board insertion, cross-column placement, Manual-only
  List dragging, current-page boundaries, hidden-source rejection, preserved search
  and filters, blank status, keyboard movement, and persisted order/options after
  reload. No JavaScript errors.
- Browser matrix: dark/light at 390, 430, 768, 1024, 1440, and 1920px, height 900px.
  Captured Board/dialog/drag images and additional Board/List insertion-preview
  images (60 screenshots). Reviewed representative mobile and desktop screenshots
  in both themes. All dimensions refer to emulated viewports, not physical devices.
- Latest browser artifacts:
  `/data/data/com.termux/files/usr/tmp/jubro-status-browser-pEKQCE/`.
- Important qualification: `nativeDropCompleted` remains **false**. Real mouse input
  initiated accepted native dragging, but local Firefox/BiDi did not emit drop on
  pointer release. DOM drop persistence was verified separately, not reported as a
  native-release pass. Touch events were synthetic, not physical touchscreen input.
- Independent read-only review found one Important keyboard edge case and no
  Critical or Minor findings. The two-direction regression reproduced it; the fix
  and full suite passed. No second review was requested.
- `node --check` across JavaScript/MJS under `js`, `test`, and `scripts`: passed.
  Parsed `package.json`, `package-lock.json`, and `vercel.json`: all three valid.
  `git diff --check`: passed.

## Limitations

Native mouse release, physical touch/OS scroll arbitration, iOS long press, other
browser engines, live Firebase, production-scale performance, and deployment remain
unverified. No cross-page dragging or separate per-view order was added. No schema
change, dependency, asset build, deployment, commit, or push. Work remains in the
existing dirty development checkout with earlier changes preserved. Commit is
pending authorization; include this record with its corresponding code/tests.

## Integration authorization

On 2026-11-07 the user authorized committing the remaining Board/List work and
pushing only development. This record accompanies that implementation commit;
earlier no-commit/no-push statements describe the implementation-stage checks.
The preceding cross-column drag commit remains separate and unchanged.
