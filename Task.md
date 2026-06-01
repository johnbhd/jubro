Plan this feature first. Do not edit or create code yet.

Feature to plan: Fix row reordering bug in the table.

Problem:
The table has move up/down buttons and drag-and-drop row sorting, but reordering only works correctly when moving the first row. When rows are in the middle, moving up/down is buggy. Example: if rows are 1, 2, 3, 4, 5 and I drag row 1 to position 4, it does not reorder correctly.

Requirements:
- Fix move up button for any row except the first row.
- Fix move down button for any row except the last row.
- Fix drag-and-drop so any row can be moved to any position.
- Preserve all row data exactly after reordering.
- Update localStorage after every reorder.
- If Firebase sync exists, sync the new row order after reorder.
- Do not change the UI design.
- Do not break table view, list view, edit popup, search, filters, or custom fields.
- Use array index-based swapping/splicing carefully.
- Make sure reorder works with filtered/search results if the table is currently filtered.

Expected behavior:
- Moving row 3 up should swap it with row 2.
- Moving row 3 down should swap it with row 4.
- Dragging row 1 to position 4 should result in the correct new order.
- Dragging middle rows should also work correctly.

Before coding:
- Find the current row reorder functions.
- Identify whether the bug is caused by using filtered indexes instead of original row indexes.
- Plan the fix first, then apply the minimal code changes.

Analyze:
1. what the feature should do
2. user flow from start to finish
3. frontend pages/components needed
4. backend API routes needed
5. database/model fields needed
6. validation needed
7. security concerns
8. localStorage/state handling if needed
9. loading/error/success states
10. edge cases
11. safest MVP scope
12. files likely involved
13. best order to build it

Then tell me:
- recommended implementation approach
- what files need to be changed
- what new files may be needed
- what should not be touched
- possible problems before coding
- simplest stable solution

Important:
- Do not overengineer
- Do not change unrelated features
- Do not start coding yet
- Explain the plan first
- Wait for my approval before editing
- Use my current MERN / Next.js / Express / MongoDB setup