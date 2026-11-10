// Invoked through JUBRO_NEXT_ACTION_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyNextAction({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const tracker = createDefaultTracker('next-action', 'My Job Search');
    tracker.rows = [['Google', 'Frontend Intern', 'LinkedIn', 'Applied', '2026-11-10', '',
      'Remote', 'Internship', 'fafa', '2026-11-12']];
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: tracker.id, ownerType: 'guest', ownerId: null, revision: 1,
      data: { [tracker.id]: tracker },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    window.nextActionStoredState = localStorage.getItem('flextracker_data');
  `);
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      const result = await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const section = document.querySelector('.kanban-card .kanban-card-next-action');
        const label = section.querySelector('.kanban-next-action-label');
        const action = section.querySelector('.kanban-next-action-text');
        const date = section.querySelector('.kanban-next-action-date');
        const icon = section.querySelector('.kanban-next-action-icon');
        const bounds = section.getBoundingClientRect();
        const style = getComputedStyle(section);
        const dateBounds = date.getBoundingClientRect();
        const actionBounds = action.getBoundingClientRect();
        const dateStyle = getComputedStyle(date);
        const card = section.closest('.kanban-card');
        return {
          text: label.textContent === 'Next Action' && action.textContent === 'fafa' && date.textContent === 'Nov 12',
          passive: !section.querySelector('button, input, select, a') && section.querySelectorAll('i').length === 2,
          icons: Boolean(icon && date.querySelector('i')),
          rightAligned: Math.abs(dateBounds.right - (bounds.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth))) < 1,
          balanced: Boolean(icon && icon.getBoundingClientRect().right <= actionBounds.left
            && actionBounds.right <= dateBounds.left && Math.abs(actionBounds.top - dateBounds.top) < 5),
          pill: dateStyle.backgroundColor === 'rgb(17, 24, 39)' && parseFloat(dateStyle.borderRadius) >= 6,
          labelBlue: getComputedStyle(label).color === (${theme === 'dark'} ? 'rgb(147, 197, 253)' : 'rgb(37, 99, 235)'),
          compact: bounds.height <= 75 && section.scrollWidth <= section.clientWidth,
          outside: card.querySelector('.kanban-card-company-name').textContent === 'Google'
            && card.querySelector('.kanban-card-position').textContent === 'Frontend Intern'
            && card.querySelector('select').value === 'Applied',
          readOnly: localStorage.getItem('flextracker_data') === nextActionStoredState,
        };
      `);
      assert.equal(Object.values(result).every(Boolean), true, theme + ' ' + width + ': ' + JSON.stringify(result));
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-next-action.png`), Buffer.from(shot.data, 'base64'));
    }
  }
}
