Fix the dark mode flash (FOUC) on the Jubro landing page without adding a loading screen.

Requirements:

* Dark mode is the default theme.
* Apply the theme before the page renders to prevent the white/light flash during initial load.
* Move the theme initialization script to the top of the `<head>` before CSS files load.
* Add/remove the `dark` class on `document.documentElement` based on the saved theme in `localStorage`.
* If no theme is saved, default to dark mode.
* Ensure all theme transitions continue working after page load.
* Do not use a loader, splash screen, or artificial delay.
* Optimize for the fastest first paint and smooth user experience.
* Verify there is no visible theme switching or flashing when refreshing the page.
