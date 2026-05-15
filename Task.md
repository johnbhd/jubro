Add a search input to Jubro so the job table can be filtered.

Goal:
Create a simple search bar that filters the visible rows in the current active tracker.

UI:
- Add a search input above or near the job table.
- Placeholder text: "Search jobs..."
- Use the same color palette and existing input/button styling.
- Do not change the table layout.

Search behavior:
- As the user types, filter the table rows in real time.
- Search should check these fields:
  - Company
  - Position
  - Status
  - Link
  - Date Applied
- Search should be case-insensitive.
- Partial matches should work.
  Example: typing "goo" should show "Google".
- If the search box is empty, show all rows.
- If no rows match, show a simple message like "No matching jobs found."

Important:
- This should only filter what is displayed.
- Do not delete rows from localStorage.
- Do not change the saved data structure.
- Do not affect adding, editing, deleting, or status changing.
- Search should work with the current active tracker only.

Rules:
- Do not add Firebase/backend changes.
- Do not add authentication changes.
- Do not add charts or analytics.
- Do not refactor unrelated code.
- Keep the feature beginner-friendly and MVP-focused.
- Make the search input simple and clean.
- Make any search clear button use cursor pointer if you add one.

After implementing:
- Test with different companies, positions, statuses, links, and dates.
- Confirm clearing the search shows all rows again.
- Confirm localStorage data is unchanged.