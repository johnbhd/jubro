Improve the dashboard modal UI for the Jubro job tracker.

Requirements:

* Keep the current clean minimalist style.
* Make the dashboard look more modern and balanced.
* Fix spacing, alignment, and visual hierarchy.

Layout:

* Make all 4 status cards align evenly in one row on desktop:

  * Applied
  * Interview
  * Rejected
  * Prospect
* On mobile, make cards responsive in a 2x2 grid.
* Remove the awkward empty space under the cards.

Charts:

* Keep the pie chart on the left.
* Replace the current right-side percentage/legend section with a real chart.
* Use a line chart for “Applications Over Time”.
* The line chart should display dates/weeks/months on the x-axis.
* Make the chart container match the pie chart height.
* Add smooth rounded cards and consistent padding.

Pie Chart:

* Keep the pie chart simple and clean.
* Percentages inside the pie slices are optional for now.
* Remove duplicate percentage information if unnecessary.

UI Improvements:

* Add better spacing between sections.
* Use equal card heights.
* Improve modal width responsiveness.
* Make the dashboard visually balanced on both desktop and mobile.
* Keep Tailwind CSS only.
* Keep existing IDs and functionality working.
* Do not break existing dashboard logic or data rendering.

Design vibe:

* Modern SaaS dashboard
* Similar to Notion / Linear / Vercel style
* Minimal but professional
* Clean grayscale base with status accent colors
