Update the existing **Jubro website navigation bar** and turn it into a modern **scroll-aware floating glassmorphism navbar**.

Do not redesign the navigation content, logo, links, buttons, routes, or existing functionality. Only improve the navbar’s appearance, positioning, responsiveness, and scroll behavior.

## Required behavior

### Initial position

When the page is at the top:

* Keep the navbar visible.
* Use a mostly transparent background.
* Keep it wider and closer to its current layout.
* Do not apply an excessive shadow.
* Preserve the existing Jubro logo, navigation links, and account or action buttons.

### When scrolling down

* Hide the navbar smoothly when the user scrolls downward.
* Move it upward using a smooth transform animation.
* Do not instantly remove it with `display: none`.
* The page content must not jump when the navbar hides.

### When scrolling up

* Show the navbar again when the user scrolls upward.
* Animate it smoothly back into view.
* The navbar must remain fixed near the top of the viewport.

### After scrolling

Once the user has scrolled past approximately `50px`:

* Change the navbar into a floating container.
* Add space between the navbar and the top and side edges of the screen.
* Apply a glassmorphism background.
* Use backdrop blur.
* Use a semi-transparent white background in light mode.
* Use an appropriate semi-transparent dark background in dark mode, if dark mode exists.
* Add a subtle border.
* Add a soft shadow.
* Apply a large rounded radius, preferably `rounded-2xl` or a similar custom value.
* Slightly reduce the navbar’s maximum width so it feels like a floating navigation pill.
* Keep the content properly aligned and vertically centered.

Suggested floating appearance:

```txt
position: fixed
top: 12px to 16px
left and right: responsive spacing
max-width: existing site container width
margin: auto
border-radius: 20px to 24px
backdrop-filter: blur(16px)
```

## Animation requirements

Use smooth transitions for:

* Navbar transform
* Background color
* Border
* Box shadow
* Width or spacing
* Border radius

Suggested transition duration:

```txt
250ms to 350ms
```

Use an easing such as:

```txt
ease-out
```

Respect users who prefer reduced motion.

## Scroll logic

Implement clean scroll-direction detection:

* Store the previous scroll position.
* When the current position is greater than the previous position and the user has scrolled beyond the navbar threshold, hide the navbar.
* When the current position is less than the previous position, show the navbar.
* Always show the navbar when the page is near the top.
* Use a small scroll difference threshold to prevent flickering from tiny scroll movements.
* Avoid unnecessary repeated DOM updates.
* Clean up scroll event listeners when appropriate.

Example state names:

```js
isScrolled
isNavbarVisible
lastScrollY
```

Use `requestAnimationFrame` or another lightweight method if needed to keep scrolling smooth.

## Mobile behavior

Preserve the existing mobile navigation and menu functionality.

Make sure:

* The floating navbar has smaller side spacing on mobile.
* The navbar does not overflow the viewport.
* The mobile menu button remains visible.
* Opening the mobile menu keeps the navbar visible.
* The navbar should not hide while the mobile menu is open.
* The mobile dropdown or menu panel remains correctly positioned below the navbar.
* Touch targets remain accessible.

Suggested spacing:

```txt
Mobile: left/right 8px to 12px
Tablet/Desktop: left/right 16px to 24px
```

## Accessibility

* Preserve semantic navigation markup.
* Preserve existing link labels and ARIA attributes.
* Maintain visible keyboard focus states.
* Ensure sufficient contrast despite the transparent glass background.
* Add `aria-label` only where needed.
* Respect `prefers-reduced-motion`.

## Important restrictions

* Do not remove or rename any existing navigation links.
* Do not change the Jubro logo.
* Do not break authentication, routing, active-link states, mobile-menu logic, or existing click events.
* Do not install a new UI library just for this effect.
* Reuse the project’s current CSS approach, whether it uses Tailwind CSS, regular CSS, or JavaScript classes.
* Do not duplicate the navbar.
* Keep the code modular and readable.
* Do not modify unrelated sections of the page.

## Expected result

The final Jubro navbar should:

1. Start as a clean transparent navbar.
2. Become a floating rounded glassmorphism navbar after scrolling.
3. Hide smoothly when scrolling down.
4. Reappear smoothly when scrolling up.
5. Work correctly on desktop and mobile.
6. Preserve all current Jubro navigation content and functionality.

After implementing it, review the related navbar files and briefly report:

* Which files were changed
* How scroll direction is detected
* Which classes or styles control the floating glassmorphism state
* How mobile navigation behavior was preserved
