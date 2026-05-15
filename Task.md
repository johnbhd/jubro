Overwrite my current Firebase/localStorage sync logic with the safer sync flow below.

Important:
Do not keep the old behavior where login immediately uploads localStorage to Firebase.
Remove or replace any code path that allows empty localStorage to overwrite existing Firestore data.

Problem:
Right now, when a user logs in, the app uploads localStorage to Firestore. If localStorage is empty like `{ active: null, data: {} }`, it overwrites the user's existing Firebase tracker data and makes it empty/null.

New required behavior:
On login, Firebase should be checked first before uploading anything.

Implement this flow:

1. Load local state from `Storage.load()`.

2. Fetch existing Firestore tracker data first:
   - Check `trackerData/{user.uid}`
   - If missing, check `users/{user.uid}.trackerData`

3. Add or use this helper:

```js
function hasValidTrackerData(state) {
  if (!state || typeof state !== "object") return false;
  if (!state.data || typeof state.data !== "object") return false;

  return Object.values(state.data).some((tracker) => {
    return (
      tracker &&
      typeof tracker === "object" &&
      Array.isArray(tracker.rows) &&
      tracker.rows.length > 0
    );
  });
}