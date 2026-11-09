# Landing spacing and OnlineJobs.ph platform favicon

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The three About benefits had no vertical gap because their spacing utility was missing from generated CSS. The final Open Jubro CTA also lacked its intended horizontal padding. OnlineJobs.ph needed a white circular favicon background in List platform badges without changing other icons.

## Changes and resulting behavior

- Added explicit 14px grid gaps between the three benefits.
- Added 32px horizontal padding to the final CTA button.
- Marked only OnlineJobs.ph platform/source badge favicons for a white background in both themes. Other platforms and application-link icons retain their previous appearance.
- No application data, persistence, sync, dependencies, or generated CSS changed.

## Files affected

- `index.html`: scoped benefit and final CTA styling hooks.
- `css/global.css`: benefit gaps, CTA padding, and targeted favicon background.
- `js/main/listView/badges.js`: OnlineJobs.ph platform favicon marker.
- `test/favicon.test.mjs`: platform selection and unchanged application-link regression coverage.
- `test/statusCustomization.browser.mjs`: benefit geometry, CTA padding, and favicon color assertions.
- `docs/features.md`: local-only presentation overview, ignored by Git.
- This context record.

## Verification

- New favicon test failed before the implementation and passed afterward.
- `npm test`: 153 passed, 0 failed.
- Landing-only Firefox browser checks passed at 390, 430, 768, 1024, 1440, and 1920px in both themes, with no JavaScript errors. Checks include actual benefit gaps, CTA padding, white OnlineJobs.ph backgrounds, and unchanged black default favicon backgrounds.
- Inspected the mobile full-page screenshot for benefit spacing and CTA width.
- JavaScript syntax checks for changed modules/tests and `git diff --check` passed.

## Limitations

Browser checks use headless Firefox and mocked services, not physical devices. Live favicon network responses were not verified. Build was not repeated: the local Tailwind CLI remains unavailable as documented in the previous record. No push was performed.
