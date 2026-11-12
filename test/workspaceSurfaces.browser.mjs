// Invoked through JUBRO_SURFACES_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyWorkspaceSurfaces({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: 'surfaces', ownerType: 'guest', ownerId: null, revision: 1,
      data: { surfaces: {
        id: 'surfaces', title: 'Surface hierarchy',
        columns: [
          { name: 'Company', type: 'text' },
          { name: 'Position', type: 'text' },
          { name: 'Status', type: 'select', options: ['Applied', 'Interview', 'Offer', 'Rejected'] },
          { name: 'Platform', type: 'select', options: ['LinkedIn'] },
          { name: 'Date', type: 'date' },
        ],
        rows: [['Example Company', 'Developer', 'Applied', 'LinkedIn', '2026-11-09']],
      } },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/?tracker=surfaces', wait: 'complete' });
  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const { TrackerApp } = await import('/js/main/main.js');
    window.surfaceApp = new TrackerApp();
    window.surfaceState = localStorage.getItem('flextracker_data');
    window.surfaceContrast = (foreground, background) => {
      const canvas = document.createElement('canvas');
      const drawing = canvas.getContext('2d');
      const luminance = color => {
        drawing.fillStyle = color;
        drawing.fillRect(0, 0, 1, 1);
        const channels = [...drawing.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    window.surfaceFingerprint = selectors => selectors.map(selector => {
      const element = document.querySelector(selector);
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return { selector, background: style.backgroundColor, color: style.color,
        border: style.borderColor, shadow: style.boxShadow,
        width: bounds.width, height: bounds.height };
    });
  `);
  const darkSnapshots = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        surfaceApp.setBoardView('kanban');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity)
          .map(animation => animation.finished));
      `);
      const board = await evaluate(`
        return surfaceFingerprint(['body', '#boardTopNavbar', '#appNavbar', '.search-discovery-group',
          '.kanban-column', '.kanban-column-header', '.kanban-card', '.kanban-column-empty']);
      `);
      if (theme === 'light') {
        assert.equal(board[0].background, 'rgb(238, 241, 245)', 'Workspace uses soft gray, not a white canvas.');
        assert.equal(board[1].background, 'rgb(248, 249, 251)');
        assert.equal(board[2].background, 'rgb(248, 249, 251)');
        assert.equal(board[6].background, 'rgb(255, 255, 255)');
        assert.notEqual(board[4].background, board[0].background);
        assert.notEqual(board[4].background, board[6].background);
        assert.equal(await evaluate(`
          const heading = getComputedStyle(document.querySelector('.kanban-column-title'));
          const header = getComputedStyle(document.querySelector('.kanban-column-header'));
          const meta = getComputedStyle(document.querySelector('.kanban-card-meta'));
          return surfaceContrast(heading.color, header.backgroundColor) >= 4.5
            && surfaceContrast(meta.color, '#ffffff') >= 4.5;
        `), true, 'Board heading and secondary card text meet 4.5:1.');
      }
      assert.equal(await evaluate(`
        return document.documentElement.scrollWidth <= innerWidth
          && document.querySelector('.kanban-card').style.getPropertyValue('--card-status-accent') !== '';
      `), true, 'Board geometry and card accent preserved ' + theme + ' ' + width);
      const boardShot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, theme + '-' + width + '-surface-board.png'), Buffer.from(boardShot.data, 'base64'));
      await evaluate('surfaceApp.setBoardView("list");');
      const list = await evaluate(`
        return surfaceFingerprint(['#listView aside', '.list-view-row', '#listSearchInput', '.list-filter-chip']);
      `);
      if (theme === 'light') {
        assert.equal(list[0].background, 'rgb(248, 249, 251)');
        assert.equal(list[1].background, 'rgb(255, 255, 255)');
        assert.equal(await evaluate(`
          const chip = document.querySelector('.list-filter-chip');
          const wasActive = chip.classList.contains('is-active');
          chip.classList.add('is-active');
          const selected = getComputedStyle(chip);
          const activeReadable = surfaceContrast(selected.color, selected.backgroundColor) >= 4.5;
          chip.classList.toggle('is-active', wasActive);
          const badge = getComputedStyle(document.querySelector('.list-status-badge'));
          const input = document.getElementById('listSearchInput');
          const placeholder = getComputedStyle(input, '::placeholder');
          return activeReadable && surfaceContrast(badge.color, badge.backgroundColor) >= 4.5
            && surfaceContrast(placeholder.color, getComputedStyle(input).backgroundColor) >= 4.5
            && document.documentElement.scrollWidth <= innerWidth;
        `), true, 'Selected filters, status badges, and placeholders stay readable without List overflow.');
      }
      const listShot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, theme + '-' + width + '-surface-list.png'), Buffer.from(listShot.data, 'base64'));
      const modalSnapshots = [];
      for (const modal of ['dashboard', 'fields', 'add', 'edit']) {
        const result = await evaluate(`
          const modal = ${JSON.stringify(modal)};
          let panel;
          if (modal === 'dashboard') {
            surfaceApp.openDashboard();
            panel = document.querySelector('#dashboardModal > div');
          } else if (modal === 'fields') {
            surfaceApp.openCustomizeFields();
            panel = document.querySelector('.list-settings-dialog');
          } else if (modal === 'add') {
            surfaceApp.openAddApplication();
            panel = document.querySelector('[data-add-application][open]');
          } else {
            surfaceApp.openListEditModal(0);
            panel = document.querySelector('.list-edit-dialog');
          }
          window.surfacePanel = panel;
          const bounds = panel.getBoundingClientRect();
          return { visible: bounds.width > 0 && bounds.height > 0,
            fits: bounds.left >= 0 && bounds.right <= innerWidth,
            background: getComputedStyle(panel).backgroundColor,
            innerBackground: getComputedStyle(panel.querySelector('.list-settings-field-row, .list-edit-control, #dashboardCards > div') || panel).backgroundColor,
            border: getComputedStyle(panel).borderColor };
        `);
        assert.equal(result.visible && result.fits, true, modal + ' fits ' + theme + ' ' + width);
        if (theme === 'light' && modal !== 'dashboard') {
          assert.equal(result.background, 'rgb(255, 255, 255)', modal + ' remains elevated white');
          assert.notEqual(result.innerBackground, result.background, modal + ' controls/rows are off-white');
        }
        const { innerBackground, ...modalSurface } = result;
        modalSnapshots.push({ modal, ...modalSurface });
        const shot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, theme + '-' + width + '-surface-' + modal + '.png'), Buffer.from(shot.data, 'base64'));
        if (modal === 'dashboard') {
          assert.equal(await evaluate(`
            const tracker = surfaceApp.getTracker();
            const rows = tracker.rows;
            try {
              tracker.rows = [];
              surfaceApp.renderDashboard();
              const message = document.querySelector('#dashboardCards [role="status"]');
              const bounds = message.getBoundingClientRect();
              return message.textContent.includes("You don't have any application data yet.")
                && document.getElementById('dashboardCards').children.length === 1
                && document.getElementById('dashboardCharts').children.length === 0
                && bounds.width > 0 && bounds.height > 0
                && bounds.left >= 0 && bounds.right <= innerWidth
                && message.scrollWidth <= message.clientWidth;
            } finally {
              tracker.rows = rows;
              surfaceApp.renderDashboard();
            }
          `), true, 'Dashboard explains empty data without blank charts: ' + theme + ' ' + width);
        }
        await evaluate(`
          if (surfacePanel.tagName === 'DIALOG') surfacePanel.close();
          surfaceApp.closeDashboard();
          surfaceApp.closeCustomizeFields();
          surfaceApp.closeListEditModal();
        `);
      }
      if (theme === 'dark') {
        darkSnapshots.push({ width, board, list, modals: modalSnapshots });
        await writeFile(resolve(artifacts, 'dark-surfaces.json'), JSON.stringify(darkSnapshots, null, 2));
      }
      assert.equal(await evaluate('return localStorage.getItem("flextracker_data") === surfaceState;'), true,
        'Theme and modal checks never mutate canonical data.');
    }
  }
  await writeFile(resolve(artifacts, 'dark-surfaces.json'), JSON.stringify(darkSnapshots, null, 2));
  if (process.env.JUBRO_DARK_BASELINE) {
    assert.deepEqual(darkSnapshots, JSON.parse(await readFile(process.env.JUBRO_DARK_BASELINE, 'utf8')),
      'Dark computed surfaces and geometry remain unchanged.');
  }
}
