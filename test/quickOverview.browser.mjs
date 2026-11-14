// Invoked through JUBRO_OVERVIEW_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyQuickOverview({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const tracker = createDefaultTracker('overview', 'Internship Search');
    tracker.columns[3].options = ['Applied', 'Interview', 'Offer', 'Rejected', 'Assessment'];
    const today = new Date();
    const key = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')].join('-');
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const statuses = ['Applied', 'Applied', 'Applied', 'Applied', 'Applied',
      'Interview', 'Interview', 'Interview', 'Offer', 'Rejected', 'Rejected', 'Assessment'];
    tracker.rows = statuses.map((status, index) => [
      index === 0 ? 'Google' : 'Company ' + index, 'Developer', 'LinkedIn', status,
      key(today), '', 'Remote', 'Full-time',
      [0, 5, 8, 9].includes(index) ? 'Follow up' : '',
      index === 8 ? key(tomorrow) : key(today),
    ]);
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: tracker.id, ownerType: 'guest', ownerId: null, revision: 1,
      data: { [tracker.id]: tracker },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    if (!window.overviewApp) throw new Error('Board startup did not initialize the app.');
    window.overviewRows = structuredClone(overviewApp.getTracker().rows);
    window.overviewState = localStorage.getItem('flextracker_data');
    window.overviewCounts = () => [...document.querySelectorAll('.overview-metric-value')].map(node => Number(node.textContent));
    window.overviewFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  `);

  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      for (const empty of [false, true]) {
        const result = await evaluate(`
          document.documentElement.classList.toggle('dark', ${theme === 'dark'});
          overviewApp.getTracker().rows = ${empty} ? [] : structuredClone(overviewRows);
          document.getElementById('btnDashboard').focus();
          overviewApp.openDashboard();
          await overviewFrame();
          const panel = document.querySelector('.quick-overview-dialog');
          const bounds = panel.getBoundingClientRect();
          const cards = [...document.querySelectorAll('.overview-metric')];
          const first = cards[0].getBoundingClientRect();
          const second = cards[1].getBoundingClientRect();
          const third = cards[2].getBoundingClientRect();
          const grid = innerWidth < 640
            ? first.top === second.top && third.top > first.top
            : cards.every(card => card.getBoundingClientRect().top === first.top);
          const emptyState = document.getElementById('dashboardEmptyState');
          const summary = document.getElementById('dashboardSummary');
          const insights = document.getElementById('dashboardInsights');
          const insightsLink = document.getElementById('overviewInsightsLink');
          const insightsStyle = getComputedStyle(insightsLink);
          const illustration = emptyState.querySelector('.overview-empty-icon');
          const addButton = document.getElementById('btnOverviewAddApplication');
          const closeButton = document.getElementById('btnCloseDashboard');
          const closeBounds = closeButton.getBoundingClientRect();
          let addReachable = true;
          if (${empty}) {
            panel.scrollTop = panel.scrollHeight;
            const addBounds = addButton.getBoundingClientRect();
            addReachable = addBounds.top >= bounds.top && addBounds.bottom <= bounds.bottom
              && addBounds.height >= 44;
            panel.scrollTop = 0;
          }
          return {
            counts: overviewCounts(), grid, addReachable,
            closeSize: closeBounds.width >= 44 && closeBounds.height >= 44
              && parseFloat(getComputedStyle(closeButton).fontSize) >= 30,
            emptyPolish: ${empty}
              ? illustration.getBoundingClientRect().width >= (innerWidth < 640 ? 120 : 140)
                && parseFloat(getComputedStyle(document.getElementById('dashboardEmptyTitle')).fontSize) >= 28
                && cards.every(card => card.getBoundingClientRect().height >= 140)
                && getComputedStyle(addButton).backgroundColor === 'rgb(37, 99, 235)'
                && (innerWidth < 1024 || bounds.width >= 900)
              : bounds.width <= 760,
            naming: document.getElementById('dashboardTitle').textContent === 'Quick Overview'
              && document.getElementById('btnDashboard').getAttribute('aria-label') === 'Dashboard'
              && document.getElementById('dashboardSubtitle').textContent === 'A quick look at your job search this month.',
            simple: !document.getElementById('dashboardSelectColumn') && !panel.querySelector('svg, canvas')
              && document.getElementById('dashboardRangeSelect').getAttribute('aria-label') === 'Time period',
            fits: bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight
              && panel.scrollWidth <= panel.clientWidth && document.documentElement.scrollWidth <= innerWidth,
            empty: ${empty}
              ? !emptyState.hidden && summary.hidden && insights.hidden
                && !document.getElementById('btnOverviewAddApplication').hidden
                && cards.every(card => card.classList.contains('is-muted'))
                && overviewApp.getTracker().rows.length === 0
              : emptyState.hidden && !summary.hidden && !insights.hidden
                && insightsLink.href.includes('/dashboard/?tracker=')
                && insightsStyle.cursor === 'pointer'
                && insightsStyle.pointerEvents !== 'none',
            legend: ${empty} || [...document.querySelectorAll('.overview-status-legend li')]
              .map(item => item.textContent).join('|') === 'Applied 5|Interview 3|Offer 1|Rejected 2|Other 1',
            segments: ${empty} || [...document.querySelectorAll('.overview-status-bar > span')]
              .every((segment, index) => Math.abs(parseFloat(segment.style.flexBasis)
                - [5, 3, 1, 2, 1][index] / 12 * 100) < 0.001),
            readOnly: localStorage.getItem('flextracker_data') === overviewState,
          };
        `);
        assert.deepEqual(result.counts, empty ? [0, 0, 0, 0] : [12, 3, 1, 3]);
        delete result.counts;
        assert.equal(Object.values(result).every(Boolean), true,
          theme + ' ' + width + ' empty=' + empty + ': ' + JSON.stringify(result));
        const shot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, `${theme}-${width}-overview-${empty ? 'empty' : 'populated'}.png`), Buffer.from(shot.data, 'base64'));
        await evaluate('overviewApp.closeDashboard();');
      }
    }
  }

  assert.equal(await evaluate(`
    overviewApp.getTracker().rows = structuredClone(overviewRows);
    overviewApp.searchInput.value = 'No matching application';
    for (const view of ['kanban', 'list']) {
      overviewApp.setBoardView(view);
      overviewApp.openDashboard();
      if (JSON.stringify(overviewCounts()) !== '[12,3,1,3]') return false;
      overviewApp.closeDashboard();
    }
    overviewApp.searchInput.value = '';
    overviewApp.openDashboard();
    overviewApp.getTracker().rows[0][3] = 'Interview';
    overviewApp.refresh({ persist: false });
    if (JSON.stringify(overviewCounts()) !== '[12,4,1,3]') return false;
    overviewApp.getTracker().rows[0][8] = '';
    overviewApp.refresh({ persist: false });
    if (overviewCounts()[3] !== 2) return false;
    overviewApp.getTracker().columns[3].options[1] = { label: 'Interview', color: '#D946EF' };
    overviewApp.renderDashboard();
    const interview = [...document.querySelectorAll('.overview-status-bar > span')]
      .find(node => node.getAttribute('aria-label') === 'Interview: 4');
    const color = interview.style.backgroundColor === 'rgb(217, 70, 239)';
    overviewApp.getTracker().columns[3].options[1] = 'Interview';
    overviewApp.getTracker().rows = structuredClone(overviewRows);
    overviewApp.dashboardRangeSelect.value = 'custom';
    overviewApp.dashboardDateFrom.value = '2000-01-01';
    overviewApp.dashboardDateTo.value = '2000-01-31';
    overviewApp.renderDashboard();
    const periodEmpty = document.getElementById('dashboardEmptyTitle').textContent === 'No applications in this period'
      && document.getElementById('btnOverviewAddApplication').hidden;
    overviewApp.dashboardRangeSelect.value = 'all-time';
    overviewApp.dashboardRangeSelect.dispatchEvent(new Event('change'));
    const restored = overviewCounts()[0] === 12;
    overviewApp.closeDashboard();
    const focus = document.activeElement.id === 'btnDashboard';
    overviewApp.getTracker().rows = [];
    overviewApp.openDashboard();
    document.getElementById('btnOverviewAddApplication').click();
    const form = document.querySelector('[data-add-application][open] form');
    const blank = form && form.querySelector('[data-field-key="0"]').value === ''
      && document.getElementById('dashboardModal').classList.contains('hidden');
    form.querySelector('button[type="button"]').click();
    return color && periodEmpty && restored && focus && blank
      && overviewApp.getTracker().rows.length === 0
      && localStorage.getItem('flextracker_data') === overviewState;
  `), true, 'Overview stays canonical across views/search/refresh; custom colors, period empty, focus, and Add Cancel work without saves.');

  assert.deepEqual(await evaluate(`
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const { Storage } = await import('/js/storage/storage.js');
    overviewApp.getTracker().rows = structuredClone(overviewRows);
    overviewApp.state.data.other = createDefaultTracker('other', 'Other Search');
    overviewApp.save();
    overviewApp.switchJobSearch('other');
    overviewApp.openDashboard();
    if (overviewCounts()[0] !== 0) return { switched: false };
    document.getElementById('btnOverviewAddApplication').click();
    const before = Storage.load().revision;
    const form = document.querySelector('[data-add-application][open] form');
    form.querySelector('[data-field-key="0"]').value = 'First Real Company';
    form.requestSubmit();
    overviewApp.openDashboard();
    return {
      total: overviewCounts()[0],
      revisionDelta: Storage.load().revision - before,
      rows: overviewApp.getTracker().rows.length,
      populated: document.getElementById('dashboardEmptyState').hidden,
      active: overviewApp.state.active,
      error: document.querySelector('[data-add-application] [role="alert"]')?.textContent || '',
    };
  `), { total: 1, revisionDelta: 1, rows: 1, populated: true, active: 'other', error: '' },
  'Switching uses the active Job Search; Overview Add saves one real row and one revision.');

  await command('input.performActions', { context, actions: [{ type: 'key', id: 'keyboard', actions: [
    { type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' },
  ] }] });
  assert.equal(await evaluate(`
    return document.getElementById('dashboardModal').classList.contains('hidden')
      && document.activeElement.id === 'btnDashboard';
  `), true, 'Escape closes Quick Overview and restores trigger focus.');
}
