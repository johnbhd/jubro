import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyInsights({ command, evaluate, context, origin, artifacts }) {
  async function waitForApp(pathname) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        const ready = await evaluate(`
          return location.pathname === ${JSON.stringify(pathname)} && Boolean(window.overviewApp)
            && !document.body.hasAttribute('data-workspace-loading');
        `);
        if (ready) {
          return;
        }
      } catch {
        // Real navigation briefly destroys the previous script context.
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail(`Workspace did not open at ${pathname}`);
  }
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const a = createDefaultTracker('insights-a', 'Internship Search');
    const b = createDefaultTracker('insights-b', 'Freelance Search');
    const now = new Date();
    const key = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const old = new Date(now.getFullYear(), now.getMonth() - 5, now.getDate());
    a.columns[3].options = ['Applied', { label: 'Assessment', color: '#D946EF' }, 'Interview', 'Offer', 'Rejected'];
    a.rows = [
      ['Google', 'Developer', 'LinkedIn', 'Interview', key(now), '', 'Remote', 'Full-time', 'Follow up', key(now)],
      ['Canva', 'Designer', 'Indeed', 'Offer', key(now), '', 'Hybrid', 'Contract', '', ''],
      ['Older Company', 'Engineer', 'LinkedIn', 'Assessment', key(old), '', 'Remote', 'Full-time', 'Prepare', key(now)],
    ];
    localStorage.setItem('jubro_board_view', 'list');
    localStorage.setItem('flextracker_data', JSON.stringify({ active: a.id, ownerType: 'guest', ownerId: null, revision: 1, data: { [a.id]: a, [b.id]: b } }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  assert.equal(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    window.beforeInsights = localStorage.getItem('flextracker_data');
    sessionStorage.setItem('insightsExpectedState', window.beforeInsights);
    document.getElementById('btnDashboard').click();
    return document.getElementById('overviewInsightsLink').href.endsWith('/dashboard/?tracker=insights-a')
      && !document.getElementById('dashboardModal').classList.contains('hidden')
      && location.pathname === '/board/';
  `), true);
  await evaluate(`document.getElementById('overviewInsightsLink').click();`);
  await waitForApp('/dashboard/');
  assert.deepEqual(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    if (localStorage.getItem('flextracker_data') !== sessionStorage.getItem('insightsExpectedState')) {
      throw new Error('Opening Insights changed workspace data.');
    }
    const { Storage } = await import('/js/storage/storage.js');
    window.insightsBefore = localStorage.getItem('flextracker_data');
    window.insightsSaveCount = 0;
    const save = Storage.save.bind(Storage);
    Storage.save = (...args) => { window.insightsSaveCount += 1; return save(...args); };
    return {
      title: document.querySelector('#insightsView h1').textContent,
      key: overviewApp.getActiveTrackerKey(),
      counts: [...document.querySelectorAll('#insightsView .overview-metric-value')].map(node => Number(node.textContent)),
      hiddenBoard: document.getElementById('kanbanView').classList.contains('hidden'),
      hiddenList: document.getElementById('listView').classList.contains('hidden'),
      back: document.querySelector('.insights-back').getAttribute('href'),
    };
  `), {
    title: 'Job Search Insights', key: 'insights-a', counts: [2, 1, 1, 2],
    hiddenBoard: true, hiddenList: true, back: '/board/?tracker=insights-a&view=kanban',
  });

  for (const theme of ['dark', 'light']) {
    await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'});`);
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 1000 } });
      const state = await evaluate(`
        const root = document.getElementById('insightsView');
        const grid = root.querySelector('.overview-metrics');
        const topNav = document.getElementById('boardTopNavbar');
        const appNav = document.getElementById('appNavbar');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          cardColor: getComputedStyle(root.querySelector('.overview-metric')).backgroundColor,
          text: root.textContent.includes('Assessment'),
          accent: [...root.querySelectorAll('.insights-bar-track span')].some(node => node.style.backgroundColor === 'rgb(217, 70, 239)'),
          firstNavHidden: getComputedStyle(topNav).display === 'none',
          secondNavHidden: getComputedStyle(appNav).display === 'none',
        };
      `);
      assert.equal(state.overflow, false, `${theme} ${width}: page overflow`);
      assert.equal(state.columns, width < 640 ? 2 : 4);
      assert.equal(state.text, true);
      assert.equal(state.accent, true);
      assert.equal(state.firstNavHidden, true, `${theme} ${width}: 1st navbar must be erased on dashboard page`);
      assert.equal(state.secondNavHidden, true, `${theme} ${width}: 2nd navbar must be erased on dashboard page`);
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `insights-${theme}-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  assert.equal(await evaluate(`
    const select = document.querySelector('.insights-period');
    for (const period of ['7-days', '30-days', '3-months', 'all-time']) {
      overviewApp.insightsPeriod = period;
      overviewApp.renderInsights();
    }
    overviewApp.searchInput.value = 'not matching';
    overviewApp.renderInsights();
    if (document.querySelector('#insightsView .overview-metric-value').textContent !== '3') return false;
    document.querySelector('.insights-upcoming-toggle')?.click();
    overviewApp.openDashboard();
    const attention = document.querySelector('#dashboardCards [data-metric="needAttention"] .overview-metric-value').textContent;
    overviewApp.closeDashboard();
    return attention === '2' && insightsSaveCount === 0 && localStorage.getItem('flextracker_data') === insightsBefore;
  `), true, 'analytics must stay read-only and attention must agree');

  assert.equal(await evaluate(`
    document.querySelector('.insights-attention-row').click();
    const open = !document.getElementById('listEditModal').classList.contains('hidden');
    overviewApp.closeListEditModal();
    return open && insightsSaveCount === 0;
  `), true, 'attention opens the existing editor without saving');

  assert.equal(await evaluate(`
    overviewApp.switchJobSearch('insights-b');
    window.emptyBefore = localStorage.getItem('flextracker_data');
    return location.search.includes('tracker=insights-b') && document.querySelector('#insightsView h2').textContent === 'No insights yet';
  `), true);
  assert.equal(await evaluate(`
    const button = document.querySelector('.insights-empty button');
    return button.getBoundingClientRect().height >= 44
      && parseFloat(getComputedStyle(button).paddingLeft) >= 16;
  `), true, 'Empty Insights Add action has a full-size primary touch target');
  for (const theme of ['dark', 'light']) {
    await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'});`);
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 1000 } });
      assert.equal(await evaluate('return document.documentElement.scrollWidth <= innerWidth;'), true);
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `insights-empty-${theme}-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  assert.equal(await evaluate(`
    document.querySelector('.insights-empty button').click();
    const modal = document.querySelector('[data-add-application][open]');
    const open = Boolean(modal);
    modal?.close();
    return open && localStorage.getItem('flextracker_data') === emptyBefore && overviewApp.getTracker().rows.length === 0;
  `), true);
  assert.equal(await evaluate(`
    const before = overviewApp.state.revision;
    document.querySelector('.insights-empty button').click();
    const form = document.querySelector('[data-add-application][open] form');
    form.querySelector('[data-field-key="0"]').value = 'First Insights Application';
    form.requestSubmit();
    return overviewApp.getTracker().rows.length === 1
      && overviewApp.state.revision === before + 1
      && !document.querySelector('.insights-empty')
      && document.querySelector('#insightsView .overview-metric-value').textContent === '1';
  `), true, 'Existing Add saves one canonical application and immediately refreshes Insights');
  await evaluate(`document.querySelector('.insights-back').click();`);
  await waitForApp('/board/');
  assert.deepEqual(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const topNav = document.getElementById('boardTopNavbar');
    const appNav = document.getElementById('appNavbar');
    return [
      overviewApp.getActiveTrackerKey(),
      overviewApp.viewSelect.value,
      localStorage.getItem('jubro_board_view'),
      getComputedStyle(topNav).display !== 'none',
      getComputedStyle(appNav).display !== 'none',
    ];
  `), ['insights-b', 'kanban', 'list', true, true]);
  assert.equal(await evaluate(`
    document.getElementById('btnDashboard').click();
    return location.pathname === '/board/'
      && !document.getElementById('dashboardModal').classList.contains('hidden');
  `), true, 'Dashboard opens Quick Overview without navigating');
  await evaluate(`document.getElementById('overviewInsightsLink').click();`);
  await waitForApp('/dashboard/');
  assert.equal(await evaluate(`
    const topNav = document.getElementById('boardTopNavbar');
    const appNav = document.getElementById('appNavbar');
    return overviewApp.getActiveTrackerKey() === 'insights-b'
      && getComputedStyle(topNav).display === 'none'
      && getComputedStyle(appNav).display === 'none'
      && document.querySelector('#insightsView .overview-metric-value').textContent === '1';
  `), true, 'Dashboard summary links to Insights for the same active Job Search and navbars are erased');
  console.log('Dashboard modal, View Insights, and Back to Board verified.');
}
