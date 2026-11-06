# Make user and imported content render safely

## Date and type

- Date: 2026-11-06 (Asia/Manila)
- Type: fix

## Problem or goal

Tracker titles, application values, custom field labels, select labels, and imported values could reach dynamic HTML rendering. Job links also needed a shared protocol check before becoming clickable or opening a new tab.

## Changes and resulting behavior

Dynamic user/imported values now use DOM properties such as `textContent`, element properties, and DOM construction. List cards, badges, details, settings rows, tracker cards, account labels, and table links no longer interpolate user-controlled values into HTML. External links accept only `http:` and `https:` and use `noopener noreferrer` when opened in a new tab. Developer-controlled static templates remain unchanged.

## Files affected

- `js/main/trackerUtils.js`: shared HTTP(S) URL validation and safe option colors.
- `js/main/table.js`: safe link opening and typed change extraction.
- `js/main/listView/badges.js`: DOM badge and favicon rendering.
- `js/main/listView/render.js`: DOM rendering for card values and details.
- `js/main/listView/settings.js`: DOM rendering for user-controlled field labels.
- `js/main/listView/editModal.js`: DOM controls for user-controlled field and option labels.
- `js/homepage/homepage.js`: safe tracker-card values and link properties.
- `js/auth/auth.js`: safe account display name rendering.
- `test/trackerData.test.mjs`: URL protocol regression coverage.
- `docs/architecture.md`, `docs/features.md`, and `docs/development.md`: local-only overview updates.

## Verification

- `npm test`: 33 passed, 0 failed.
- `rg --files -g '*.js' -g '*.mjs' | xargs -r -n1 node --check`: passed.
- JSON parsing check for `package.json`, `package-lock.json`, and `vercel.json`: passed.
- `git diff --check`: passed.
- Local Firefox smoke screenshots loaded landing, trackers, and board pages at 390px width. Firebase CDN requests timed out in this environment.
- Temporary Firefox DOM harness rendered `<img src=x onerror="window.__jubroTest = true">` as text. Result: `PASS: true`; the harness was removed.

## Limitations

Production rendering and authenticated browser flows were not reachable from this environment. Static developer-controlled `innerHTML` templates remain where no user value is interpolated.
