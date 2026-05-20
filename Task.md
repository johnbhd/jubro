# Google Sitelinks SEO Prompt

Improve my website structure and SEO so Google can generate sitelinks/subpages in search results like Figma, Notion, or other SaaS websites.

## Goals
Make the website optimized for:
- Google sitelinks
- Better indexing
- Brand search visibility
- Rich search results
- Higher crawlability

## Requirements

### Site Structure
Create clean SEO-friendly page structure:

```txt
/
├── /trackers
├── /dashboard
├── /features
├── /about
├── /login
├── /contact
├── /privacy
└── /terms
```

### Navigation SEO
- Improve navbar and footer internal linking
- Ensure all important pages are linked site-wide
- Add semantic navigation structure
- Add breadcrumb navigation

### Head SEO
Add:
- unique titles per page
- unique meta descriptions
- canonical URLs
- Open Graph tags
- Twitter card tags
- robots meta tags

### Structured Data
Add Schema.org structured data:
- WebSite
- Organization
- BreadcrumbList
- SoftwareApplication

### Technical SEO
Create:
- robots.txt
- sitemap.xml
- clean URL structure
- semantic HTML layout

### Accessibility SEO
Improve:
- heading hierarchy
- alt text
- aria-label usage
- semantic sections

### Internal Linking
Ensure:
- homepage links to all important pages
- footer links important pages
- CTA buttons use crawlable links
- no broken links

### Performance SEO
- optimize images
- lazy load non-critical images
- improve Lighthouse SEO score
- improve mobile SEO

### Important
- Do not redesign the UI
- Keep TailwindCSS
- Keep beginner-friendly code
- Preserve responsiveness
- Keep Firebase compatibility
- Make it production-ready
- Optimize for Google indexing and sitelinks generation

Target keywords:
- job tracker
- application tracker
- internship tracker
- freelance tracker
- job dashboard
- simple job tracker

## Production URL
Use `https://jubro.vercel.app/` for canonical URLs, Open Graph URLs, Twitter card images, `robots.txt`, and `sitemap.xml`.
