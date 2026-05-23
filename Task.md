Add 3 mini feature cards below the video demo card inside the About section.

Layout:
- Place the cards directly below the video preview description.
- Use a responsive grid:
  - Desktop: 3 columns
  - Tablet: 3 columns if space allows
  - Mobile: stacked vertically
- Add proper spacing with gap-4 or gap-5.

Card Design:
- Match the dark premium dashboard style from the screenshot.
- Rounded 2xl cards
- Subtle border
- Soft shadow
- Slight hover lift effect
- Keep cards minimal and compact
- Use the same styling language as the current About/video card

Card Style Requirements:
Light Mode:
- White/light card background
- Gray border
- Dark text/icons

Dark Mode:
- Use existing global.css dark theme variables/classes
- Dark navy/slate background
- White text/icons
- Border subtle white/10

Each card should contain:
- Left aligned icon
- Title text only
- Horizontal flex layout
- Vertically centered content

Cards:
1.
Icon: fa-table-cells-large
Title: Table View

2.
Icon: fa-list-ul
Title: List View

3.
Icon: fa-chart-simple
Title: Analytics

Structure Example:
- icon container
- title text
- no description text

Spacing:
- Add margin-top below the video demo section before the cards
- Keep consistent internal padding around 20px–24px

Interactions:
- Smooth transition
- Slight translateY hover
- Slight border glow on hover
- Cursor pointer

Important:
- Only add these below the video demo card
- Do not move the About text content
- Preserve responsiveness
- Do not affect other sections