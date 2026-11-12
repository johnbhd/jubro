// Invoked through JUBRO_LIST_GUIDE_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyListGuide({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const tracker = createDefaultTracker('list-guide', 'My Job Search');
    tracker.columns[3].options = [{ label: 'Wishlist', color: 'purple' }];
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: tracker.id, ownerType: 'guest', ownerId: null, revision: 1,
      data: { [tracker.id]: tracker },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const { TrackerApp } = await import('/js/main/main.js');
    window.listGuideApp = new TrackerApp();
    listGuideApp.setBoardView('list');
    window.listGuideStoredState = localStorage.getItem('flextracker_data');
  `);
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      const result = await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const guide = document.querySelector('.list-guide-card');
        const bounds = guide.getBoundingClientRect();
        const add = document.querySelector('.list-guide-add');
        const before = localStorage.getItem('flextracker_data');
        add.click();
        const form = document.querySelector('[data-add-application][open] form');
        const blankForm = form && form.querySelector('[data-field-key="0"]').value === ''
          && form.querySelector('[data-field-key="1"]').value === '';
        form.querySelector('button[type="button"]').click();
        return {
          visible: bounds.width > 0 && bounds.height > 0,
          fits: bounds.left >= 0 && bounds.right <= innerWidth
            && guide.scrollWidth <= guide.clientWidth && document.documentElement.scrollWidth <= innerWidth,
          instructional: guide.textContent.includes('EXAMPLE')
            && guide.querySelector('.list-card-title').textContent === 'Position Role'
            && guide.querySelector('.list-card-company').textContent === 'Company Name',
          passive: !guide.draggable && !guide.querySelector('button, select, a, [data-row-index]')
            && !document.querySelector('#listCards [data-row-index]') && listGuideApp.listDrag === null,
          status: guide.querySelector('.list-status-badge').textContent === 'Wishlist',
          text: getComputedStyle(guide.querySelector('.list-card-title')).color
            === (${theme === 'dark'} ? 'rgb(249, 250, 251)' : 'rgb(23, 32, 51)'),
          addCancel: blankForm && !document.querySelector('[data-add-application][open]')
            && localStorage.getItem('flextracker_data') === before,
          readOnly: localStorage.getItem('flextracker_data') === listGuideStoredState
            && listGuideApp.getTracker().rows.length === 0
            && !JSON.stringify(listGuideApp.getTracker()).includes('Company Name')
            && document.getElementById('listTotalCount').textContent === '0',
        };
      `);
      assert.equal(Object.values(result).every(Boolean), true, theme + ' ' + width + ': ' + JSON.stringify(result));
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-list-guide.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  assert.equal(await evaluate(`
    const { Storage } = await import('/js/storage/storage.js');
    const before = Storage.load().revision;
    document.querySelector('.list-guide-add').click();
    const form = document.querySelector('[data-add-application][open] form');
    form.querySelector('[data-field-key="0"]').value = 'Real Company';
    form.querySelector('[data-field-key="1"]').value = 'Actual Role';
    form.requestSubmit();
    if (Storage.load().revision !== before + 1 || listGuideApp.getTracker().rows.length !== 1
      || document.querySelector('.list-guide-card, .kanban-guide-card')
      || document.querySelector('.list-view-row .list-card-title').textContent !== 'Actual Role') return false;
    listGuideApp.searchInput.value = 'No matching application';
    listGuideApp.applySearchFilter();
    if (document.querySelector('.list-guide-card')
      || !document.querySelector('.list-view-row').classList.contains('hidden')) return false;
    listGuideApp.searchInput.value = '';
    listGuideApp.deleteRowAt(0);
    return Boolean(document.querySelector('.list-guide-card')) && listGuideApp.getTracker().rows.length === 0;
  `), true, 'List guide Add saves one real row; filtering never fabricates examples; deleting the last row restores the guide.');
}
