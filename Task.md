Create a popup/modal for List View customization and editing in my Jubro job tracker.

Goal:
Add two popups:
1. Edit Job Application modal
2. View Settings modal with show/hide fields and create custom field option

Important:
This is only for improving the List View UX. Do not remove Table View. Do not change Firebase/backend.

Edit Job Application Modal:
- When the user clicks the edit icon on a List View card, open an edit modal.
- Reuse the same data from localStorage.
- Fields inside the modal:
  - Company
  - Position
  - Status
  - Date
  - Email
  - Location
  - Website / Job Link
- Buttons:
  - Cancel
  - Save Changes
- After saving:
  - Update localStorage
  - Close modal
  - Re-render the active view
- Use one shared edit function if Table View already has edit logic.

View Settings Modal:
- Add a small settings button in the List View header near the sort dropdown or view dropdown.
- When clicked, open a “View Settings” modal or popover.
- Purpose: allow user to show or hide specific fields in List View cards.
- Add toggle switches/checkboxes for:
  - Website
  - Status
  - Date
  - Email
  - Location
  - Platform
- If a field is turned off, hide it from every List View card.
- Save visibility settings in localStorage.
- When page reloads, keep the same hidden/shown fields.
- Default hidden field:
  - Email should be hidden if value is N/A or empty.
- Do not show “N/A” in List View if the field is empty or not useful.

Create New Field Feature:
- Inside the View Settings modal, add a “Create New Field” section.
- User can type a custom field name.
- Example:
  - Salary
  - Notes
  - Contact Person
  - Job Type
- Add button: “Add Field”
- When a new field is created:
  - Save it to localStorage
  - Show it as an optional field in the Edit Job modal
  - Allow it to be shown/hidden in View Settings
  - Display it in List View cards only if it has a value
- Do not break old job data that does not have this custom field.
- Existing jobs should show blank input for new custom fields when edited.

UI Design:
- Match my current dark theme.
- Modal should have rounded corners, dark background, subtle border, and clean spacing.
- Add backdrop overlay behind the modal.
- Use readable labels and clean form inputs.
- Settings modal can be smaller than the edit modal.
- Make it responsive on mobile.

Behavior Rules:
- View settings affect List View only.
- Table View should stay unchanged unless already using the same fields.
- Empty values, null, undefined, and “N/A” should not display in List View cards.
- Keep the code beginner-friendly.
- Use vanilla JavaScript, HTML, and Tailwind CSS only.
- Do not use React.
- Do not add backend or Firebase changes.
- Do not add extra features outside this request.