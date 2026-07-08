Fix the Add Field popup for List View settings.

Context:
I already have:
- #listSettingsPopup as the Customize Fields modal
- #listAddFieldModal as the Add Field modal
- Add Field opens from btnListSettingsAdd and btnListSettingsAddBottom

Current problems:
1. The Add Field popup should appear on top of the Customize Fields modal.
2. The Add Field popup should have a better responsive full-width modal size.
3. The select dropdown looks white / default browser style. It should match the dark theme.
4. Do not redesign unrelated UI.

Required changes:

1. Make Add Field modal appear above Customize Fields

#listSettingsPopup currently uses:
z-[65]

#listAddFieldModal should stay higher than that:
z-[80] or z-[90]

Use:
class="hidden fixed inset-0 z-[90] items-center justify-center bg-black/70 p-4"

Important:
Since the modal is hidden by default, do not keep `flex` permanently in the class if the JS only toggles `hidden`.
Use `hidden` by default, then JS should add `flex` when opening.

2. Update Add Field modal wrapper

Replace the opening Add Field modal div with:

<div id="listAddFieldModal" class="hidden fixed inset-0 z-[90] items-center justify-center bg-black/70 p-4">

Then update JS:

openListAddFieldModal() should:
modal.classList.remove("hidden");
modal.classList.add("flex");

closeListAddFieldModal() should:
modal.classList.add("hidden");
modal.classList.remove("flex");

3. Make the Add Field form full width and responsive

Change the form class from:
w-full max-w-sm

To:
w-full max-w-md

Use this form class:
class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-4 text-gray-100 shadow-2xl sm:p-5"

This makes it:
- full width on mobile
- nice centered max width on desktop
- consistent with Customize Fields modal

4. Fix select dark mode styling

Update #listAddFieldType class so it does not appear white/default.

Use:
class="mt-1 h-10 w-full appearance-none rounded-lg border border-gray-700 bg-gray-950 px-3 pr-10 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"

Also add dark option styling:

<option class="bg-gray-950 text-white" value="text">Text</option>
<option class="bg-gray-950 text-white" value="number">Number</option>
<option class="bg-gray-950 text-white" value="date">Date</option>
<option class="bg-gray-950 text-white" value="select">Select</option>
<option class="bg-gray-950 text-white" value="url">URL</option>
<option class="bg-gray-950 text-white" value="checkbox">Checkbox</option>

5. Optional but recommended: wrap the select in a relative div and add a chevron icon

Change this:

<select id="listAddFieldType" class="...">
  ...
</select>

To:

<div class="relative mt-1">
  <select id="listAddFieldType" class="h-10 w-full appearance-none rounded-lg border border-gray-700 bg-gray-950 px-3 pr-10 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20">
    <option class="bg-gray-950 text-white" value="text">Text</option>
    <option class="bg-gray-950 text-white" value="number">Number</option>
    <option class="bg-gray-950 text-white" value="date">Date</option>
    <option class="bg-gray-950 text-white" value="select">Select</option>
    <option class="bg-gray-950 text-white" value="url">URL</option>
    <option class="bg-gray-950 text-white" value="checkbox">Checkbox</option>
  </select>
  <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
</div>

6. Make sure clicking outside Add Field modal closes only Add Field modal

Keep this behavior:
if (event.target.id === "listAddFieldModal") this.closeListAddFieldModal();

Do not close Customize Fields when Add Field modal is open.

7. Final expected Add Field modal structure

<div id="listAddFieldModal" class="hidden fixed inset-0 z-[90] items-center justify-center bg-black/70 p-4">
  <form id="listAddFieldForm" class="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-4 text-gray-100 shadow-2xl sm:p-5">
    <h2 class="text-base font-semibold">Add Field</h2>

    <label class="mt-4 block">
      <span class="text-sm text-gray-300">Field name:</span>
      <input id="listAddFieldName" type="text" class="mt-1 h-10 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" placeholder="Salary" />
    </label>

    <label class="mt-3 block">
      <span class="text-sm text-gray-300">Field type:</span>
      <div class="relative mt-1">
        <select id="listAddFieldType" class="h-10 w-full appearance-none rounded-lg border border-gray-700 bg-gray-950 px-3 pr-10 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20">
          <option class="bg-gray-950 text-white" value="text">Text</option>
          <option class="bg-gray-950 text-white" value="number">Number</option>
          <option class="bg-gray-950 text-white" value="date">Date</option>
          <option class="bg-gray-950 text-white" value="select">Select</option>
          <option class="bg-gray-950 text-white" value="url">URL</option>
          <option class="bg-gray-950 text-white" value="checkbox">Checkbox</option>
        </select>
        <i class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
      </div>
    </label>

    <div class="mt-4 flex justify-end gap-2">
      <button id="btnCancelListAddField" type="button" class="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-100 hover:bg-gray-800">Cancel</button>
      <button type="submit" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">Add Field</button>
    </div>
  </form>
</div>

Important:
Do not change existing IDs.
Do not break these functions:
- openListAddFieldModal()
- closeListAddFieldModal()
- addListFieldFromModal()

Only fix the Add Field modal layering, width, responsiveness, and dark select styling.