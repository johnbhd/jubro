Update my Jubro job tracker UI to show website favicon images beside the platform text.

Goal:
Add a small website favicon/logo before the platform name in both Table View and List View cards.

Requirements:
- Get the favicon based on the job link URL.
- Use the job link/domain to generate the favicon image.
- Show the favicon before the platform text.
- Apply this in:
  1. Table View platform column
  2. List View job cards platform/source area
- Do not change my existing data structure.
- Do not remove existing platform text.
- Keep the image small, clean, and aligned with the text.

Favicon logic:
- Create a helper function like getFaviconUrl(link).
- Extract the hostname from the job link using new URL(link).
- Use this favicon source:
  https://www.google.com/s2/favicons?domain=DOMAIN_HERE&sz=64
- If the link is invalid or empty, show a default small globe/link icon instead.

UI design:
- Favicon size: 20px to 24px.
- Make it rounded.
- Add small padding/background so it looks good in dark mode.
- Align icon and platform text using flex items-center gap-2.
- Keep the current platform badge colors.
- The favicon should appear inside or beside the platform badge, depending on the current design.
- Make sure it looks good in both dark and light mode.

Example output:
In Table View platform column:
[ favicon ] LinkedIn

In List View card:
[ favicon ] LinkedIn · careers.google.com

Important:
- Use vanilla JavaScript, HTML, and Tailwind CSS only.
- Do not use React.
- Do not add backend or Firebase changes.
- Do not add extra features.
- Keep the code beginner-friendly.