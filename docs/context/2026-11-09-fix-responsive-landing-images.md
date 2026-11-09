# Responsive landing images and layout

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The landing page repeated the desktop preview below the workflow section. Several layout utilities were absent from the checked-in generated CSS, so image width caps, section spacing, and the About desktop grid did not apply. The phone could render at its 887px intrinsic width.

## Changes and resulting behavior

- Removed the repeated product-showcase section. One static desktop preview now belongs inside the Hero, with a 1120px container cap.
- Added landing-scoped authored layout styles rather than editing generated Tailwind output. The page has responsive gutters, consistent section spacing, a bounded headline, and clearance below the fixed navbar.
- Limited the About phone to 208px below 640px, 240px below 1024px, and 280px on desktop. About stacks below 1024px and uses two columns above it. Workflow steps use three desktop columns.
- Preserved image proportions with intrinsic dimensions and automatic height. Existing images, copy, navigation, authentication, and application data behavior remain unchanged.
- Added a landing-only browser test mode. Existing Board workflows remain enabled in the normal runner. Test block indentation changed to accommodate the guard.

## Files affected

- `index.html`: single Hero preview, explicit image dimensions, landing layout hooks, and duplicate section removal.
- `css/global.css`: scoped responsive image and section layout rules.
- `test/statusCustomization.browser.mjs`: landing-only mode, decoded-image geometry assertions, navbar clearance, and Hero/About/full-page screenshots.
- `docs/features.md` and `docs/development.md`: updated local-only overview documents, ignored by Git.
- This context record.

## Verification

- Baseline and final `npm test`: 152 passed, 0 failed.
- Added browser assertions failed against the previous layout before the fix.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed in Firefox at 390, 430, 768, 1024, 1440, and 1920px, in dark and light modes, with no JavaScript errors.
- Assertions cover exactly one Hero image inside the Hero, image caps and aspect ratios, About grid columns, no page horizontal overflow, headline clearance, mobile navigation sizing, and static content/storage invariance across sync and authentication events.
- Captured Hero, About, and full-page screenshots for all twelve viewport/theme combinations. Inspected representative screenshots across all six widths and both themes.
- All 70 tracked JavaScript/module files passed `node --check`. Three tracked JSON files and landing JSON-LD parsed successfully.
- `git diff --check`: passed.
- `npm run build`: blocked because the local `tailwindcss` executable is unavailable. No dependency or generated CSS changes were made.

## Limitations

Browser verification used headless Firefox and mocked Firebase, not physical devices, Chromium, Safari, or production services. The earlier full Board browser run stopped at its existing Custom Fields assertion before reaching the landing checks; this fix adds independent landing verification without changing that unrelated behavior. Build verification still requires the existing development dependencies to be installed. No push was performed.
