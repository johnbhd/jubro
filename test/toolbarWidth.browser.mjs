// Invoked through JUBRO_TOOLBAR_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyToolbarWidth({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: 'toolbar', ownerType: 'guest', ownerId: null, revision: 1,
      data: { toolbar: createDefaultTracker('toolbar', 'Internship Search') },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const { TrackerApp } = await import('/js/main/main.js');
    window.toolbarApp = new TrackerApp();
    window.toolbarFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.toolbarStoredState = localStorage.getItem('flextracker_data');
  `);

  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1280, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      const result = await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        toolbarApp.closeMobileSearch();
        await toolbarFrame();
        const failures = [];
        function check(condition, message) {
          if (!condition) {
            failures.push(message);
          }
        }
        const selector = document.getElementById('jobSearchSelector');
        const label = selector.firstElementChild;
        const chevron = selector.lastElementChild;
        const search = document.getElementById('searchWrapper');
        const input = document.getElementById('jobSearchInput');
        const sort = document.getElementById('sortSelect');
        for (const title of ['My Job Search', 'Internship Search', 'Freelance Search', 'Full-Time Search']) {
          label.textContent = title;
          if (innerWidth >= 768) {
            check(label.scrollWidth <= label.clientWidth, title + ' must be fully readable: '
              + JSON.stringify({ content: label.scrollWidth, visible: label.clientWidth,
                font: getComputedStyle(label).font, selector: selector.getBoundingClientRect().width }));
            check(selector.getBoundingClientRect().width >= 200, 'Protect selector width');
          }
          const gap = chevron.getBoundingClientRect().left - label.getBoundingClientRect().right;
          check(gap >= 4 && gap <= 8, 'Chevron stays adjacent to title');
        }
        label.textContent = 'Software Engineering Internship Search 2026 and beyond';
        check(selector.getBoundingClientRect().width <= 240, 'Long titles have a bounded selector');
        check(label.scrollWidth > label.clientWidth && getComputedStyle(label).textOverflow === 'ellipsis',
          'Long titles truncate without hiding the chevron');
        check(chevron.getBoundingClientRect().width > 0, 'Chevron remains visible');
        check(document.getElementById('btnAddApplication').getBoundingClientRect().right <= innerWidth
          && document.documentElement.scrollWidth <= innerWidth, 'Long titles never push actions off-screen');
        label.textContent = 'Internship Search';
        const controls = [selector, ...document.querySelectorAll('[data-board-view-button]'),
          document.getElementById('btnCustomFields'),
          document.getElementById('btnAddApplication')];
        if (innerWidth < 1024) {
          controls.splice(1, 0, document.getElementById('btnOpenSearch'));
        }
        const rects = controls.map(control => control.getBoundingClientRect());
        check(rects.every((rect, index) => rect.width >= 40 && rect.height >= 40
          && rect.left >= 0 && rect.right <= innerWidth
          && (index === 0 || rect.left >= rects[index - 1].right - 1)), 'Controls remain reachable without overlap');
        check(Math.max(...rects.map(rect => rect.top)) - Math.min(...rects.map(rect => rect.top)) <= 4,
          'Controls stay centered on one row');
        check(document.documentElement.scrollWidth <= innerWidth, 'No horizontal page overflow');
        for (const id of ['btnDashboard', 'btnCustomFields']) {
          const button = document.getElementById(id);
          check(Boolean(button.getAttribute('aria-label') && button.title), 'Compact controls retain accessible names');
          if (id === 'btnDashboard') {
            check(button.querySelector('span').textContent === 'Dashboard'
              && button.getAttribute('aria-label') === 'Dashboard' && button.title === 'Dashboard',
            'First nav Dashboard opens the summary modal');
          }
          const showLabel = id === 'btnDashboard'
            ? innerWidth >= 768
            : innerWidth >= 1280;
          check((getComputedStyle(button.querySelector('span')).display !== 'none') === showLabel,
            'Dashboard text stays visible on tablet and desktop without squeezing Search');
        }
        if (innerWidth >= 1024) {
          const searchBounds = search.getBoundingClientRect();
          const inputBounds = input.getBoundingClientRect();
          check(searchBounds.width >= 260 && searchBounds.width <= 350, 'Search stays compact but usable');
          check(inputBounds.width >= 140, 'Search input retains useful typing space');
          check(Math.abs(inputBounds.top - selector.getBoundingClientRect().top) <= 4, 'Inline search stays aligned');
          const actions = document.querySelector('.board-toolbar-actions').getBoundingClientRect();
          const gap = parseFloat(getComputedStyle(document.getElementById('appNavbar')).columnGap);
          check(Math.abs(actions.left - searchBounds.right - gap) < 1,
            'Search stays adjacent to the right-hand action group');
        } else {
          document.getElementById('btnOpenSearch').click();
          await toolbarFrame();
          check(input.getBoundingClientRect().width >= 100 && document.activeElement === input,
            'Temporary search remains usable and focused');
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          check(document.getElementById('btnOpenSearch').getAttribute('aria-expanded') === 'false',
            'Escape closes temporary search');
        }
        toolbarApp.openMobileSearch();
        for (const value of ['date-desc', 'date-asc', '', 'select-text']) {
          sort.value = value;
          toolbarApp.syncSortSelectWidth(sort);
          check(sort.getBoundingClientRect().width >= 100 && sort.getBoundingClientRect().width <= 110,
            'Sort remains compact for every option');
        }
        sort.value = 'date-desc';
        toolbarApp.syncSortSelectWidth(sort);
        toolbarApp.closeMobileSearch();
        selector.click();
        const menu = document.getElementById('jobSearchDropdown');
        for (let attempt = 0; attempt < 30; attempt += 1) {
          if (selector.getAttribute('aria-expanded') === 'true'
            && Math.abs(menu.getBoundingClientRect().top - selector.getBoundingClientRect().bottom - 6) < 1) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        await toolbarFrame();
        const menuBounds = menu.getBoundingClientRect();
        check(menuBounds.left >= 0 && menuBounds.right <= innerWidth
          && Math.abs(menuBounds.top - selector.getBoundingClientRect().bottom - 6) < 1,
          'Job Search dropdown stays anchored and fits viewport');
        menu.hidePopover();
        check(localStorage.getItem('flextracker_data') === toolbarStoredState, 'Layout interactions never change workspace data');
        return { failures, selectorWidth: selector.getBoundingClientRect().width,
          searchWidth: search.getBoundingClientRect().width };
      `);
      assert.deepEqual(result.failures, [], theme + ' ' + width + ': ' + JSON.stringify(result));
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-toolbar-priority.png`), Buffer.from(shot.data, 'base64'));
    }
  }
}
