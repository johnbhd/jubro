# Refine separate FAQ cards

## Date and type

- Date: 2026-11-12 (Asia/Manila)
- Type: feature

## Problem or goal

The user approved a modern refinement of the existing separate FAQ cards, matching the landing Features treatment without changing questions, answers, layout position, or accordion behavior.

## Changes and resulting behavior

- Replaced conflicting FAQ utility classes with scoped semantic styles. Existing light/navy landing tokens now also cover FAQ surfaces, borders, primary text, and muted answer text.
- Cards retain 16px corners and use borders/surface contrast instead of shadows. Gaps are 12px mobile and 16px from 640px upward. Questions have a 64px minimum row height and 20px mobile/24px desktop horizontal padding.
- Questions remain 16px semibold. Answers use 14px mobile/15px desktop text, 1.7 line-height, a subtle divider, matching horizontal alignment, and 20px bottom padding.
- Hover/open borders use the restrained landing accent; open question surfaces and 28px decorative chevron badges receive soft-blue tints. The question text stays neutral.
- Native buttons, IDs, region links, data hooks, initially closed state, independent toggles, and the existing JavaScript handler remain unchanged. Icon badges are explicitly hidden from assistive technology.
- An inset 2px keyboard-focus outline avoids clipping at rounded edges. Reduced-motion preferences disable FAQ transitions while preserving the final chevron state.
- No application logic, authentication, workspace data, sync, dependencies, or other landing sections changed.

## Files affected

- `index.html`: scoped FAQ classes and decorative badge semantics; all FAQ copy preserved.
- `css/global.css`: FAQ surfaces, spacing, typography, states, focus, and motion rules.
- `test/landingFlow.test.mjs`: preserve exact five questions/answers, native control hooks, and initial ARIA state.
- `test/faq.browser.mjs`: new pointer, layout, contrast, ARIA, independent-expansion, motion, and conditional native-keyboard checks.
- `test/statusCustomization.browser.mjs`: integrate FAQ checks/screenshots into existing normal and focused motion matrices, with explicit keyboard verification/skip counts.
- `docs/features.md`: local-only, Git-ignored FAQ description updated.

## Verification

- The new unit test failed against the old utility-only markup before implementation.
- `npm test`: 219 passed, 0 failed.
- `JUBRO_LANDING_ONLY=1 node test/statusCustomization.browser.mjs`: passed dark/light at 390, 430, 768, 1024, 1440, and 1920px with zero JavaScript errors. FAQ checks cover actual pointer activation, every answer's visibility/ARIA linkage, independent expansion, alignment, responsive spacing, contrast, viewport fit, and no workspace mutation. Native keyboard/focus checks were explicitly skipped in 12 inactive-window cases.
- `JUBRO_LANDING_ONLY=1 JUBRO_REDUCED_MOTION=1 node test/statusCustomization.browser.mjs`: passed focused Features/FAQ checks in both themes at the same widths plus 640px, with zero JavaScript errors. FAQ transitions are disabled. Native keyboard/focus checks were explicitly skipped in 14 inactive-window cases.
- Inspected generated dark 1440px and light 390px FAQ screenshots; the separate-card layout, neutral surfaces, text wrapping, and smaller chevron badges remain balanced.
- JavaScript syntax checks and `git diff --check`: passed.
- Independent read-only review found no actionable code or accessibility defects; its pending documentation items were updated.

## Limitations

The local headless Firefox window remains inactive even after browsing-context activation. Diagnostics confirmed trusted, unprevented Enter events reach the focused native button, but Firefox does not perform default button activation in that state. Window activation, focus calls, and a temporary focus-manager test preference did not resolve this environment constraint; the unused preference and diagnostics were removed. Browser results explicitly report skipped native-keyboard checks when the window is inactive, rather than claiming Enter/Space activation or visible-focus verification. Those checks run normally if an active browser window is available. Native button semantics and the existing handler remain unchanged.

Physical devices are untested. The pre-existing reduced-motion hero-glow overflow remains outside scope; focused motion checks cover Features and FAQ rather than claiming a whole-page reduced-motion pass. No push performed.
