# Restore reliable mouse and touchscreen application dragging

## Date and type

- Date: 2026-11-07 (Asia/Manila)
- Type: fix

## Problem or goal

The user reported local Board and List dragging failing with mouse and touchscreen,
and no touch preview after holding the card title.

Investigation reproduced native mouse dragstart/dragover without drop/dragend or
a saved revision in local Firefox/BiDi. Earlier verification explicitly left that
release unverified and checked DOM drops separately. Source inspection also found
that touch activation depended entirely on Touch Events; touchscreen Pointer
Events had no activation path. A pointer-only unit test reproduced that gap.
No dedicated card region reserved the gesture before browser pan/callout handling.

The user's exact browser/OS was not supplied. Browser-generated Touch Events worked
from padding locally, so the physical-device preview failure was not directly
reproduced. This fix covers the demonstrated pointer-only gap and provides a
reserved drag grip without disabling normal card-body scrolling.

## Changes and resulting behavior

- Mouse initiation uses captured Pointer Events on noninteractive card areas or
  grips. Moving 8px activates the preview; pointer release validates and commits.
  Native dragging is temporarily disabled and then restored. Native HTML drops
  remain a compatibility path, not a prerequisite for mouse completion.
- Touch Pointer Events activate after a 300ms hold without requiring Touch Events.
  Pre-activation movement beyond 8px cancels without blocking normal scrolling.
  Existing card-body Touch Events remain supported.
- Board and Manual List show 44px grips with touch-action:none, selection/callout
  suppression, accessible labels, focus styling, and Up/Down keyboard movement.
  Only grips reserve browser gestures. Date-sorted List remains nondraggable.
- When both APIs fire, a grip retains its pointer session instead of starting a
  duplicate Touch Event hold. Extra fingers, pointer cancellation, lost capture,
  Escape, outside release, view changes, and redraw cancel safely. Cleanup clears
  the session before releasing capture to avoid recursive cancellation.
- Canonical mutation, ownership/revision guards, one-save/sync behavior, blank
  statuses, hidden rows, page boundaries, filters, dropdowns, and other controls
  remain intact. No dependency, schema change, or JUBRO-203 work was added.

## Files affected

- `js/main/kanbanDrag.js`: pointer mouse release, touch fallback, capture cleanup,
  event deduplication, shared grips, and keyboard behavior.
- `js/main/kanban.js`: Board grip beside the existing card menu.
- `js/main/listView/render.js`: Manual List grip beside move controls.
- `css/global.css`: scoped grip geometry, focus, touch-action, and callout styling.
- `test/kanbanDrag.test.mjs`: seven additional mouse/touch/grip/keyboard tests;
  control fixtures now distinguish selectors rather than matching every closest()
  query. Includes lost capture and duplicate Pointer/Touch Event coverage.
- `test/statusCustomization.browser.mjs`: require browser mouse release persistence
  without synthetic completion; add browser-generated mouse/touch grip reordering
  in both views.
- `docs/context/2026-11-07-fix-board-list-drag-input.md`: this record.
- Local-only ignored overviews: `docs/features.md`, `docs/architecture.md`, and
  `docs/development.md`.

## Verification

- Baseline `npm test`: 123 passed. Final: **130 passed, 0 failed**.
- Focused gesture tests: **23 passed, 0 failed**. Observed failures before fixing
  mouse pointer release and pointer-only touch/grip activation. The keyboard test
  failed with its handler removed and passed after restore.
- A disposable input probe reproduced missing native mouse completion; the new
  pointer path then delivered pointerup and a saved Board change.
- `node test/statusCustomization.browser.mjs`: passed with `mouseDropCompleted:true`,
  `browserInputChecks:4`, and no JavaScript errors. Browser input actions covered
  mouse and 700ms held touch grips in both views, one revision per reorder, and
  cleared gesture/preview state. No synthetic drop fallback completed these cases.
- Existing dark/light geometry and screenshots passed at 390, 430, 768, 1024,
  1440, and 1920px. Reviewed representative mobile Board and desktop List images.
  Latest disposable artifacts:
  `/data/data/com.termux/files/usr/tmp/jubro-status-browser-IYj1en/`.
- Independent read-only review found no Critical, Important, or Minor issues. It
  checked event duplication, capture cleanup, keyboard focus, scrolling cancellation,
  and persistence delegation, and independently ran the gesture tests.
- JavaScript syntax checks and `git diff --check` passed. No asset build, physical
  device session, other-engine check, live Firebase check, or deployment performed.

## Limitations

Firefox/BiDi input is browser-generated, not physical mouse/touch hardware. The
user's exact browser/OS remains unverified. Reload the local page; on touch, hold
the visible grip and move. List requires Manual sorting. Body-area touch dragging
can still compete with browser panning; the grip is the reserved drag surface.
Earlier uncommitted status/order changes remain preserved. No commit, amendment,
or push performed; the previous drag-only commit is unchanged. Include this record
with the fix in a later authorized commit.

## Integration authorization

On 2026-11-07 the user authorized committing the remaining Board/List work and
pushing only development. This record accompanies that implementation commit;
earlier no-commit/no-push statements describe the implementation-stage checks.
The preceding cross-column drag commit remains separate and unchanged.
