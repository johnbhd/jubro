Refactor the project routing and folder structure to make the app more SEO-friendly and SaaS-like.

Goals:

* Remove `.html` from public URLs on Vercel
* Make landing page the homepage
* Separate public pages from dashboard/app pages
* Improve navigation architecture
* Keep static HTML + Tailwind + vanilla JS setup

New structure:

/
├── index.html                 -> Landing page
├── trackers/
│   └── index.html             -> Public trackers page
├── dashboard/
│   └── index.html             -> User dashboard
├── board/
│   └── index.html             -> Single tracker board
├── signin/
│   └── index.html             -> Authentication page
├── css/
├── js/
├── img/

Requirements:

* Replace all links using `.html` paths with clean routes:

  * `/trackers`
  * `/dashboard`
  * `/board`
  * `/signin`
* Remove `/pages/` from URLs
* Update navbar links everywhere
* Keep compatibility with Vercel static hosting using `folder/index.html`
* Ensure semantic SEO structure:

  * use `<header>`, `<main>`, `<section>`, `<footer>`
  * proper `<h1>` and `<h2>`
  * meaningful text content
* Homepage (`/`) must become the marketing landing page
* Dashboard should no longer be the homepage
* Keep responsive behavior
* Keep current dark SaaS design aesthetic
* Do not convert to React or SPA
* Keep modular JS architecture
