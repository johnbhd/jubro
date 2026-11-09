# Soften landing light mode and clarify contextual CTAs

## Date and type

- Date: 2026-11-09 (Asia/Manila)
- Type: fix

## Problem or goal

The near-white landing page and white screenshot frame created a harsh transition to the dark product image. Repeated Open Jubro buttons lacked contextual wording. Preserve the existing page structure and guest-first Board entry.

## Changes and resulting behavior

- Landing-only light tokens replace the previous gray-50 page (#F9FAFB) with #F4F5F7. Navbar and footer use #FAFAFB with #E5E7EB boundaries. Secondary surfaces use #F8F9FA; feature and final CTA cards remain white.
- Light product framing uses a neutral border, 4px muted frame, and a smaller neutral shadow (0 12px 28px at 8% opacity). The previous frame was 8px white with a 0 20px 50px shadow. The image itself is unchanged. Dark framing retains its existing padding, colors, and shadow.
- Navbar says Start for Free, Hero says Start Tracking and See How It Works, and the final button says Create My Job Search. Final supporting copy includes applications, interviews, offers, and next steps.
- All three primary buttons remain ordinary /board/ links. The secondary button retains #how-it-works. No forced creation, registration, workspace, auth, sync, or application logic changes. Sign In stays separate. The ordinary footer Open Jubro navigation link remains unchanged.

## Files affected

- `index.html`: Hero and final CTA wording.
- `components/navbar.html`: shared navbar CTA wording.
- `css/global.css`: landing-scoped light tokens and preview treatment.
- `test/statusCustomization.browser.mjs`: exact copy/routes, immediate theme switching without data mutation, light surfaces and computed text contrast checks.
- `docs/features.md`: local-only overview, ignored by Git.
- This context record.

## Verification

- New contextual CTA browser assertion failed before implementation and passed afterward.
- `npm test`: 153 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed in dark and light themes at 390, 430, 768, 1024, 1440, and 1920px; no JavaScript errors. Checks include responsive geometry, mobile menu actions, desktop navigation fit, no horizontal overflow, static image privacy, and zero theme-switch workspace mutations.
- Computed light-theme contrast checks meet 4.5:1 for the heading, Hero supporting copy, inactive Features link, primary Hero button, and secondary Hero button. This is focused coverage, not a complete accessibility audit.
- Inspected Firefox screenshots at 390px and 1440px in light mode. Browser artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-vMzTd0`.
- JavaScript syntax checks: all 70 tracked JavaScript/module files passed.
- Tracked JSON and landing JSON-LD parsing: passed.
- `git diff --check`: passed.

## Limitations

No dependencies added. No physical-device or production Firebase testing. Full Board browser suite was not repeated for this landing-only change. Build was not repeated because the local Tailwind CLI is missing; authored CSS does not require regenerating Tailwind. No push performed.
