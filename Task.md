You are helping me debug a vanilla JavaScript tracker board app.

Before changing any code, do this first:

1. Inspect the relevant files and understand the current flow.
2. Explain the real root cause clearly.
3. Create a step-by-step fix plan.
4. Only after the plan, propose the exact code changes.

App details:

The app is a vanilla JS tracker board.

Row order is stored in:

```js
localStorage.flextracker_data
state.data[trackerId].rows
```

Firebase stores the same tracker state as JSON in:

```js
trackerData/{user.uid}.data
users/{user.uid}.trackerData.data
```

Bug:

Move up/down in board list/table view appears to move the row visually, but after refresh the position is not preserved correctly. It may be saving, but the saved order is being hidden or overwritten by sorting.

Important files to inspect:

```txt
js/main/listView/sorting.js
js/main/listView/render.js
js/main/trackerTableActions.js
js/main/trackerState.js
js/main/trackerSorting.js
js/storage/storage.js
js/storage/firebaseTrackerSync.js
```

Current flow:

```js
moveListRow()
-> reorderRow() or persistTableMove()
-> save()
-> Storage.save(this.state)
-> syncLocalStateToFirebase()
```

Shared table move functions are in:

```txt
js/main/trackerTableActions.js
```

Important functions:

```js
reorderRow(fromIndex, toIndex)
swapRows(firstIndex, secondIndex)
persistTableMove()
moveUp()
moveDown()
```

List move functions are in:

```txt
js/main/listView/sorting.js
```

Important functions:

```js
getSortedListRows(tracker)
moveListRow(rowIndex, direction)
setListManualSort()
```

Likely root cause:

`refresh()` calls:

```js
this.applyCurrentSort();
```

inside:

```txt
js/main/trackerTableActions.js
```

`applyCurrentSort()` may mutate `tracker.rows` based on the active table sort dropdown:

```js
tracker.rows.sort(...)
```

So even after move up/down changes `tracker.rows`, refresh or reload may sort rows again by date/select and make it look like the index/order did not save.

Also list view has its own sort:

```js
listSortSelect
date-desc
date-asc
manual
```

If list sort is not `manual`, visual order comes from `getSortedListRows()` instead of raw `tracker.rows`.

Important goal:

Manual row movement should become the source of truth. When the user manually moves a row up/down, the app should preserve that exact order after refresh and reload.

Before editing, answer these:

1. Is `applyCurrentSort()` mutating `tracker.rows`?
2. Is `refresh()` saving again after sorting?
3. Does list view render from `getSortedListRows()` instead of raw `tracker.rows`?
4. Are table move and list move using the same row indexes, or are they using sorted display indexes?
5. Is Firebase sync happening after localStorage save?

Expected fix behavior:

* Manual row movement should disable or clear active date/select sorting for both table and list.
* After move up/down, `tracker.rows` should be reordered directly.
* Save should run immediately after reorder.
* Refresh should not call `applyCurrentSort()` in a way that re-sorts and overwrites manual order.
* Sorting should preferably be display-only unless the user intentionally applies a permanent sort.
* Firebase sync should upload after localStorage save.

Important rule:

Do not let visual sorting overwrite manual saved order.

Use this model:

```txt
tracker.rows = real saved manual order
sortedRows = temporary display order only
```

Avoid this pattern unless the user intentionally wants permanent sorting:

```js
tracker.rows.sort(...)
```

Prefer this for display sorting:

```js
const rowsToRender = [...tracker.rows].sort(...)
```

Task:

First, inspect the code and give me a fix plan. Do not immediately rewrite everything. Tell me which files/functions need changes and why. After the plan, provide a safe patch that keeps existing app behavior but fixes manual row order persistence.
