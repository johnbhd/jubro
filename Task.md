Implement Enter key submit behavior for all forms and button-like form actions in my app.

Goal:
When the user is typing inside an input field and presses Enter, it should trigger the correct form action/button.

Examples:
- Login form: pressing Enter should click/submit the Login button.
- Register form: pressing Enter should submit/register.
- Add new tracker form/modal: pressing Enter should create the tracker.
- Add job/row form: pressing Enter should add/save the job entry.
- Search or filter inputs should only trigger their intended search/filter behavior, not accidentally submit another form.
- Textareas should NOT submit on Enter because users may need new lines.

Tasks:
1. Search the project for all forms, login/register inputs, modal inputs, tracker name inputs, job entry inputs, and button click handlers.
2. Replace button-only click logic with proper `<form>` submit logic wherever possible.
3. Add `submit` event listeners to forms instead of relying only on button `click`.
4. Make submit buttons use `type="submit"`.
5. Make non-submit buttons use `type="button"` so they do not accidentally submit the form.
6. For forms without a real `<form>` wrapper, either:
   - wrap the inputs and button in a `<form>`, or
   - add a keydown listener that checks `event.key === "Enter"` and calls the same function as the button.
7. Prevent page reload using `event.preventDefault()` inside submit handlers.
8. Avoid duplicate actions:
   - Do not make Enter and click run the action twice.
   - Both Enter submit and button click should call the same single handler function.
9. Do not make Enter submit when:
   - focus is inside a textarea
   - user is using Shift+Enter
   - the current input belongs to a search/filter field unless that is intended
10. Keep the code beginner-friendly and modular.
11. Do not refactor unrelated parts of the app.
12. Do not add new features outside Enter key support.

Important:
Before editing, list every form/input area you found and explain how you will make Enter trigger the correct action.

After editing:
1. Show the changed files.
2. Explain what changed.
3. Tell me how to test:
   - Login Enter key
   - Register Enter key
   - New tracker Enter key
   - Add job row Enter key
   - Cancel/close buttons should not submit
   - Textarea Enter should not submit