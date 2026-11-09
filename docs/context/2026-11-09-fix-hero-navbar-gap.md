# Reduce the gap between navigation and Hero

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The user requested slightly less space above the landing Hero.

## Changes and resulting behavior

Reduced landing shell top padding by 24px: from 120px to 96px on mobile/tablet and from 144px to 120px on desktop. Horizontal gutters, other section gaps, and application behavior remain unchanged.

## Files affected

- `css/global.css`: landing shell top padding.
- `docs/features.md`: local-only overview, ignored by Git.
- This context record.

## Verification

- Landing-only Firefox browser checks passed at 390, 430, 768, 1024, 1440, and 1920px in both themes with no JavaScript errors. Existing assertions confirm the navbar does not cover the headline and no horizontal overflow appears.
- `git diff --check`: passed.

## Limitations

CSS-only change; unit tests and build were not repeated. Physical-device testing was not performed. No push was performed.
