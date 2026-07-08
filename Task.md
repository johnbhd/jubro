Edit the dashboard modal UI only. Keep the existing design, colors, spacing, cards, pie chart, graph, stats, and background exactly the same.

Add/improve the dashboard filter flow at the top of the modal.

Current layout should be:

[Group by: Status ▼]  [Range: This Month ▼]  [X]

Range dropdown options:
- This Week
- This Month
- Last Month
- This Year
- All Time
- Custom

Default selected range: This Month.

UI logic:
- If Range is Custom, show two date pickers below the dropdown row:
  From: [2026-07-01]   To: [2026-07-31]

- If Range is This Week, This Month, Last Month, This Year, or All Time, hide the From and To date pickers.

Important:
Only edit/add the range filter and custom date picker area.
Do not change the stats cards.
Do not change the pie chart.
Do not change the graph.
Do not change the modal size unless needed for the custom date picker.
Do not redesign other parts of the dashboard.
Make the new filter match the current dark glassmorphism UI style.
Use the same rounded corners, borders, shadows, font size, and spacing already used in the modal.