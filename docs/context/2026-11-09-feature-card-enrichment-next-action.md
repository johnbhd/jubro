# Card enrichment and Next Action workflow

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: feature

## Problem or goal

Job application cards previously indicated where an application currently stood (via Status), but did not communicate the immediate next actionable step or its deadline (what should the user do next and when). In addition, Kanban cards lacked visual hierarchy and identity markers, such as company/site favicons and clear status-colored boundary indicators. The goal was to:
1. Add typed, optional `Next Action` (text) and `Next Action Date` (date) fields into the default schema and Add/Edit application modals.
2. Enrich Kanban cards with a company favicon derived from `Job Link` (HTTP/HTTPS only) with graceful fallback to company initials or a briefcase icon.
3. Add a 4px vertical status accent border to Kanban cards and the empty-board guide card, while keeping List view clean without status borders.
4. Ensure full backward compatibility for existing trackers without migration errors or synthetic state changes.

## Changes and resulting behavior

1. **Default Schema & Column Indexes**:
   - Extended `defaultTracker.js` with `{ name: 'Next Action', type: 'text' }` and `{ name: 'Next Action Date', type: 'date' }`.
   - Updated `indexes.js` to recognize `nextAction` and `nextActionDate` across both default and custom configurations.
   - Updated `trackerSearch.js` so search queries match `Next Action` text.
2. **Add & Edit Application Modals**:
   - In `applicationForm.js`, updated `createApplicationDraft()` to ensure only primary application date fields default to today, while `Next Action Date` remains blank (`''`) for clean optional scheduling.
   - Updated `editModal.js` with helpful placeholders (`'e.g. Follow up with recruiter'` and `'https://...'`).
   - Saving preserves optional blank values without validation failures.
3. **Favicon Extraction & Fallback**:
   - In `favicon.js`, enforced strict protocol validation (`http:`, `https:`) in `getLinkFavicon(link)`. Executable schemes like `javascript:` and `data:` are rejected.
   - Built `createCompanyFaviconElement(jobLink, company)` which requests Google Favicon endpoint for valid HTTP(S) links and attaches a graceful error listener that falls back to the company's capitalized first letter (e.g., 'G' for 'Google') or a briefcase icon if company name is blank.
4. **Kanban Card Visual Hierarchy & Vertical Status Accent**:
   - In `kanban.js`, structured Kanban cards with:
     - Top row: Favicon element + Company name (truncated) + drag handle & action menu + Position.
     - Metadata row: Date · Platform.
     - Next Action row: rendered only when `Next Action` or `Next Action Date` is populated. Shows the action text and/or formatted date (e.g. `Nov 11`) with a calendar icon. Omitted cleanly when empty.
     - 4px vertical status accent: colored left border (`borderLeftColor = color`, `--card-status-accent`), slate for fallback or unassigned status.
   - Updated empty guide card (`kanban-guide-card`) to showcase the enriched layout with local icon placeholder, Next Action example, and matching left status accent.
5. **Styling & Theme Support**:
   - In `global.css`, added `.kanban-card` and `.kanban-guide-card` rules with 4px solid left border.
   - Preserved left status accent in dark mode by scoping dark border colors to top, right, and bottom borders while binding left border to `--card-status-accent`.
   - List view rows remain clean without vertical status accents.

## Files affected

- `js/tracker/defaultTracker.js`: Added `Next Action` and `Next Action Date` to default column definitions.
- `js/main/listView/indexes.js`: Added column index mappings and canonical keys for `nextAction` and `nextActionDate`.
- `js/main/applicationForm.js`: Configured `createApplicationDraft` to keep `Next Action Date` blank by default.
- `js/main/listView/editModal.js`: Added input placeholders for `Next Action` and `Link`.
- `js/main/trackerSearch.js`: Added `Next Action` to searchable column names.
- `js/main/favicon.js`: Implemented URL protocol validation and company initial / briefcase fallback element creation.
- `js/main/kanban.js`: Rendered Kanban cards with favicon, status accent border, and Next Action container; updated empty guide card.
- `css/global.css`: Added 4px left border rules and dark mode theme adjustments for Kanban cards and guide card.
- `test/jobSearch.test.mjs`: Updated default column assertion for 8 columns.
- `test/applicationForm.test.mjs`: Updated draft structure assertion and custom field test; added typed test for Next Action saving.
- `test/favicon.test.mjs`: Added unit tests verifying URL protocol filtering and fallback initial/icon element generation.
- `docs/features.md`: Updated feature documentation for default schema and Kanban card enrichment.

## Verification

1. **Unit Tests**:
   - `npm test`: Ran complete test suite. All 152 tests passed across all test files with 0 failures.
2. **Status Customization & Responsive Viewport Browser Tests**:
   - `node --experimental-websocket test/statusCustomization.browser.mjs`: Passed across 2 themes (light & dark) and 6 viewport widths (390px, 430px, 768px, 1024px, 1440px, 1920px) with 0 errors.
3. **Format & Diff Hygiene**:
   - `git diff --check`: Verified zero whitespace or indentation anomalies.

## Limitations

- Website favicons depend on client network access to Google Favicon service (`https://www.google.com/s2/favicons?domain=...`). When offline or blocked, the card seamlessly falls back to company initial or briefcase icon without broken images.
- Reminders, calendar sync, and push notifications for `Next Action Date` are intentionally omitted in this cycle.
