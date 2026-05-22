Create a responsive “View Settings” popup for Jubro List View only.

Goal:
Let users show or hide fields in List View cards.

Requirements:
- Add a settings icon/button beside the “Newest” sort dropdown.
- Clicking it opens a dark themed popup.
- Popup title: “View Settings”
- Add toggles for:
  - Website
  - Status
  - Date
  - Email
  - Location
  - Platform

Behavior:
- ON = show field in List View cards.
- OFF = hide field in List View cards.
- Save settings in localStorage.
- Restore saved settings after refresh.
- Re-render List View instantly when toggled.
- Do not display empty, null, undefined, or “N/A” values even if enabled.
- Email should be hidden by default.
- Add “Reset to Default” button.

Responsive:
- Desktop: small floating popup near settings button.
- Mobile: full-width bottom sheet or centered modal.
- Make toggles easy to tap.

Rules:
- Do not change Table View.
- Do not add edit modal.
- Do not change data structure.
- Use vanilla JS, HTML, and Tailwind CSS only.
- Keep code beginner-friendly.