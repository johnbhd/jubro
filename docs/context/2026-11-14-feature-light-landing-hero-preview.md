# Use light hero preview in light theme

## Date and type

- Date: 2026-11-14 (Asia/Manila)
- Type: feature

## Problem or goal

Landing light mode used the dark product screenshot, creating harsh contrast against the softer page theme.

## Changes and resulting behavior

The existing hero image element now renders `/img/hero-light.png` in light mode and keeps `/img/hero.png` in dark mode. Theme switching updates the rendered preview through the existing `dark` class without changing landing structure or marketing data.

## Files affected

- `css/global.css`: map the hero image to the supplied light asset when `html` is not dark.
- `img/hero-light.png`: supplied light-theme product preview.
- `docs/architecture.md` (local-only): document theme-specific hero assets.
- This context record.

## Verification

- `file img/hero.png img/hero-light.png`: both assets are 1672 × 941 PNGs.
- `npm test`: 257 passed, 0 failed.
- `node --check test/statusCustomization.browser.mjs`: passed.
- `JUBRO_AUTH_ONLY=1 timeout 90s node test/statusCustomization.browser.mjs`: timed out before producing a result in this environment; browser verification remains pending.

## Limitations

The image element keeps `/img/hero.png` as its source for compatibility; light mode changes the rendered asset through CSS `content`. Browser rendering on Firefox still needs a completed run.
