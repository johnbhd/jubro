# Four-link public navigation and static marketing preview

## Date and type

- Date: 2026-11-08 (Asia/Manila)
- Type: feature

## Problem or goal

The landing hero previously loaded the active workspace's title, counts, and applications. The updated product requirement makes it predictable marketing content rather than a private workspace preview, and adds Features to the four informational navigation links.

## Changes and resulting behavior

- Public informational links are Home, Features, How It Works, and About. Open Jubro remains a separate Board CTA alongside account/theme actions.
- Features points to the existing Simple/Fast/Clean presentation, now a named section. No additional marketing page or redesign was introduced.
- Hero content is static HTML: My Job Search, 3 applications, Google/Frontend Developer/Applied, Canva/UI Designer/Interview, and Microsoft/Software Engineer/Offer. Its Open link always targets `/board/`.
- Deleted the workspace-reading preview/statistics pipeline and its sync-event listeners from the shared page module. Theme preference and authentication continue independently. No demo data is created in storage or sent to sync.
- Browser checks now seed private data and assert that the demo stays fixed across sync events, failed account loading, and logout. Popover checks wait for the queued native toggle/positioning event rather than assuming two animation frames dispatch it.

## Files affected

- `components/navbar.html`: fourth informational Features link.
- `index.html`: Features anchor and permanently visible fixed demo markup.
- `js/main.js`: remove Storage-dependent preview helpers, initialization, and event listeners.
- `test/statusCustomization.browser.mjs`: static/private-data assertions, public-link checks, marketing geometry/screenshots, and condition-based popover readiness.
- This context record. Ignored local architecture/features/development overviews and execution ledger updated separately.

## Verification

- Observed the missing Features assertion fail before adding it, then the static-preview assertion fail while the prior workspace renderer remained. Focused Firefox/BiDi checks passed after the renderer was removed.
- `npm test`: 149 passed, zero failed. JavaScript syntax and `git diff --check` passed.
- Focused browser artifacts before final responsive marketing additions: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-cchKaP/`.
- Full Firefox/BiDi regression passed with no browser errors, including status customization, mouse/touch Board/List dragging, Board-first management/forms/import checks, and static marketing geometry in both themes at 390, 430, 768, 1024, 1440, and 1920px. Artifacts: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-mqusAt/`.
- Inspected representative dark/390px and light/1440px demo screenshots. Package/deployment JSON parsing passed.
- Independent read-only review found no Critical, Important, or Minor issues in the reviewed implementation. Its suggested extra probes led to a separately recorded Search breakpoint fix; scrolled public-navigation geometry passed in both themes at 1024, 1440, and 1920px.
- Final post-fix full browser regression passed with zero browser errors: `/data/data/com.termux/files/usr/tmp/jubro-status-browser-6SP22J/`. Final Node suite remained 149 passed, zero failed; JavaScript syntax, JSON parsing, and staged/unstaged diff checks passed.

## Limitations

No live Firebase, physical-device, deployed-site, or other-browser verification. Build remains blocked by the existing missing Tailwind CLI; no dependencies or generated assets changed. No push or deployment performed.
