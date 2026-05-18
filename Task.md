Refactor the homepage for better maintainability while preserving SEO.

Only load reusable UI parts dynamically:

* navbar.html
* footer.html
* modal.html

Keep all SEO-important content directly inside `index.html`:

* hero section
* headings
* features/how it works
* about section
* descriptive paragraphs

Update `main.js` so only navbar and footer use `loadComponent()`.

Rules:

* Use only HTML, Tailwind CSS, and vanilla JS
* Preserve responsiveness and existing design
* Keep semantic HTML structure
* Do not fetch main content sections with JavaScript
* Keep code modular and beginner-friendly
