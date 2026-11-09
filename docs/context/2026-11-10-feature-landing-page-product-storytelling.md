# Landing Page Product Storytelling, Alternating Mobile Showcases, and FAQ

## Date and type

- Date: 2026-11-10 (Asia/Manila)
- Type: feature

## Problem or goal

The Jubro landing page needed to more clearly answer essential visitor questions without bloating into a generic SaaS template or introducing artificial marketing fillers:
1. What is Jubro?
2. How does it work?
3. Why is it better than spreadsheets?
4. Who is it for?
5. Does it work on mobile?
6. How do I track progress?
7. What features do I get?
8. What questions might stop me from trying it?
9. What should I do next?

The landing page also needed to surface both primary views on mobile—the mobile List view (`phone.png`) and the mobile Board / Kanban view (`kannboard.png`)—with alternating visual rhythm, a simple spreadsheet comparison, and an accessible FAQ accordion.

## Changes and resulting behavior

1. **Section Structure and Visual Flow**:
   - **Navbar**: Preserved public navigation (`Home`, `Features`, `How It Works`, `About`) and CTAs (`Start for Free`, `Sign In` / Account, Theme toggle).
   - **Hero**: Kept clear headline ("Track Every Job Without the Mess"), supporting description, CTA buttons (`Start Tracking` -> `/board/`, `See How It Works` -> `#how-it-works`), and the large desktop Kanban preview (`img/hero.png`).
   - **How Jubro Works**: Compact 3-step section (`01 Add an Application`, `02 Track Its Progress`, `03 Know What Comes Next`).
   - **Why Jubro Instead of Spreadsheets** (New):
     - Heading: "Your Job Search Shouldn't Feel Like a Spreadsheet".
     - Subtitle explaining that while spreadsheets store applications, they don't make the job search easy to understand.
     - Clean, lightweight two-column comparison between `SPREADSHEETS / NOTES` and `JUBRO` across 5 clear points:
       - Manual lists vs. Visual job pipeline
       - Scattered job links vs. Everything in one place
       - Hard to see progress vs. Clear application stages
       - Easy to forget next steps vs. Next Action
       - Setup required vs. Start immediately
   - **Built for Students, Freelancers & Job Seekers** (About):
     - Desktop layout: Copy and benefits on LEFT (7fr), mobile List View showcase (`img/phone.png`) on RIGHT (5fr).
     - Stacks cleanly on mobile (< 1024px) with copy above the phone visual.
   - **See Where Every Application Stands** (New Alternating Mobile Showcase):
     - Desktop layout: Mobile Board View showcase (`img/kannboard.png`) on LEFT (5fr), copy and benefits on RIGHT (7fr).
     - Alternates rhythm against the previous section (`Text -> Phone`, then `Phone <- Text`).
     - Stacks naturally on mobile (< 1024px) with copy above the phone visual (`order-1` for copy, `order-2` for image).
   - **Everything You Need to Stay On Top of Applications** (Features):
     - Four focused feature cards: `Visual Job Pipeline`, `Next Action`, `Board & List`, and `Local + Cloud`.
   - **Frequently Asked Questions (FAQ)** (New):
     - Single-column, clean bordered accordion containing 5 truthful questions:
       1. "Can I use Jubro without an account?" -> "Yes. You can start using Jubro as a guest without creating an account."
       2. "What happens when I sign in?" -> "Signing in lets your supported Jubro data synchronize through your account instead of remaining only on the current device."
       3. "Can I create multiple Job Searches?" -> "Yes. You can separate different searches such as internships, freelance work, or full-time applications."
       4. "Is Jubro free?" -> "Jubro is currently available to use without a paid subscription."
       5. "Does Jubro work on mobile?" -> "Yes. Jubro is a responsive web app designed to work across desktop, tablet, and mobile browsers."
     - Built with semantic `<button>` elements, `aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby`, minimum 48px touch targets, and keyboard activation.
   - **Final CTA**:
     - Retained contextual headline ("Ready to organize your job search?") and button ("Create My Job Search" -> `/board/`).
   - **Footer**:
     - Compact footer with product links, developer links, community links, and legal links.

2. **Styling and Theme Compatibility**:
   - Both phone mockups (`phone.png` and `kannboard.png`) share `.landing-phone-visual` responsive width limits (208px mobile, 240px tablet, 280px desktop) and drop shadows.
   - Preserved dark mode deep navy background (`#0B1120`), elevated slate cards (`#1f2937`), white headings, and readable contrast.
   - Preserved light mode soft gray canvas (`#F4F5F7`), white cards, and neutral borders (`#E5E7EB`).
   - Verified zero horizontal overflow across all breakpoints (`scrollWidth <= innerWidth`).

3. **Data Isolation and Truthfulness**:
   - Marketing visuals use static image assets and never read or render user workspace data, Firebase, or localStorage tracker contents.
   - Zero framework additions, zero extra libraries.

## Files affected

- `index.html`: Added Why Jubro comparison section, second mobile Board showcase section (`kannboard.png`), and accessible FAQ accordion section.
- `css/global.css`: Added responsive grid rules and alternating order for `.landing-board-showcase-grid`, FAQ item button styling, and dark mode typography/contrast rules for `#homeBody`.
- `js/main.js`: Implemented `setupFaqAccordion()` to handle accessible toggle and icon state.
- `docs/features.md`: Updated landing page documentation with new sections and mobile layout details.
- `docs/context/2026-11-10-feature-landing-page-product-storytelling.md`: This change record.

## Verification

- **Unit tests**: Ran `npm test` — all 188 unit tests passed.
- **Full browser test suite**: Ran `node --experimental-websocket test/statusCustomization.browser.mjs` — verified that all landing and board test suites pass across all 6 viewports and both themes with zero errors.
- **FAQ interaction tests**: Verified in headless Firefox that triggers toggle `aria-expanded` ("true"/"false"), show/hide answer content, toggle plus/minus icons, and operate via keyboard activation.
- **Responsive verification & screenshots**: Tested and visually verified full-page captures across light and dark themes at 1440px (desktop), 768px (tablet), and 390px (mobile) (`landing-light-1440-full.png`, `landing-dark-1440-full.png`, `landing-light-390-full.png`, `landing-dark-390-full.png`).

## Limitations

- `phone.png` and `kannboard.png` show realistic static interface previews; they do not interactively mirror live user data.
