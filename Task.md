Dashboard UI Improvement: Applications Over Time Chart

Goal:
Redesign the "Applications Over Time" chart to look like a modern analytics dashboard chart instead of the current bordered line chart.

Requirements:
- Convert the current line chart into an area chart.
- Keep the line visible on top.
- Add a smooth gradient-filled background under the line.
- Use the existing theme colors and support both dark mode and light mode.
- Remove the boxed chart appearance and unnecessary borders inside the chart area.
- Make the chart feel similar to modern SaaS dashboards (Stripe, Linear, Vercel, Notion Analytics).
- Use a soft transparent gradient fill below the line.
- Add smooth curves instead of sharp line segments.
- Keep data points visible with small circular markers.
- Highlight the hovered point with a larger marker and tooltip.
- Reduce visual clutter by making grid lines subtle.
- Keep the chart responsive.
- Preserve existing data and filtering logic.

Design:
- Background fill starts stronger near the line and fades toward the bottom.
- Chart line should be clean and modern.
- No heavy borders around the chart canvas.
- Rounded chart container.
- Show total applications in the top-right corner.
- Add smooth animation when data changes.
- Ensure the chart looks good even with only a few data points.

Reference Style:
- Modern blue gradient area chart.
- Similar to analytics cards found in SaaS dashboards.
- Minimalist and professional.
- Focus on readability and visual appeal.

Do not change:
- Dashboard layout.
- Existing analytics calculations.
- Card sizing.
- Status counters.

Only improve the visual appearance of the Applications Over Time chart.