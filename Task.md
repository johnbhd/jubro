Act as a senior Technical SEO auditor.

Analyze my project with this SEO policy:

Only the main landing page index.html should be indexed by Google.
All app/workspace pages should not be indexed for now.

Indexable page:
- /index.html
- https://jubro.vercel.app/

Noindex pages:
- /trackers/index.html
- /board/index.html
- /pages/tracker.html
- /pages/board.html

Check only if the landing page is ready for Google Search Console and Google indexing.

Audit the following:

- index.html has a unique and descriptive title.
- index.html has a strong meta description.
- canonical URL points to https://jubro.vercel.app/
- robots meta is index, follow on index.html.
- Open Graph and Twitter tags exist on index.html.
- JSON-LD structured data exists on index.html.
- sitemap.xml exists and contains only https://jubro.vercel.app/
- robots.txt exists and references sitemap.xml.
- Other non-landing pages have noindex, follow.
- No duplicate indexable pages exist.
- Internal links from landing page work correctly.
- No broken links or href="#" issues on the landing page.
- All landing page images have meaningful alt attributes.
- Heading structure is valid on landing page, with only one H1.
- Navbar does not inject another H1.
- Important landing page content is visible and crawlable.
- Component-loaded sections do not hide critical SEO content.
- Mobile responsiveness of the landing page.
- Page performance and Core Web Vitals concerns.
- Accessibility issues affecting landing page SEO.
- Dark mode does not cause major layout shift or flash issues.

Output format:

1. Landing Page SEO Score (0-100)
2. Ready for Google Search Console? (Yes/No)
3. Critical Issues for index.html
4. Noindex/Crawl Policy Issues
5. Recommended Improvements
6. SEO Wins Already Implemented
7. Exact files and code sections that need changes
8. Final verdict: "Ready to Submit" or "Not Ready Yet"

Be strict. Do not require full SEO metadata for /trackers, /board, or /pages/* because they are intentionally noindex for now.
Review the actual code and structure before giving the verdict.