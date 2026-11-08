# Bare domain favicon resolution and circular logo dark background

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

1. When users entered a job application link without an explicit protocol (e.g. `github.com` instead of `https://github.com`), URL parsing threw an error, returning empty hostnames and preventing company/site favicon extraction.
2. For circular logos like GitHub (`github.com`), the image returned from Google's favicon service contained white rectangular corner padding. In both light and dark mode, this produced a white square sticker appearance around the circular logo instead of showcasing the logo's dark background.

## Changes and resulting behavior

1. **Bare Domain URL Normalization**:
   - Added `normalizeUrlString(value)` to [`js/main/favicon.js`](file:///data/data/com.termux/files/home/projects/codev/jubro/js/main/favicon.js) and [`js/main/trackerUtils.js`](file:///data/data/com.termux/files/home/projects/codev/jubro/js/main/trackerUtils.js).
   - If a link has no URI scheme (like `github.com` or `www.github.com/careers`) and its host part contains a valid dot without whitespace, it is normalized with `https://`. Dangerous or non-HTTP schemes (`javascript:`, `data:`, `file:`) and arbitrary text strings without domain structure remain rejected.
   - Users can type `github.com` and immediately get the correct favicon, while clicks on the link open `https://github.com/`.
2. **Circular Logo Handling & Dark Background Presentation**:
   - In [`js/main/favicon.js`](file:///data/data/com.termux/files/home/projects/codev/jubro/js/main/favicon.js), defined `isCircleLogo(domain)` and `isDarkCircleLogo(domain)`.
   - For circular logos like `github.com`, the image receives `rounded-full` (`border-radius: 9999px`) to eliminate square white corners without cropping into the circle.
   - For dark circular logos like `github.com`, the container is styled with `bg-[#24292e] border-[#24292e] text-white`, ensuring the logo shows its dark background rather than white.
   - In [`css/global.css`](file:///data/data/com.termux/files/home/projects/codev/jubro/css/global.css), scoped `.dark .kanban-card-favicon.bg-\[\#24292e\]` so dark mode preserves the `#24292e` background.
   - Non-circular logos (e.g. square or rectangular logos like Google, Microsoft, LinkedIn) do not receive `rounded-full`, ensuring non-circular logos are never cropped.
3. **List View Badges**:
   - In [`js/main/listView/badges.js`](file:///data/data/com.termux/files/home/projects/codev/jubro/js/main/listView/badges.js), circular logos receive `rounded-full` on the image within the circular badge holder.

## Files affected

- `js/main/favicon.js`: Added URL normalization for bare domains, circle/dark logo detectors, and container/image styling for circular logos.
- `js/main/trackerUtils.js`: Updated `getSafeHttpUrl` to normalize bare domains to `https://`.
- `js/main/listView/badges.js`: Applied `rounded-full` to circular logo images.
- `css/global.css`: Preserved dark logo background `#24292e` in dark mode.
- `test/favicon.test.mjs`: Added unit tests verifying bare domain resolution (`github.com`) and circular logo classes (`rounded-full`, `bg-[#24292e]`).
- `docs/context/2026-11-09-fix-bare-domain-favicons-and-circular-dark-logos.md`: Context record for this fix.

## Verification

1. **Unit Tests**:
   - `npm test`: Ran complete test suite. All 152 tests passed with 0 failures.
2. **URL Normalization Tests**:
   - Verified `github.com`, `github.com/path`, `www.github.com`, and `https://github.com` parse correctly and extract hostname `github.com`.
   - Verified `javascript:`, `data:`, `file:`, empty string, and `not-a-valid-url` are safely rejected.
3. **Visual & Browser Verification**:
   - Verified in Firefox across Light Mode and Dark Mode that `github.com` renders a clean dark `#24292e` background without white square corners, and non-circular logos (Google) remain uncropped.
4. **Formatting**:
   - `git diff --check`: 0 warnings or whitespace errors.

## Limitations

- External favicons are subject to network availability; offline clients fall back to the company initial or briefcase icon.
