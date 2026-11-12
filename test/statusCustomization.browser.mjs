// Run with `node test/statusCustomization.browser.mjs`; requires local Firefox.
// Use JUBRO_LANDING_ONLY=1 to verify marketing independently of Board workflows.
// Use JUBRO_SURFACES_ONLY=1 for workspace theme surfaces plus landing regressions.
// Use JUBRO_TRANSFER_ONLY=1 for transfer policy and shared-modal checks plus landing regressions.
// Use JUBRO_AUTH_ONLY=1 for auth navigation, flash toasts, and navbar spacing checks.
// Use JUBRO_TOOLBAR_ONLY=1 for protected Job Search widths and responsive toolbar checks.
// Use JUBRO_NEXT_ACTION_ONLY=1 for compact Board-card action/date presentation checks.
// Use JUBRO_COLOR_ONLY=1 for centered palettes and native custom-color Save/Cancel checks.
// Use JUBRO_LIST_GUIDE_ONLY=1 for the UI-only empty List example and Add lifecycle.
// Firebase imports use the repository fixture. No live account or service is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = await mkdtemp(resolve(tmpdir(), 'jubro-status-browser-'));
const profile = await mkdtemp(resolve(tmpdir(), 'jubro-status-profile-'));
const browser = spawn('firefox', [
  '--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', '9238',
]);
let socket;
let server;

try {
  await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error('Firefox startup timed out.')), 15000);
    browser.on('error', reject);
    browser.on('exit', (code) => reject(new Error(`Firefox exited: ${code}`)));
    browser.stderr.on('data', (data) => {
      if (String(data).includes('WebDriver BiDi listening')) {
        clearTimeout(timer);
        accept();
      }
    });
  });

  socket = new WebSocket('ws://127.0.0.1:9238/session');
  await new Promise((accept, reject) => {
    socket.onopen = accept;
    socket.onerror = reject;
  });
  const pending = new Map();
  let nextId = 0;
  const errors = [];

  function command(method, params = {}) {
    const id = ++nextId;
    return new Promise((accept, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 15000);
      pending.set(id, { accept, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  socket.onmessage = ({ data }) => {
    const result = JSON.parse(data);
    if (result.id) {
      const request = pending.get(result.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(result.id);
      if (result.type === 'error') request.reject(new Error(result.message));
      else request.accept(result.result);
    } else if (result.method === 'log.entryAdded'
      && result.params.type === 'javascript' && result.params.level === 'error') {
      errors.push(result.params.text);
    }
  };

  await command('session.new', { capabilities: {} });
  await command('session.subscribe', { events: ['log.entryAdded'] });
  const { contexts } = await command('browsingContext.getTree');
  const context = contexts[0].context;
  const evaluate = async (expression) => {
    const result = await command('script.evaluate', {
      expression: `(async () => JSON.stringify(await (async () => { ${expression} })()))()`,
      target: { context },
      awaitPromise: true,
    });
    if (result.type === 'exception') throw new Error(result.exceptionDetails.text);
    return result.result.value === undefined ? undefined : JSON.parse(result.result.value);
  };

  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/blank') {
        response.end('<!doctype html><title>Status tests</title>');
        return;
      }
      let path = resolve(root, `.${decodeURIComponent(pathname)}`);
      if (path !== root && !path.startsWith(`${root}/`)) throw new Error('Invalid path');
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      let data = await readFile(path);
      if (extname(path) === '.js') {
        data = Buffer.from(data.toString().replace(
          /https:\/\/www\.gstatic\.com\/firebasejs\/12\.12\.1\/firebase-[a-z-]+\.js/g,
          '/test/fixtures/firebase.mjs',
        ));
      }
      if (extname(path) === '.html') {
        // Marketing fonts must not make fixture-only checks depend on Google responding.
        data = Buffer.from(data.toString().replace(
          /@import url\('https:\/\/fonts\.googleapis\.com\/[^']*'\);/g,
          '',
        ));
      }
      response.setHeader('Content-Type', extname(path) === '.mjs' ? 'text/javascript' : types[extname(path)] || 'application/octet-stream');
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const focusedOnly = process.env.JUBRO_LANDING_ONLY
    || process.env.JUBRO_SURFACES_ONLY
    || process.env.JUBRO_TRANSFER_ONLY
    || process.env.JUBRO_AUTH_ONLY
    || process.env.JUBRO_TOOLBAR_ONLY
    || process.env.JUBRO_NEXT_ACTION_ONLY
    || process.env.JUBRO_COLOR_ONLY
    || process.env.JUBRO_LIST_GUIDE_ONLY;
  await command('browsingContext.navigate', { context, url: `${origin}/blank`, wait: 'complete' });
  if (process.env.JUBRO_TRANSFER_ONLY) {
    const { verifyGuestTransfer } = await import('./guestTransfer.browser.mjs');
    await verifyGuestTransfer({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_AUTH_ONLY) {
    const { verifyAuthNavigation } = await import('./authNavigation.browser.mjs');
    await verifyAuthNavigation({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_SURFACES_ONLY) {
    const { verifyWorkspaceSurfaces } = await import('./workspaceSurfaces.browser.mjs');
    await verifyWorkspaceSurfaces({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_TOOLBAR_ONLY) {
    const { verifyToolbarWidth } = await import('./toolbarWidth.browser.mjs');
    await verifyToolbarWidth({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_NEXT_ACTION_ONLY) {
    const { verifyNextAction } = await import('./nextAction.browser.mjs');
    await verifyNextAction({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_COLOR_ONLY) {
    const { verifyColorDialog } = await import('./colorDialog.browser.mjs');
    await verifyColorDialog({ command, evaluate, context, origin, artifacts });
  }
  if (process.env.JUBRO_LIST_GUIDE_ONLY) {
    const { verifyListGuide } = await import('./listGuide.browser.mjs');
    await verifyListGuide({ command, evaluate, context, origin, artifacts });
  }
  if (!focusedOnly) {
    if (!process.env.JUBRO_ENTRY_ONLY) {
      await evaluate(`
        localStorage.clear();
        localStorage.setItem('flextracker_data', JSON.stringify({
          active: 'status-test', ownerType: 'guest', ownerId: null, revision: 1,
          data: { 'status-test': {
            id: 'status-test', title: 'Status customization',
            columns: [
              { name: 'Company', type: 'text' },
              { name: 'Position', type: 'text' },
              { name: 'Status', type: 'select', options: ['Applied', 'Interview', 'Rejected'] },
            ],
            rows: [
              ['Google', 'Frontend Intern', 'Applied'],
              ['Microsoft', 'Software Engineer', 'Interview'],
              ['Meta', 'Web Developer', 'Rejected'],
              ['Blank', 'Developer', ''],
            ],
          } },
        }));
      `);
      await command('browsingContext.navigate', { context, url: `${origin}/board/?tracker=status-test`, wait: 'complete' });
      await evaluate(`
        const { TrackerApp } = await import('/js/main/main.js');
        window.statusApp = new TrackerApp();
        window.applicationRow = (name) => statusApp.getTracker().rows.find(row => statusApp.getCellValue(row[0]) === name);
        window.applicationIndex = (name) => statusApp.getTracker().rows.indexOf(applicationRow(name));
        window.applicationCard = (name, view = '#kanbanView') => document.querySelector(view + ' [data-row-index="' + applicationIndex(name) + '"]');
        window.savedRevision = () => JSON.parse(localStorage.getItem('flextracker_data')).revision;
        window.menuButton = (index) => document.querySelector('[data-status-option-index="' + index + '"]');
        window.openAction = (index, text) => {
          menuButton(index).click();
          [...document.querySelector(':popover-open').querySelectorAll('button')]
            .find(button => button.textContent === text).click();
        };
        window.submitDialog = () => document.querySelector('dialog[open] form').requestSubmit();
        window.nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      `);
      assert.equal(await evaluate('return savedRevision();'), 1, 'Opening must not save.');

      assert.equal(await evaluate(`
        statusApp.setBoardView('list');
        statusApp.listSortSelect.value = 'manual';
        statusApp.renderListView(statusApp.getTracker());
        statusApp.applySearchFilter();
        const source = applicationCard('Google', '#listView');
        const rect = source.getBoundingClientRect();
        const touch = { identifier: 12, clientX: rect.left + 25, clientY: rect.top + 25 };
        const event = new Event('touchstart', { bubbles: true });
        Object.defineProperty(event, 'touches', { value: [touch] });
        source.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 350));
        const duration = getComputedStyle(document.querySelector('.kanban-drag-preview')).transitionDuration;
        document.dispatchEvent(new Event('touchcancel'));
        statusApp.setBoardView('kanban');
        return duration;
      `), '0s', 'Touch preview must follow the pointer without inherited card transition lag.');

      assert.equal(await evaluate(`
        openAction(0, 'Change color');
        const circles = [...document.querySelectorAll('dialog[open] .status-color-choice')].every(button => {
          const rect = button.getBoundingClientRect();
          return rect.width === 44 && rect.height === 44;
        });
        document.querySelector('dialog[open]').close();
        await nextFrame();
        return circles;
      `), true, 'Palette choices must be fixed 44px circles, not stretched grid items.');

      assert.deepEqual(await evaluate(`
        const columns = [...document.querySelectorAll('.kanban-column')];
        return columns.map(column => {
          const header = column.querySelector('.kanban-column-header').getBoundingClientRect();
          const rect = column.getBoundingClientRect();
          const style = getComputedStyle(column);
          return {
            fullWidth: Math.abs(header.left - rect.left - parseFloat(style.borderLeftWidth)) < 1
              && Math.abs(rect.right - header.right - parseFloat(style.borderRightWidth)) < 1,
            atTop: Math.abs(header.top - rect.top - parseFloat(style.borderTopWidth)) < 1,
            menu: Boolean(column.querySelector('.kanban-status-menu-toggle')),
          };
        });
      `), Array.from({ length: 4 }, () => ({ fullWidth: true, atTop: true, menu: true })));

      assert.equal(await evaluate(`
        menuButton(0).click();
        const disabled = [...document.querySelector(':popover-open').querySelectorAll('button')]
          .find(button => button.textContent === 'Move left').disabled;
        document.querySelector(':popover-open').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return disabled && !document.querySelector(':popover-open') && document.activeElement === menuButton(0);
      `), true);

      assert.equal(await evaluate(`
        openAction(0, 'Rename status');
        document.querySelector('dialog[open] input').value = 'Submitted';
        document.querySelector('dialog[open] .status-dialog-cancel').click();
        await nextFrame();
        openAction(1, 'Change color');
        document.querySelector('dialog[open] [aria-label="Purple"]').click();
        document.querySelector('dialog[open] .status-dialog-cancel').click();
        await nextFrame();
        return savedRevision();
      `), 1, 'Canceling both dialogs must not save.');

      assert.deepEqual(await evaluate(`
        openAction(1, 'Rename status');
        document.querySelector('dialog[open] input').value = ' applied ';
        submitDialog();
        const duplicate = document.querySelector('dialog[open] [role="alert"]').textContent;
        document.querySelector('dialog[open] input').value = '   ';
        submitDialog();
        const blank = document.querySelector('dialog[open] [role="alert"]').textContent;
        document.querySelector('dialog[open] .status-dialog-cancel').click();
        await nextFrame();
        return { duplicate, blank, revision: savedRevision() };
      `), { duplicate: 'A status with that name already exists.', blank: 'Enter a status name.', revision: 1 });

      await evaluate('menuButton(0).click();');
      await command('input.performActions', {
        context,
        actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
          { type: 'pointerMove', x: 5, y: 500 },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
          { type: 'pause', duration: 300 },
        ] }],
      });
      assert.equal(await evaluate('return Boolean(document.querySelector(":popover-open"));'), false);
      await evaluate('menuButton(2).click();');
      assert.equal(await evaluate(`
        return [...document.querySelector(':popover-open').querySelectorAll('button')]
          .find(button => button.textContent === 'Move right').disabled;
      `), true);
      await command('input.performActions', {
        context,
        actions: [{ type: 'key', id: 'keyboard', actions: [
          { type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' },
        ] }],
      });
      assert.equal(await evaluate('return !document.querySelector(":popover-open") && document.activeElement === menuButton(2);'), true);
      await evaluate("openAction(0, 'Rename status');");
      await command('input.performActions', {
        context,
        actions: [{ type: 'key', id: 'keyboard', actions: [
          { type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' },
        ] }],
      });
      assert.equal(await evaluate('return !document.querySelector("dialog[open]") && savedRevision() === 1;'), true);

      assert.deepEqual(await evaluate(`
        const app = statusApp;
        for (const [index, color] of [[0, 'Blue'], [1, 'Green'], [2, 'Red']]) {
          openAction(index, 'Change color');
          document.querySelector('dialog[open] [aria-label="' + color + '"]').click();
          submitDialog();
          await nextFrame();
        }
        app.activeListFilters[2] = 'Applied';
        app.sortSelect.value = 'select-text';
        app.selectTextSortSelect.value = '2';
        app.renderSelectValueFilterOptions();
        app.selectValueFilterSelect.value = 'Applied';
        openAction(0, 'Rename status');
        document.querySelector('dialog[open] input').value = 'Submitted';
        submitDialog();
        await nextFrame();
        const filter = app.selectValueFilterSelect.value;
        openAction(2, 'Move left');
        await nextFrame();
        const result = {
          revision: savedRevision(), filter,
          options: app.getTracker().columns[2].options,
          statuses: app.getTracker().rows.map(row => app.getCellValue(row[2])),
          listFilter: app.activeListFilters[2],
          headings: [...document.querySelectorAll('.kanban-column-title')].map(node => node.textContent),
          select: [...document.querySelector('.kanban-card select').options].map(option => option.value),
        };
        app.activeListFilters = {};
        app.clearSelectFilter();
        return result;
      `), {
        revision: 6, filter: 'Submitted', listFilter: 'Submitted',
        options: [
          { label: 'Submitted', color: 'blue' },
          { label: 'Rejected', color: 'red' },
          { label: 'Interview', color: 'green' },
        ],
        statuses: ['Submitted', 'Interview', 'Rejected', ''],
        headings: ['Submitted', 'Rejected', 'Interview', 'No status'],
        select: ['Submitted', 'Rejected', 'Interview', ''],
      });

      assert.equal(await evaluate(`
        statusApp.setBoardView('list');
        const text = document.querySelector('#listView').textContent;
        const result = text.includes('Submitted') && !text.includes('Applied');
        statusApp.setBoardView('kanban');
        document.getElementById('jubroStorageNotice')?.classList.add('hidden');
        return result;
      `), true, 'List and filters must reflect the rename immediately.');

      assert.equal(await evaluate(`
        const column = document.querySelector('[data-kanban-status="Submitted"]');
        const transfer = new DataTransfer();
        applicationCard('Microsoft').dispatchEvent(new DragEvent('dragstart', {
          bubbles: true, cancelable: true, dataTransfer: transfer, clientX: 50, clientY: 200,
        }));
        column.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
        const moved = statusApp.getCellValue(applicationRow('Microsoft')[2]) === 'Submitted';
        const select = applicationCard('Microsoft').querySelector('select');
        select.value = 'Interview';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return moved && statusApp.getCellValue(applicationRow('Microsoft')[2]) === 'Interview';
      `), true, 'Drop and mobile-select handlers must use renamed statuses.');

      await command('browsingContext.setViewport', { context, viewport: { width: 1440, height: 900 }, devicePixelRatio: 1 });
      const mouseDrag = await evaluate(`
        window.dragEvents = [];
        for (const type of ['pointerdown', 'pointerup', 'dragstart', 'dragover', 'drop']) {
          document.addEventListener(type, event => dragEvents.push({
            type, prevented: event.defaultPrevented,
          }));
        }
        statusApp.kanbanColumns.scrollLeft = 0;
        await nextFrame();
        const card = applicationCard('Google');
        const source = card.getBoundingClientRect();
        const target = document.querySelector('[data-kanban-status="Interview"] .kanban-card-list').getBoundingClientRect();
        return {
          from: { x: Math.round(source.left + 70), y: Math.round(source.top + 25) },
          to: { x: Math.round(target.left + 80), y: Math.round(target.top + 80) },
          revision: savedRevision(),
        };
      `);
      await command('input.performActions', {
        context,
        actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [
          { type: 'pointerMove', ...mouseDrag.from },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerMove', x: mouseDrag.from.x + 30, y: mouseDrag.from.y + 10, duration: 100 },
          { type: 'pointerMove', ...mouseDrag.to, duration: 400 },
          { type: 'pause', duration: 300 },
          { type: 'pointerUp', button: 0 },
          { type: 'pause', duration: 300 },
        ] }],
      });
      await command('input.releaseActions', { context });
      const mouseDropCompleted = await evaluate(`
        return dragEvents.some(event => event.type === 'pointerdown')
          && dragEvents.some(event => event.type === 'pointerup')
          && savedRevision() === ${mouseDrag.revision + 1};
      `);
      assert.equal(mouseDropCompleted, true, 'Browser mouse press/move/release must save without a synthetic drop fallback.');
      assert.deepEqual(await evaluate(`
        return {
          status: statusApp.getCellValue(applicationRow('Google')[2]), revision: savedRevision(),
        };
      `), { status: 'Interview', revision: mouseDrag.revision + 1 }, 'Desktop drop must move exactly one application.');
      await evaluate(`
        statusApp.moveKanbanRow(applicationIndex('Google'), 'Submitted');
        window.touchEvent = (target, type, touches, changedTouches = touches) => {
          const event = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } });
          target.dispatchEvent(event);
          return event;
        };
        window.holdCard = async (index) => {
          const card = applicationCard(['Google', 'Microsoft', 'Meta', 'Blank'][index]);
          const rect = card.getBoundingClientRect();
          const touch = { identifier: 9, clientX: rect.left + 50, clientY: rect.top + 25 };
          touchEvent(card, 'touchstart', [touch]);
          await new Promise(resolve => setTimeout(resolve, 350));
          return touch;
        };
      `);
      assert.equal(await evaluate(`
        const before = savedRevision();
        const touch = await holdCard(0);
        const lifted = Boolean(document.querySelector('.kanban-drag-preview'));
        const target = document.querySelector('[data-kanban-status="Interview"] .kanban-card-list').getBoundingClientRect();
        const moved = { ...touch, clientX: target.left + 80, clientY: target.top + 80 };
        const move = touchEvent(document, 'touchmove', [moved]);
        const highlighted = document.querySelector('[data-kanban-status="Interview"]').classList.contains('is-drop-target');
        touchEvent(document, 'touchend', [], [moved]);
        const saved = statusApp.getCellValue(applicationRow('Google')[2]) === 'Interview'
          && savedRevision() === before + 1;
        statusApp.moveKanbanRow(applicationIndex('Google'), 'Submitted');
        return lifted && move.defaultPrevented && highlighted && saved
          && !document.querySelector('.kanban-drag-preview');
      `), true, 'Touch hold/drop must highlight, save once, and remove its preview.');

      assert.equal(await evaluate(`
        const before = savedRevision();
        for (const action of ['escape', 'multitouch', 'cancel', 'redraw', 'outside']) {
          const touch = await holdCard(0);
          if (action === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          if (action === 'multitouch') touchEvent(document, 'touchstart', [touch, { ...touch, identifier: 10 }]);
          if (action === 'cancel') touchEvent(document, 'touchcancel', []);
          if (action === 'redraw') statusApp.refresh({ persist: false });
          if (action === 'outside') touchEvent(document, 'touchend', [], [{ ...touch, clientX: 0, clientY: 0 }]);
          if (document.querySelector('.kanban-drag-preview') || savedRevision() !== before) return false;
        }
        return true;
      `), true, 'Cancel paths must clean up without saving.');

      await command('browsingContext.setViewport', { context, viewport: { width: 390, height: 900 }, devicePixelRatio: 1 });
      assert.equal(await evaluate(`
        statusApp.kanbanColumns.scrollLeft = 0;
        await nextFrame();
        const before = savedRevision();
        const card = applicationCard('Google');
        const rect = card.getBoundingClientRect();
        const touch = { identifier: 9, clientX: rect.left + 50, clientY: rect.top + 25 };
        touchEvent(card, 'touchstart', [touch]);
        const swipe = touchEvent(document, 'touchmove', [{ ...touch, clientX: touch.clientX + 12 }]);
        await new Promise(resolve => setTimeout(resolve, 350));
        if (swipe.defaultPrevented || document.querySelector('.kanban-drag-preview')) return false;
        const held = await holdCard(0);
        const bounds = statusApp.kanbanColumns.getBoundingClientRect();
        touchEvent(document, 'touchmove', [{ ...held, clientX: bounds.right - 5 }]);
        await new Promise(resolve => setTimeout(resolve, 150));
        const scrolled = statusApp.kanbanColumns.scrollLeft > 0;
        touchEvent(document, 'touchcancel', []);
        statusApp.kanbanColumns.scrollLeft = 0;
        return scrolled && savedRevision() === before && !document.querySelector('.kanban-drag-preview');
      `), true, 'Mobile swipes stay scrollable; active drags scroll near the Board edge without saving.');

      assert.equal(await evaluate(`
        const before = savedRevision();
        const column = document.querySelector('[data-kanban-status="Submitted"]');
        column.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: new DataTransfer() }));
        const external = new DataTransfer();
        external.setData('text/plain', '0');
        column.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: external }));
        const touch = await holdCard(0);
        const bounds = document.querySelector('[data-kanban-status="Submitted"]').getBoundingClientRect();
        touchEvent(document, 'touchend', [], [{ ...touch, clientX: bounds.left + 60, clientY: bounds.top + 100 }]);
        return savedRevision() === before;
      `), true, 'External, empty, and same-column drops must not save.');

      assert.equal(await evaluate(`
        const before = savedRevision();
        for (const status of ['', 'Submitted']) {
          const transfer = new DataTransfer();
          applicationCard('Google').dispatchEvent(new DragEvent('dragstart', {
            bubbles: true, cancelable: true, dataTransfer: transfer,
          }));
          const column = [...document.querySelectorAll('.kanban-column')]
            .find(column => column.dataset.kanbanStatus === status);
          column.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
          if (statusApp.getCellValue(applicationRow('Google')[2]) !== status) return false;
        }
        return savedRevision() === before + 2;
      `), true, 'Dropping into and out of No status preserves blank-string semantics.');

      assert.deepEqual(await evaluate(`
        const fallback = document.querySelector('[data-kanban-status=""]');
        const before = savedRevision();
        fallback.querySelector('.kanban-status-menu-toggle').click();
        const buttons = [...document.querySelector(':popover-open').querySelectorAll('button')];
        const actions = buttons.map(button => button.textContent);
        buttons[0].click();
        document.querySelector('dialog[open] [aria-label="Pink"]').click();
        document.querySelector('dialog[open] .status-dialog-cancel').click();
        await nextFrame();
        const canceled = statusApp.kanbanFallbackColor === undefined && savedRevision() === before;
        openAction(null, 'Change color');
        document.querySelector('dialog[open] [aria-label="Purple"]').click();
        submitDialog();
        await nextFrame();
        const color = document.querySelector('[data-kanban-status=""]').style.getPropertyValue('--status-accent');
        const result = {
          actions, color, unchanged: canceled && savedRevision() === before,
          blank: statusApp.getCellValue(applicationRow('Blank')[2]),
        };
        delete statusApp.kanbanFallbackColor;
        statusApp.refresh({ persist: false });
        return result;
      `), { actions: ['Change color'], color: '#a855f7', unchanged: true, blank: '' },
      'Fallback color is presentation-only; no rename, delete, or stored status mutation.');

      for (const theme of ['dark', 'light']) {
        for (const width of [390, 430, 768, 1024, 1440, 1920]) {
          await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
          const result = await evaluate(`
            document.documentElement.classList.toggle('dark', ${theme === 'dark'});
            await nextFrame();
            const columns = [...document.querySelectorAll('.kanban-column')];
            const headerSizes = columns.map(column => {
              const rect = column.getBoundingClientRect();
              const header = column.querySelector('.kanban-column-header').getBoundingClientRect();
              return Math.abs(header.left - rect.left - 1) < 1
                && Math.abs(rect.right - header.right - 1) < 1
                && Math.abs(header.top - rect.top - 3) < 1
                && header.height === 69;
            });
            let allMenusFit = true;
            for (const column of columns) {
              const button = column.querySelector('.kanban-status-menu-toggle');
              button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              button.click();
              const rect = document.querySelector(':popover-open').getBoundingClientRect();
              allMenusFit &&= rect.left >= 0 && rect.right <= innerWidth
                && rect.top >= 0 && rect.bottom <= innerHeight;
              document.querySelector(':popover-open').hidePopover();
            }
            menuButton(0).scrollIntoView({ block: 'nearest', inline: 'nearest' });
            menuButton(0).click();
            const menuRect = document.querySelector(':popover-open').getBoundingClientRect();
            const menuFits = menuRect.left >= 0 && menuRect.right <= innerWidth
              && menuRect.top >= 0 && menuRect.bottom <= innerHeight;
            document.querySelector(':popover-open').hidePopover();
            openAction(0, 'Change color');
            await nextFrame();
            const dialog = document.querySelector('dialog[open]');
            const rect = dialog.getBoundingClientRect();
            const header = document.querySelector('.kanban-column-header');
            const toggle = menuButton(0).getBoundingClientRect();
            const circles = [...dialog.querySelectorAll('.status-color-choice')].every(button => {
              const swatch = button.getBoundingClientRect();
              return swatch.width === 44 && swatch.height === 44
                && getComputedStyle(button).borderRadius === '50%';
            });
            const selected = dialog.querySelector('.status-color-choice[aria-pressed="true"]');
            const selectedStyle = getComputedStyle(selected);
            const centeredSelection = selected.textContent === '✓'
              && selectedStyle.alignItems === 'center' && selectedStyle.justifyContent === 'center';
            return {
              circles,
              centeredSelection,
              headers: headerSizes.every(Boolean),
              allMenusFit,
              fits: menuFits && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
              noPageOverflow: document.documentElement.scrollWidth <= innerWidth,
              touch: toggle.width >= 44 && toggle.height >= 44,
              titleColor: getComputedStyle(header.querySelector('h2')).color,
              borderColor: getComputedStyle(header.parentElement).borderTopColor,
            };
          `);
          assert.equal(result.fits && result.noPageOverflow && result.touch, true, `${theme} ${width}: ${JSON.stringify(result)}`);
          assert.equal(result.circles, true, `${theme} ${width}: color choices must remain 44px circles`);
          assert.equal(result.centeredSelection, true, `${theme} ${width}: selected checkmark must stay centered`);
          assert.equal(result.headers && result.allMenusFit, true, `${theme} ${width}: full aligned headers and unclipped menus`);
          assert.equal(result.borderColor, 'rgb(59, 130, 246)');
          const screenshot = await command('browsingContext.captureScreenshot', { context });
          await writeFile(resolve(artifacts, `${theme}-${width}-dialog.png`), Buffer.from(screenshot.data, 'base64'));
          await evaluate(`document.querySelector('dialog[open]').close(); await nextFrame();`);
          const board = await command('browsingContext.captureScreenshot', { context });
          await writeFile(resolve(artifacts, `${theme}-${width}-board.png`), Buffer.from(board.data, 'base64'));
          await evaluate(`
            statusApp.kanbanColumns.scrollLeft = 0;
            await nextFrame();
            const touch = await holdCard(0);
            touchEvent(document, 'touchmove', [{ ...touch, clientX: touch.clientX + 30, clientY: touch.clientY + 30 }]);
          `);
          const drag = await command('browsingContext.captureScreenshot', { context });
          await writeFile(resolve(artifacts, `${theme}-${width}-drag.png`), Buffer.from(drag.data, 'base64'));
          await evaluate(`touchEvent(document, 'touchcancel', []);`);
        }
    }

    assert.equal(await evaluate(`
      const { Storage } = await import('/js/storage/storage.js');
      const before = savedRevision();
      openAction(0, 'Rename status');
      const newer = Storage.load();
      newer.data['status-test'].title = 'Newer tab';
      Storage.save(newer);
      document.querySelector('dialog[open] input').value = 'Must not save';
      submitDialog();
      const result = savedRevision() === before + 1
        && statusApp.getTracker().columns[2].options[0].label === 'Submitted'
        && !document.querySelector('dialog[open]');
      await nextFrame();
      openAction(0, 'Rename status');
      statusApp.reloadStateFromStorage();
      const replaced = !document.querySelector('dialog[open]');
      await nextFrame();
      return result && replaced;
    `), true, 'Stale saves and replaced tracker snapshots must not rename stored statuses.');

    assert.deepEqual(await evaluate(`
      const { Storage } = await import('/js/storage/storage.js');
      return Storage.load().data['status-test'].columns[2].options;
    `), [
      { label: 'Submitted', color: 'blue' },
      { label: 'Rejected', color: 'red' },
      { label: 'Interview', color: 'green' },
    ]);

    await evaluate(`
      document.getElementById('jubroStorageNotice')?.classList.add('hidden');
      statusApp.getTracker().rows = [
        ['A', 'Engineer', 'Submitted'],
        ['B', 'Engineer', 'Submitted'],
        ['Hidden', 'Engineer', 'Interview'],
        ['C', 'Engineer', 'Submitted'],
        ['D', 'Engineer', 'Submitted'],
        ['E', 'Engineer', 'Submitted'],
        ['F', 'Engineer', 'Submitted'],
        ['Blank', 'Engineer', ''],
      ];
      statusApp.searchInput.value = '';
      statusApp.listSearchInput.value = '';
      statusApp.activeListFilters = {};
      statusApp.sortSelect.value = 'date-desc';
      statusApp.setListManualSort();
      statusApp.save();
      statusApp.refresh({ persist: false });
      statusApp.setBoardView('kanban');
      window.names = () => statusApp.getTracker().rows.map(row => statusApp.getCellValue(row[0]));
      window.dropApplication = async (source, target, placement, view = '#kanbanView') => {
        const destination = applicationCard(target, view);
        destination.scrollIntoView({ block: 'center', inline: 'nearest' });
        await nextFrame();
        const rect = destination.getBoundingClientRect();
        const clientX = rect.left + 25;
        const clientY = rect.top + rect.height * (placement === 'before' ? 0.25 : 0.75);
        const transfer = new DataTransfer();
        applicationCard(source, view).dispatchEvent(new DragEvent('dragstart', {
          bubbles: true, cancelable: true, dataTransfer: transfer, clientX, clientY,
        }));
        destination.dispatchEvent(new DragEvent('dragover', {
          bubbles: true, cancelable: true, dataTransfer: transfer, clientX, clientY,
        }));
        const indicator = destination.classList.contains('drop-' + placement);
        destination.dispatchEvent(new DragEvent('drop', {
          bubbles: true, cancelable: true, dataTransfer: transfer, clientX, clientY,
        }));
        return indicator;
      };
    `);
    assert.deepEqual(await evaluate(`
      const before = savedRevision();
      const up = await dropApplication('C', 'A', 'before');
      const first = names();
      const down = await dropApplication('C', 'B', 'after');
      const second = names();
      const cross = await dropApplication('B', 'Hidden', 'after');
      return {
        first, second, final: names(), indicators: up && down && cross,
        status: statusApp.getCellValue(applicationRow('B')[2]),
        revisions: savedRevision() - before,
      };
    `), {
      first: ['C', 'A', 'B', 'Hidden', 'D', 'E', 'F', 'Blank'],
      second: ['A', 'B', 'C', 'Hidden', 'D', 'E', 'F', 'Blank'],
      final: ['A', 'C', 'Hidden', 'B', 'D', 'E', 'F', 'Blank'],
      indicators: true, status: 'Interview', revisions: 3,
    }, 'Board midpoint insertion and cross-column placement persist exactly once each.');

    assert.equal(await evaluate(`
      statusApp.setBoardView('list');
      const before = savedRevision();
      statusApp.listSortSelect.value = 'date-desc';
      statusApp.listSortSelect.dispatchEvent(new Event('change'));
      const disabled = [...document.querySelectorAll('#listCards article')].every(card => !card.draggable);
      const transfer = new DataTransfer();
      applicationCard('A', '#listView').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
      applicationCard('C', '#listView').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
      const unchanged = savedRevision() === before;
      statusApp.listSortSelect.value = 'manual';
      statusApp.listSortSelect.dispatchEvent(new Event('change'));
      return disabled && unchanged && [...document.querySelectorAll('#listCards article')].every(card => card.draggable);
    `), true, 'Date-sorted List is nondraggable; Manual enables dragging without a save.');

    assert.deepEqual(await evaluate(`
      const before = savedRevision();
      const first = await dropApplication('D', 'A', 'before', '#listView');
      statusApp.goToPage(2);
      const second = await dropApplication('Blank', 'E', 'before', '#listView');
      const order = names();
      const transfer = new DataTransfer();
      applicationCard('D', '#listView').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
      applicationCard('E', '#listView').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
      return {
        order, indicators: first && second, page: statusApp.currentPage,
        visible: [...document.querySelectorAll('#listCards article:not(.hidden)')].map(card => statusApp.getCellValue(statusApp.getTracker().rows[Number(card.dataset.rowIndex)][0])),
        blank: statusApp.getCellValue(applicationRow('Blank')[2]), revisions: savedRevision() - before,
      };
    `), {
      order: ['D', 'A', 'C', 'Hidden', 'B', 'Blank', 'E', 'F'], indicators: true,
      page: 2, visible: ['Blank', 'E', 'F'], blank: '', revisions: 2,
    }, 'List drag stays within the current page; hidden sources cannot move.');

    assert.deepEqual(await evaluate(`
      const before = savedRevision();
      statusApp.activeListFilters = { 2: 'Submitted' };
      statusApp.searchInput.value = 'Engineer';
      statusApp.resetPagination();
      statusApp.applySearchFilter();
      await dropApplication('F', 'A', 'before', '#listView');
      return {
        order: names(), revisions: savedRevision() - before,
        search: statusApp.searchInput.value, filter: statusApp.activeListFilters[2],
        hidden: ['Hidden', 'B'].map(name => statusApp.getCellValue(applicationRow(name)[2])),
      };
    `), {
      order: ['D', 'F', 'A', 'C', 'Hidden', 'B', 'Blank', 'E'], revisions: 1,
      search: 'Engineer', filter: 'Submitted', hidden: ['Interview', 'Interview'],
    }, 'Filtered insertion preserves queries, status values, and hidden row order.');

    for (const theme of ['dark', 'light']) {
      for (const width of [390, 430, 768, 1024, 1440, 1920]) {
        await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
        for (const view of ['kanban', 'list']) {
          assert.equal(await evaluate(`
            document.documentElement.classList.toggle('dark', ${theme === 'dark'});
            statusApp.setBoardView('${view}');
            const selector = '${view === 'list' ? '#listView' : '#kanbanView'}';
            const target = applicationCard('A', selector);
            target.scrollIntoView({ block: 'center', inline: 'nearest' });
            await nextFrame();
            const source = applicationCard('C', selector);
            const sourceRect = source.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const touch = { identifier: 11, clientX: sourceRect.left + 25, clientY: sourceRect.top + 25 };
            touchEvent(source, 'touchstart', [touch]);
            await new Promise(resolve => setTimeout(resolve, 350));
            touchEvent(document, 'touchmove', [{ ...touch, clientX: targetRect.left + 25, clientY: targetRect.top + 15 }]);
            return target.classList.contains('drop-before')
              && Boolean(document.querySelector('.kanban-drag-preview'))
              && document.documentElement.scrollWidth <= innerWidth;
          `), true, `${theme} ${width} ${view}: insertion feedback and touch preview fit`);
          const shot = await command('browsingContext.captureScreenshot', { context });
          await writeFile(resolve(artifacts, `${theme}-${width}-order-${view}.png`), Buffer.from(shot.data, 'base64'));
          await evaluate(`touchEvent(document, 'touchcancel', []);`);
        }
      }
    }
    await evaluate(`
      window.expectedOrder = names();
      statusApp.activeListFilters = {};
      statusApp.searchInput.value = '';
      statusApp.setBoardView('list');
      statusApp.applySearchFilter();
      const before = savedRevision();
      const first = applicationCard('D', '#listView');
      if (!first.querySelector('.btn-list-move-up').disabled) throw new Error('First card must not move up');
      first.querySelector('.btn-list-move-down').click();
      if (savedRevision() !== before + 1) throw new Error('Keyboard move must save once');
      window.expectedOrder = names();
    `);
    for (const view of ['kanban', 'list']) {
      for (const pointerType of ['mouse', 'touch']) {
        await command('browsingContext.setViewport', { context, viewport: { width: 1440, height: 900 }, devicePixelRatio: 1 });
        const points = await evaluate(`
          statusApp.getTracker().rows = [
            ['A', 'Engineer', 'Submitted'],
            ['C', 'Engineer', 'Submitted'],
            ['Hidden', 'Engineer', 'Interview'],
          ];
          statusApp.activeListFilters = {};
          statusApp.searchInput.value = '';
          statusApp.setListManualSort();
          statusApp.save();
          statusApp.refresh({ persist: false });
          statusApp.setBoardView('${view}');
          const selector = '${view === 'list' ? '#listView' : '#kanbanView'}';
          const source = applicationCard('A', selector);
          source.scrollIntoView({ block: 'center', inline: 'nearest' });
          await nextFrame();
          const grip = source.querySelector('[data-application-drag-handle]');
          if (getComputedStyle(grip).touchAction !== 'none') throw new Error('Touch grip must reserve the drag gesture');
          const from = ('${pointerType}' === 'touch' ? grip : source).getBoundingClientRect();
          const to = applicationCard('C', selector).getBoundingClientRect();
          return {
            from: {
              x: Math.round(from.left + ('${pointerType}' === 'touch' ? from.width / 2 : 60)),
              y: Math.round(from.top + ('${pointerType}' === 'touch' ? from.height / 2 : 25)),
            },
            to: { x: Math.round(to.left + 60), y: Math.round(to.bottom - 15) },
            revision: savedRevision(),
          };
        `);
        await command('input.performActions', {
          context,
          actions: [{ type: 'pointer', id: `${pointerType}-${view}`, parameters: { pointerType }, actions: [
            { type: 'pointerMove', ...points.from },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: pointerType === 'touch' ? 700 : 100 },
            { type: 'pointerMove', x: points.from.x + 25, y: points.from.y + 2, duration: 100 },
            { type: 'pointerMove', ...points.to, duration: 400 },
            { type: 'pointerUp', button: 0 },
            { type: 'pause', duration: 100 },
          ] }],
        });
        await command('input.releaseActions', { context });
        assert.deepEqual(await evaluate(`
          return {
            order: names(), revisions: savedRevision() - ${points.revision},
            clean: !document.querySelector('.kanban-drag-preview, .is-card-dragging'),
          };
        `), { order: ['C', 'A', 'Hidden'], revisions: 1, clean: true },
        `${view} ${pointerType}: trusted browser input must reorder exactly once and clean up`);
      }
    }
    const expectedOrder = await evaluate('return names();');
    await command('browsingContext.reload', { context, wait: 'complete' });
    assert.deepEqual(await evaluate(`
      const { TrackerApp } = await import('/js/main/main.js');
      const app = new TrackerApp();
      return {
        order: app.getTracker().rows.map(row => app.getCellValue(row[0])),
        options: app.getTracker().columns[2].options,
      };
    `), {
      order: expectedOrder,
      options: [
        { label: 'Submitted', color: 'blue' },
        { label: 'Rejected', color: 'red' },
        { label: 'Interview', color: 'green' },
      ],
    }, 'Reload preserves shared application order and customized status options.');
    }
    if (process.env.JUBRO_ENTRY_ONLY) {
      await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
    }
    assert.equal(await evaluate(`
      const { TrackerApp } = await import('/js/main/main.js');
      const { Storage } = await import('/js/storage/storage.js');
      const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
      const state = Storage.load();
      state.data.other = createDefaultTracker('other', 'Other search');
      Storage.save(state);
      window.boardFirstApp = new TrackerApp();
      window.savedRevision = () => Storage.load().revision;
      window.nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const before = savedRevision();
      const trigger = document.getElementById('jobSearchSelector');
      trigger.click();
      await nextFrame();
      const menu = document.getElementById('jobSearchDropdown');
      const counts = [...menu.querySelectorAll('small')].map(node => node.textContent);
      const readOnly = savedRevision() === before && counts.includes('0 applications')
        && menu.querySelectorAll('[aria-current="true"]').length === 1;
      boardFirstApp.searchInput.value = 'Google';
      boardFirstApp.currentPage = 4;
      menu.hidePopover();
      boardFirstApp.switchJobSearch('other');
      return readOnly && savedRevision() === before + 1
        && boardFirstApp.state.active === 'other'
        && location.search === '?tracker=other'
        && boardFirstApp.searchInput.value === '' && boardFirstApp.currentPage === 1
        && boardFirstApp.getTracker().rows.length === 0;
    `), true, 'Board switcher opens read-only and switches canonical active, URL and search state.');
    assert.equal(await evaluate(`
      const more = document.getElementById('boardTopNavDropdown');
      const dashboard = document.getElementById('btnDashboard');
      const before = savedRevision();
      if ((more && more.contains(dashboard)) || (more && more.contains(boardFirstApp.sortSelect))
        || !document.getElementById('searchWrapper').contains(boardFirstApp.sortSelect)) return false;
      dashboard.focus();
      dashboard.click();
      const opened = !boardFirstApp.dashboardModal.classList.contains('hidden');
      document.getElementById('btnCloseDashboard').click();
      return opened && document.activeElement === dashboard && savedRevision() === before;
    `), true, 'Dashboard is direct navigation; Search owns Sort; modal restores focus without writes.');
    assert.equal(await evaluate(`
      const before = savedRevision();
      boardFirstApp.sortSelect.value = 'select-text';
      boardFirstApp.sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
      const field = document.getElementById('selectTextSortWrapper');
      const clear = document.getElementById('btnClearSelectFilter');
      if (getComputedStyle(field).display === 'none' || getComputedStyle(clear).display === 'none'
        || document.getElementById('boardTopNavDropdown')?.contains(field)) return false;
      clear.click();
      return boardFirstApp.sortSelect.value === '' && getComputedStyle(clear).display === 'none'
        && savedRevision() === before;
    `), true, 'Select-field filters stay with Search and clear to Manual without writes.');
    for (const theme of ['dark', 'light']) {
      for (const width of [390, 430, 768, 1024, 1280, 1440, 1920]) {
        await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
        const toolbar = await evaluate(`
          document.documentElement.classList.toggle('dark', ${theme === 'dark'});
          boardFirstApp.closeMobileSearch();
          const selector = document.getElementById('jobSearchSelector');
          selector.querySelector('span').textContent = 'A very long internship and full-time Job Search title';
          await nextFrame();
          const controls = [selector,
            ...(innerWidth < 1024 ? [document.getElementById('btnOpenSearch')] : []),
            ...document.querySelectorAll('[data-board-view-button]'),
            document.getElementById('btnDashboard'),
            document.getElementById('btnCustomFields'),
            document.getElementById('btnAddApplication')];
          const rects = controls.map(control => control.getBoundingClientRect());
          const labels = [...document.querySelectorAll('.board-view-button span')];
          const customFieldsSpan = document.querySelector('#btnCustomFields span');
          const customFieldsLabelOk = customFieldsSpan
            && (getComputedStyle(customFieldsSpan).display !== 'none') === (innerWidth >= 1280);
          const fits = rects.every(rect => rect.width >= 40 && rect.height >= 40
            && rect.left >= 0 && rect.right <= innerWidth)
            && Math.max(...rects.map(rect => rect.top)) - Math.min(...rects.map(rect => rect.top)) <= 4
            && document.documentElement.scrollWidth <= innerWidth;
          const correctLabels = labels.length === 2 && labels.every(label =>
            (getComputedStyle(label).display !== 'none') === (innerWidth >= 768))
            && (getComputedStyle(document.querySelector('#btnDashboard span')).display !== 'none') === (innerWidth >= 768)
            && (getComputedStyle(document.querySelector('#btnAddApplication span')).display !== 'none') === (innerWidth >= 1024);
          const before = savedRevision();
          let search = true;
          if (innerWidth < 1024) {
            const trigger = document.getElementById('btnOpenSearch');
            trigger.click();
            await nextFrame();
            const input = document.getElementById('jobSearchInput').getBoundingClientRect();
            const sort = document.getElementById('sortSelect').getBoundingClientRect();
            search = input.width >= 100 && sort.width >= 80 && sort.right <= innerWidth
              && input.top >= selector.getBoundingClientRect().bottom
              && trigger.getAttribute('aria-expanded') === 'true';
            document.getElementById('jobSearchInput').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            search = search && document.activeElement === trigger
              && trigger.getAttribute('aria-expanded') === 'false';
          } else {
            const input = document.getElementById('jobSearchInput').getBoundingClientRect();
            const sort = document.getElementById('sortSelect').getBoundingClientRect();
            search = input.width >= 100 && sort.width >= 80 && Math.abs(input.top - sort.top) < 2
              && Math.abs(input.top - selector.getBoundingClientRect().top) < 4
              && getComputedStyle(document.getElementById('btnClearSelectFilter')).display === 'none';
          }
          return { fits, correctLabels, customFieldsLabelOk, search, readOnly: savedRevision() === before,
            sizes: rects.map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })) };
        `);
        assert.equal(toolbar.fits && toolbar.correctLabels && toolbar.customFieldsLabelOk && toolbar.search && toolbar.readOnly, true,
          'Compact accessible toolbar ' + theme + ' ' + width + ': ' + JSON.stringify(toolbar));
        const toolbarShot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, `${theme}-${width}-toolbar.png`), Buffer.from(toolbarShot.data, 'base64'));
        const geometry = await evaluate(`
          document.documentElement.classList.toggle('dark', ${theme === 'dark'});
          document.getElementById('jobSearchSelector').click();
          await nextFrame();
          const menu = document.getElementById('jobSearchDropdown');
          // Native popover toggle events are queued tasks, not animation-frame callbacks.
          for (let attempt = 0; attempt < 30; attempt += 1) {
            const rect = menu.getBoundingClientRect();
            if (document.getElementById('jobSearchSelector').getAttribute('aria-expanded') === 'true'
              && rect.left >= 0 && rect.right <= innerWidth) break;
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          const bounds = menu.getBoundingClientRect();
          const fits = bounds.left >= 0 && bounds.right <= innerWidth
            && document.documentElement.scrollWidth <= innerWidth;
          menu.hidePopover();
          let dialogFits = true;
          if (boardFirstApp.openJobSearchDialog) {
            boardFirstApp.openJobSearchDialog('create');
            const dialog = document.querySelector('dialog[open][data-job-search-action]');
            const rect = dialog.getBoundingClientRect();
            dialogFits = rect.left >= 0 && rect.right <= innerWidth;
            dialog.close();
          }
          return { fits: fits && dialogFits, left: bounds.left, right: bounds.right,
            leftStyle: menu.style.left,
            page: document.documentElement.scrollWidth, viewport: innerWidth };
        `);
        assert.equal(geometry.fits, true, 'Job Search menu fits ' + theme + ' ' + width + ': ' + JSON.stringify(geometry));
      }
    }
    assert.equal(await evaluate(`
      const before = savedRevision();
      const btnCustomFields = document.getElementById('btnCustomFields');
      const oldSettingsBtn = document.getElementById('btnListViewSettings');
      const popup = document.getElementById('listSettingsPopup');

      // 1. Initially closed, old button absent
      const initialOk = !oldSettingsBtn
        && btnCustomFields.getAttribute('aria-expanded') === 'false'
        && (!popup || popup.classList.contains('hidden'));

      // 2. Open from Board view
      btnCustomFields.click();
      await nextFrame();
      const popupEl = document.getElementById('listSettingsPopup');
      const openInBoard = Boolean(popupEl && !popupEl.classList.contains('hidden')
        && btnCustomFields.getAttribute('aria-expanded') === 'true');

      // 3. Escape key closes and restores focus
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await nextFrame();
      const closedOnEscape = Boolean(popupEl && popupEl.classList.contains('hidden')
        && btnCustomFields.getAttribute('aria-expanded') === 'false'
        && document.activeElement === btnCustomFields);

      // 4. Switch to List view
      document.querySelector('[data-board-view-button="list"]').click();
      await nextFrame();
      const noListBtn = !document.getElementById('btnListViewSettings');

      // 5. Open from List view
      btnCustomFields.click();
      await nextFrame();
      const openInList = Boolean(popupEl && !popupEl.classList.contains('hidden')
        && btnCustomFields.getAttribute('aria-expanded') === 'true');

      // 6. Close via Close button
      document.getElementById('btnCloseListSettings').click();
      await nextFrame();
      const closedOnBtn = Boolean(popupEl && popupEl.classList.contains('hidden')
        && btnCustomFields.getAttribute('aria-expanded') === 'false');

      // 7. Safety: opening and switching job search closes the modal
      btnCustomFields.click();
      await nextFrame();
      boardFirstApp.closeSearchSpecificUI();
      const closedOnSwitch = Boolean(popupEl && popupEl.classList.contains('hidden')
        && btnCustomFields.getAttribute('aria-expanded') === 'false');

      // Restore board view
      document.querySelector('[data-board-view-button="kanban"]').click();
      await nextFrame();

      return initialOk && openInBoard && closedOnEscape && noListBtn && openInList && closedOnBtn && closedOnSwitch
        && savedRevision() === before;
    `), true, 'Custom Fields opens and closes reliably from Board and List views with zero writes.');
    await command('browsingContext.setViewport', { context, viewport: { width: 1440, height: 900 }, devicePixelRatio: 1 });
    await command('browsingContext.activate', { context });
    const searchPoint = await evaluate(`
      for (let attempt = 0; attempt < 30 && document.querySelector('dialog[data-job-search-action]'); attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      document.activeElement.blur();
      boardFirstApp.closeMobileSearch();
      boardFirstApp.searchInput.value = 'Keep this search';
      window.resizeRevision = savedRevision();
      const rect = boardFirstApp.searchInput.getBoundingClientRect();
      return { x: Math.round(rect.left + 50), y: Math.round(rect.top + rect.height / 2) };
    `);
    await command('input.performActions', {
      context,
      actions: [{
        type: 'pointer',
        id: 'search-focus',
        parameters: { pointerType: 'mouse' },
        actions: [
          { type: 'pointerMove', ...searchPoint },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      }],
    });
    await command('input.releaseActions', { context });
    assert.equal(await evaluate('return document.activeElement === boardFirstApp.searchInput;'), true,
      'Trusted mouse input focuses desktop Search.');
    await command('browsingContext.setViewport', { context, viewport: { width: 390, height: 900 }, devicePixelRatio: 1 });
    const resizedSearch = await evaluate(`
      await nextFrame();
      const input = boardFirstApp.searchInput;
      return { width: input.getBoundingClientRect().width, focused: document.activeElement === input,
        expanded: document.getElementById('btnOpenSearch').getAttribute('aria-expanded'),
        query: input.value, readOnly: savedRevision() === resizeRevision,
        wrapper: boardFirstApp.searchWrapper.className, focus: document.activeElement.id };
    `);
    assert.equal(resizedSearch.width >= 100 && resizedSearch.focused && resizedSearch.expanded === 'true'
      && resizedSearch.query === 'Keep this search' && resizedSearch.readOnly, true,
      'Focused desktop Search stays usable when resizing to mobile: ' + JSON.stringify(resizedSearch));
    const expandedSearchShot = await command('browsingContext.captureScreenshot', { context });
    await writeFile(resolve(artifacts, 'search-resized-390.png'), Buffer.from(expandedSearchShot.data, 'base64'));
    await command('browsingContext.setViewport', { context, viewport: { width: 1440, height: 900 }, devicePixelRatio: 1 });
    await command('browsingContext.setViewport', { context, viewport: { width: 430, height: 900 }, devicePixelRatio: 1 });
    assert.equal(await evaluate(`
      await nextFrame();
      const fits = boardFirstApp.searchInput.getBoundingClientRect().width >= 100
        && boardFirstApp.searchInput.value === 'Keep this search' && savedRevision() === resizeRevision;
      boardFirstApp.closeMobileSearch();
      return fits;
    `), true, 'Expanded Search survives desktop/mobile resizing without workspace writes.');
    await command('browsingContext.navigate', { context, url: origin + '/trackers/?tracker=other', wait: 'complete' });
    let redirected = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      redirected = await evaluate('return location.pathname === "/board/" && location.search === "?tracker=other";');
      if (redirected) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(redirected, true,
      'Legacy static route redirects without losing explicit selection.');
    assert.equal(await evaluate(`
      const { TrackerApp } = await import('/js/main/main.js');
      const { Storage } = await import('/js/storage/storage.js');
      window.managementApp = new TrackerApp();
      const before = Storage.load().revision;
      managementApp.openJobSearchDialog('create');
      document.querySelector('dialog[open][data-job-search-action] input').value = 'Canceled';
      document.querySelector('dialog[open][data-job-search-action] button[type="button"]').click();
      if (Storage.load().revision !== before) return false;
      managementApp.openJobSearchDialog('create');
      document.querySelector('dialog[open][data-job-search-action] input').value = 'Internship Search';
      document.querySelector('dialog[open][data-job-search-action] form').requestSubmit();
      if (managementApp.getTracker().title !== 'Internship Search'
        || managementApp.getTracker().rows.length !== 0 || Storage.load().revision !== before + 1) return false;
      const id = managementApp.state.active;
      managementApp.openJobSearchDialog('rename', id);
      document.querySelector('dialog[open][data-job-search-action] input').value = 'Renamed Search';
      document.querySelector('dialog[open][data-job-search-action] form').requestSubmit();
      if (managementApp.state.active !== id || managementApp.getTracker().title !== 'Renamed Search') return false;
      managementApp.changeJobSearch('duplicate', { key: id });
      const copyId = managementApp.state.active;
      if (copyId === id || managementApp.getTracker().title !== 'Renamed Search (copy)') return false;
      managementApp.openJobSearchDialog('delete', copyId);
      document.querySelector('dialog[open][data-job-search-action] button[type="button"]').click();
      if (!managementApp.state.data[copyId]) return false;
      managementApp.openJobSearchDialog('delete', copyId);
      document.querySelector('dialog[open][data-job-search-action] form').requestSubmit();
      return !managementApp.state.data[copyId] && Boolean(managementApp.getTracker());
    `), true, 'Management dialogs cancel safely, save once, and preserve identities.');
    assert.equal(await evaluate(`
      const { Storage } = await import('/js/storage/storage.js');
      managementApp.changeJobSearch('create', { title: 'Form search' });
      managementApp.setBoardView('kanban');
      managementApp.updateStatusOption(0, { label: 'Wishlist' });
      const before = Storage.load().revision;
      const guide = document.querySelector('.kanban-guide-card');
      if (!guide || guide.draggable || guide.querySelector('button, select, [data-row-index]')
        || !guide.closest('[data-kanban-status="Wishlist"]')
        || document.querySelector('#listCards [data-row-index]')
        || managementApp.getTracker().rows.length !== 0
        || JSON.stringify(managementApp.getTracker()).includes('Company Name')) return false;
      managementApp.openAddApplication();
      const form = document.querySelector('[data-add-application][open] form');
      const company = form.querySelector('[data-field-key="0"]');
      const position = form.querySelector('[data-field-key="1"]');
      const status = form.querySelector('[data-field-key="3"]');
      if (company.value !== '' || position.value !== '' || !company.placeholder || !position.placeholder
        || ![...status.options].some(option => option.value === 'Wishlist')) return false;
      company.value = 'Canceled input';
      form.querySelector('button[type="button"]').click();
      if (Storage.load().revision !== before || managementApp.getTracker().rows.length !== 0) return false;
      managementApp.openAddApplication();
      const next = document.querySelector('[data-add-application][open] form');
      next.querySelector('[data-field-key="0"]').value = 'Real Company';
      next.querySelector('[data-field-key="1"]').value = 'Actual Role';
      next.querySelector('[data-field-key="3"]').value = 'Wishlist';
      next.requestSubmit();
      if (managementApp.getTracker().rows.length !== 1 || Storage.load().revision !== before + 1
        || document.querySelector('.kanban-guide-card')
        || !document.querySelector('#listCards [data-row-index="0"]').textContent.includes('Real Company')) return false;
      managementApp.openListEditModal(0);
      const filled = document.querySelector('#listEditFields [data-field-key="0"]').value === 'Real Company';
      managementApp.closeListEditModal();
      managementApp.deleteRowAt(0);
      return filled && Boolean(document.querySelector('.kanban-guide-card'));
    `), true, 'Guide stays out of data; Add placeholders/cancel/save and Edit prefill stay correct.');
    for (const theme of ['dark', 'light']) {
      for (const width of [390, 430, 768, 1024, 1440, 1920]) {
        await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
        assert.equal(await evaluate(`
          document.documentElement.classList.toggle('dark', ${theme === 'dark'});
          managementApp.openAddApplication();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const dialog = document.querySelector('[data-add-application][open]');
          const bounds = dialog.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0
            && bounds.bottom <= innerHeight && dialog.scrollWidth <= dialog.clientWidth;
        `), true, 'Add dialog fits ' + theme + ' ' + width);
        const shot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, `${theme}-${width}-add.png`), Buffer.from(shot.data, 'base64'));
        await evaluate('document.querySelector("[data-add-application][open]").close();');
        const boardShot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, `${theme}-${width}-guide.png`), Buffer.from(boardShot.data, 'base64'));
      }
    }
  }
  if (focusedOnly) {
    await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
    await evaluate(`
      const { authService } = await import('/js/auth/firebaseAuth.js');
      await authService.waitForWorkspace();
    `);
  }
  await evaluate(`
    const { Storage } = await import('/js/storage/storage.js');
    const state = Storage.load();
    state.data[state.active].title = 'Private user Job Search';
    state.data[state.active].rows = [['Private Company', 'Private Position', '', 'Wishlist', '', '']];
    Storage.save(state);
  `);
  await command('browsingContext.navigate', { context, url: origin + '/', wait: 'complete' });
  assert.equal(await evaluate(`
    await window.jubroComponentsReady;
    const primary = [...document.querySelectorAll('a.theme-create-button')];
    return primary.length === 3 && primary.every(link => link.pathname === '/board/')
      && document.getElementById('btnOpenModal').textContent.trim() === 'Start for Free'
      && document.querySelector('#heroSection .theme-create-button').textContent.trim() === 'Start Tracking'
      && document.querySelector('.landing-final-cta .theme-create-button').textContent.trim() === 'Create My Job Search'
      && document.querySelector('#heroSection a[href="#how-it-works"]').textContent.trim() === 'See How It Works'
      && Boolean(document.getElementById('how-it-works'))
      && !document.querySelector('a[href^="/trackers"]');
  `), true, 'Contextual landing CTAs keep the same guest-first Board route and workflow anchor.');
  assert.deepEqual(await evaluate(`
    const navigation = document.querySelector('nav[aria-label="Primary navigation"]');
    return [...navigation.querySelectorAll('a')].map(link => link.textContent.trim());
  `), ['Home', 'Features', 'How It Works', 'About'], 'Public navigation has exactly four informational links.');
  assert.equal(await evaluate(`
    const heroImg = document.getElementById('heroProductImage');
    const featureLink = document.querySelector('[data-nav-link="features"]');
    window.marketingPreview = () => ({
      src: heroImg.getAttribute('src'),
      alt: heroImg.getAttribute('alt'),
      visible: getComputedStyle(heroImg).display !== 'none',
    });
    const expected = {
      src: '/img/hero.png',
      alt: 'Jubro job application Kanban board showing applications across job-search stages',
      visible: true,
    };
    window.staticMarketingSnapshot = JSON.stringify(expected);
    const { Storage } = await import('/js/storage/storage.js');
    const before = JSON.stringify(Storage.load());
    document.dispatchEvent(new Event('tracker:sync-complete'));
    document.dispatchEvent(new Event('tracker:sync-error'));
    return JSON.stringify(marketingPreview()) === staticMarketingSnapshot
      && JSON.stringify(Storage.load()) === before
      && Boolean(document.querySelector(featureLink.hash))
      && !document.body.textContent.includes('Private Company');
  `), true, 'Static demo never renders private data or changes on sync events.');
  assert.equal(await evaluate(`
    const firebase = await import('/test/fixtures/firebase.mjs');
    const { firebaseTrackerSync } = await import('/js/storage/firebaseTrackerSync.js');
    const load = firebaseTrackerSync.loadFirebaseState;
    firebaseTrackerSync.loadFirebaseState = async () => { throw new Error('Account temporarily unavailable'); };
    await firebase.__emitAuth({ uid: 'landing-unavailable', email: 'landing@example.test' });
    const unchanged = JSON.stringify(marketingPreview()) === staticMarketingSnapshot;
    firebaseTrackerSync.loadFirebaseState = load;
    await firebase.__emitAuth(null);
    return unchanged && JSON.stringify(marketingPreview()) === staticMarketingSnapshot;
  `), true, 'Account loading failure and logout cannot change static marketing content.');
  assert.equal(await evaluate(`
    const { Storage } = await import('/js/storage/storage.js');
    const before = JSON.stringify(Storage.load());
    const wasDark = document.documentElement.classList.contains('dark');
    document.getElementById('btnGuestTheme').click();
    const switched = document.documentElement.classList.contains('dark') !== wasDark;
    document.getElementById('btnGuestTheme').click();
    return switched && document.documentElement.classList.contains('dark') === wasDark
      && JSON.stringify(Storage.load()) === before;
  `), true, 'Theme control switches immediately without changing workspace data.');
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      assert.equal(await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(document.getAnimations().map(animation => animation.finished));
        const body = getComputedStyle(document.body);
        const frame = getComputedStyle(document.querySelector('.landing-hero-visual > div'));
        const navbar = getComputedStyle(document.getElementById('siteNavbar'));
        const footer = getComputedStyle(document.querySelector('footer'));
        if (document.documentElement.classList.contains('dark')) {
          return body.backgroundColor === 'rgb(11, 17, 32)'
            && frame.backgroundColor === 'rgb(31, 41, 55)';
        }
        function luminance(color) {
          const channels = color.match(/[\\d.]+/g).slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        }
        function readable(selector, background) {
          const foreground = luminance(getComputedStyle(document.querySelector(selector)).color);
          const surface = luminance(background);
          return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05) >= 4.5;
        }
        const secondary = getComputedStyle(document.querySelector('#heroSection a[href="#how-it-works"]'));
        return body.backgroundColor === 'rgb(244, 245, 247)'
          && navbar.backgroundColor === 'rgb(250, 250, 251)'
          && footer.backgroundColor === 'rgb(250, 250, 251)'
          && frame.borderTopColor === 'rgb(229, 231, 235)'
          && frame.backgroundColor === 'rgb(248, 249, 250)'
          && readable('#heroSection h1', body.backgroundColor)
          && readable('.landing-hero-copy > p', body.backgroundColor)
          && readable('[data-nav-link="features"]', navbar.backgroundColor)
          && readable('#heroSection a[href="#how-it-works"]', secondary.backgroundColor)
          && readable('#heroSection .theme-create-button', getComputedStyle(document.querySelector('#heroSection .theme-create-button')).backgroundColor);
      `), true, 'Theme surfaces and light text contrast remain readable ' + theme + ' ' + width);
      assert.equal(await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const heroImg = document.getElementById('heroProductImage');
        const phone = document.querySelector('#about img');
        phone.loading = 'eager';
        await Promise.all([heroImg.decode(), phone.decode()]);
        const rect = heroImg.getBoundingClientRect();
        const phoneRect = phone.getBoundingClientRect();
        const phoneCap = innerWidth < 640 ? 208 : innerWidth < 1024 ? 240 : 280;
        const about = document.querySelector('#about > div');
        const columns = getComputedStyle(about).gridTemplateColumns.split(' ').length;
        const benefits = document.querySelector('.landing-benefits');
        const benefitRows = [...benefits.children].map(item => item.getBoundingClientRect());
        const cta = getComputedStyle(document.querySelector('.landing-final-cta .theme-create-button'));
        const ctaCard = document.querySelector('.landing-final-cta').getBoundingClientRect();
        const features = document.getElementById('features').getBoundingClientRect();
        const onlineJobs = document.createElement('span');
        const otherPlatform = document.createElement('span');
        onlineJobs.className = 'favicon-holder favicon-holder-onlinejobs';
        otherPlatform.className = 'favicon-holder';
        document.body.append(onlineJobs, otherPlatform);
        const faviconColorsMatch = getComputedStyle(onlineJobs).backgroundColor === 'rgb(255, 255, 255)'
          && getComputedStyle(otherPlatform).backgroundColor === 'rgb(0, 0, 0)';
        onlineJobs.remove();
        otherPlatform.remove();
        return rect.left >= 0 && rect.right <= innerWidth
          && Math.abs(ctaCard.left - features.left) < 1
          && Math.abs(ctaCard.right - features.right) < 1
          && faviconColorsMatch
          && benefitRows.slice(1).every((row, index) => Math.abs(row.top - benefitRows[index].bottom - 14) < 1)
          && parseFloat(cta.paddingLeft) >= 32 && parseFloat(cta.paddingRight) >= 32
          && rect.width <= 1120 && rect.width > 0
          && document.querySelectorAll('img[src="/img/hero.png"]').length === 1
          && Boolean(heroImg.closest('#heroSection'))
          && phoneRect.width > 0 && phoneRect.width <= phoneCap
          && Math.abs(phoneRect.height / phoneRect.width - 2) < 0.01
          && Math.abs(rect.width / rect.height - 1672 / 941) < 0.01
          && columns === (innerWidth < 1024 ? 1 : 2)
          && document.documentElement.scrollWidth <= innerWidth
          && JSON.stringify(marketingPreview()) === staticMarketingSnapshot;
      `), true, 'Static landing preview fits ' + theme + ' ' + width);
      const storytelling = await evaluate(`
        const failures = [];
        function check(condition, message) {
          if (!condition) failures.push(message);
        }
        function contrast(foreground, background) {
          function luminance(color) {
            const channels = color.match(/[\\d.]+/g).slice(0, 3).map(Number).map(value => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          }
          const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
          return (values[1] + 0.05) / (values[0] + 0.05);
        }
        const page = getComputedStyle(document.body).backgroundColor;
        const steps = [...document.querySelectorAll('.landing-steps > div')];
        check(steps.length === 3, 'Three steps remain visible');
        for (const step of steps) {
          const number = getComputedStyle(step.querySelector('span'));
          const title = getComputedStyle(step.querySelector('h3'));
          const divider = getComputedStyle(step);
          check(parseFloat(number.fontSize) < parseFloat(title.fontSize), 'Step titles dominate numbers');
          check(contrast(number.color, page) >= 4.5, 'Small step numbers remain readable');
          check(parseFloat(divider.borderTopWidth) <= 1, 'Step dividers stay thin');
          check(divider.borderTopColor.startsWith('rgba('), 'Step dividers use a translucent accent');
        }
        const section = document.getElementById('why-jubro');
        const cards = [...section.querySelectorAll('article')];
        check(cards.length === 2, 'Comparison uses two independent cards');
        check(section.getBoundingClientRect().width <= 1100, 'Comparison stays compact');
        if (cards.length === 2) {
          const bounds = cards.map(card => card.getBoundingClientRect());
          const labels = cards.map(card => card.querySelector('p').textContent.trim());
          check(labels[0] === 'THE OLD WAY' && labels[1] === 'THE JUBRO WAY', 'Narrative card order remains clear');
          check(Math.abs(bounds[0].width - bounds[1].width) < 1, 'Cards share equal widths');
          check(Math.abs(bounds[0].height - bounds[1].height) < 1, 'Cards share equal heights');
          check(innerWidth < 768
            ? bounds[1].top >= bounds[0].bottom + 19.5
            : Math.abs(bounds[0].top - bounds[1].top) < 1 && bounds[1].left >= bounds[0].right + 23.5,
          'Cards stack on mobile and sit side by side on tablet/desktop: '
            + JSON.stringify(bounds.map(rect => ({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }))));
          for (const card of cards) {
            const surface = getComputedStyle(card);
            check(surface.textAlign === 'left', 'Card contents stay left aligned');
            check(parseFloat(surface.paddingLeft) >= 20 && parseFloat(surface.paddingLeft) <= 32, 'Card padding stays compact');
            check(card.querySelectorAll('li').length === 5, 'Each card has five concise points');
            for (const selector of ['p', 'h3', 'li']) {
              check(contrast(getComputedStyle(card.querySelector(selector)).color, surface.backgroundColor) >= 4.5,
                'Card labels, titles and body text remain readable');
            }
          }
          check(cards[0].querySelectorAll('i').length === 0, 'Old Way has no repeated X icons');
          const checks = [...cards[1].querySelectorAll('li i')];
          check(checks.length === 5 && checks.every(icon => parseFloat(getComputedStyle(icon).fontSize) <= 14
            && icon.getAttribute('aria-hidden') === 'true'), 'Jubro checks stay small and decorative');
          const titleColor = getComputedStyle(cards[1].querySelector('h3')).color.match(/[\\d.]+/g).slice(0, 3).map(Number);
          check(Math.max(...titleColor) - Math.min(...titleColor) < 50, 'Jubro title uses neutral text, not saturated blue');
        }
        return failures;
      `);
      assert.deepEqual(storytelling, [], 'Calm landing steps and comparison ' + theme + ' ' + width);
      if (width < 1024) {
        const mobileNav = await evaluate(`
          const menuBtn = document.getElementById('btnMobileMenu');
          if (menuBtn && menuBtn.getAttribute('aria-expanded') !== 'true') {
            menuBtn.click();
            await new Promise(resolve => requestAnimationFrame(resolve));
          }
          const btnSignIn = document.getElementById('btnSignIn');
          const btnOpenModal = document.getElementById('btnOpenModal');
          const signInRect = btnSignIn.getBoundingClientRect();
          const openRect = btnOpenModal.getBoundingClientRect();
          const isFullWidth = Math.abs(signInRect.width - openRect.width) <= 2;
          menuBtn.click();
          return { isFullWidth, signInWidth: signInRect.width, openWidth: openRect.width };
        `);
        assert.equal(mobileNav.isFullWidth, true, 'Mobile nav sign in button is full width ' + theme + ' ' + width + ': ' + JSON.stringify(mobileNav));
      }
      if (width >= 1024) {
        const navigation = await evaluate(`
          const navbar = document.getElementById('siteNavbar');
          navbar.classList.add('is-scrolled');
          navbar.classList.remove('is-hidden');
          await Promise.all(navbar.getAnimations().map(animation => animation.finished));
          const controls = [...navbar.querySelectorAll('nav a'),
            document.getElementById('btnOpenModal'), document.getElementById('btnSignIn'),
            document.getElementById('btnGuestTheme')];
          const rects = controls.map(control => control.getBoundingClientRect()).sort((a, b) => a.left - b.left);
          return { fits: rects.every((rect, index) => rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth
            && (index === 0 || rect.left >= rects[index - 1].right - 1)),
            rects: rects.map(rect => ({ left: rect.left, right: rect.right })) };
        `);
        assert.equal(navigation.fits, true, 'Scrolled public navigation fits ' + theme + ' ' + width + ': ' + JSON.stringify(navigation));
      }
      assert.equal(await evaluate(`
        window.scrollTo(0, 0);
        const navbar = document.getElementById('siteNavbar');
        navbar.classList.remove('is-hidden');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(navbar.getAnimations().map(animation => animation.finished));
        return document.querySelector('#heroSection h1').getBoundingClientRect().top
          >= navbar.getBoundingClientRect().bottom;
      `), true, 'Navbar does not cover headline ' + theme + ' ' + width);
      const previewShot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-marketing.png`), Buffer.from(previewShot.data, 'base64'));
      const fullShot = await command('browsingContext.captureScreenshot', { context, origin: 'document' });
      await writeFile(resolve(artifacts, `${theme}-${width}-full.png`), Buffer.from(fullShot.data, 'base64'));
      for (const section of ['how-it-works', 'why-jubro']) {
        await evaluate(`
          document.getElementById('${section}').scrollIntoView({ block: 'start', behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        `);
        const sectionShot = await command('browsingContext.captureScreenshot', { context });
        await writeFile(resolve(artifacts, `${theme}-${width}-${section}.png`), Buffer.from(sectionShot.data, 'base64'));
      }
      await evaluate('document.getElementById("about").scrollIntoView({ block: "start" });');
      const aboutShot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-about.png`), Buffer.from(aboutShot.data, 'base64'));
      const ctaPointer = await evaluate(`
        const card = document.querySelector('.landing-final-cta');
        card.scrollIntoView({ block: 'center' });
        const bounds = card.getBoundingClientRect();
        return { x: Math.round(bounds.left + bounds.width / 2), y: Math.round(bounds.top + bounds.height / 2) };
      `);
      await command('input.performActions', { context, actions: [{
        type: 'pointer', id: 'cta-mouse', parameters: { pointerType: 'mouse' },
        actions: [{ type: 'pointerMove', ...ctaPointer, duration: 0 }],
      }] });
      const ctaMotion = await evaluate(`
        const card = document.querySelector('.landing-final-cta');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(card.getAnimations().map(animation => animation.finished));
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const transform = getComputedStyle(card).transform;
        const result = reducedMotion ? transform === 'none' : transform === 'matrix(1, 0, 0, 1, 0, -3)';
        return { result, transform, reducedMotion };
      `);
      assert.equal(ctaMotion.result, true, 'CTA hover animation respects motion preference '
        + theme + ' ' + width + ': ' + JSON.stringify(ctaMotion));
      await command('input.performActions', { context, actions: [{
        type: 'pointer', id: 'cta-mouse', parameters: { pointerType: 'mouse' },
        actions: [{ type: 'pointerMove', x: 0, y: 0, duration: 0 }],
      }] });
    }
  }
  if (!focusedOnly) {
    await command('browsingContext.navigate', { context, url: origin + '/board/?tracker=other', wait: 'complete' });
    assert.equal(await evaluate(`
      const { authService } = await import('/js/auth/firebaseAuth.js');
      const { JSONService } = await import('/js/services/jsonService.js');
      const { Storage } = await import('/js/storage/storage.js');
      await authService.waitForWorkspace();
      const before = Storage.load().revision;
      const payload = {
        columns: [{ name: 'Company', type: 'text' }, { name: 'Status', type: 'select', options: ['Imported'] }],
        rows: [['Imported Company', 'Imported']],
      };
      JSONService.prototype.chooseJsonFile = async () => new File([JSON.stringify(payload)], 'search.json', { type: 'application/json' });
      window.confirm = () => true;
      window.importAlerts = [];
      window.alert = message => importAlerts.push(message);
      document.getElementById('btnImport').click();
      for (let attempt = 0; attempt < 30 && Storage.load().revision === before; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const saved = Storage.load();
      return saved.revision === before + 1 && saved.data.other.rows[0][0].value === 'Imported Company'
        && document.getElementById('jobSearchSelector').textContent.includes('Other search')
        && document.querySelector('.kanban-card').textContent.includes('Imported Company')
        && importAlerts.length === 0;
    `), true, 'Existing Board import validates and refreshes one canonical search.');
    assert.equal(await evaluate(`
      const { JSONService } = await import('/js/services/jsonService.js');
      const { Storage } = await import('/js/storage/storage.js');
      let resume;
      JSONService.prototype.chooseJsonFile = () => new Promise(resolve => { resume = resolve; });
      document.getElementById('btnImport').click();
      document.getElementById('jobSearchSelector').click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      document.querySelector('#jobSearchDropdown [aria-current="false"]').click();
      const before = JSON.stringify(Storage.load());
      resume(new File([JSON.stringify({ columns: [{ name: 'Company', type: 'text' }], rows: [['Wrong search']] })], 'stale.json'));
      await new Promise(resolve => setTimeout(resolve, 150));
      return JSON.stringify(Storage.load()) === before && importAlerts.length > 0;
    `), true, 'An import started in a previous search cannot overwrite the new active search.');
    assert.equal(await evaluate(`
      const firebase = await import('/test/fixtures/firebase.mjs');
      const { Storage } = await import('/js/storage/storage.js');
      const { firebaseTrackerSync } = await import('/js/storage/firebaseTrackerSync.js');
      const load = firebaseTrackerSync.loadFirebaseState;
      firebaseTrackerSync.loadFirebaseState = async () => { throw new Error('Account temporarily unavailable'); };
      await firebase.__emitAuth({ uid: 'unavailable-account', email: 'unavailable@example.test' });
      const panel = document.getElementById('workspaceRetry');
      const rect = panel.getBoundingClientRect();
      const safe = Object.keys(Storage.load().data).length === 0 && !panel.hidden
        && document.getElementById('appNavbar').hidden && panel.querySelector('button').textContent === 'Retry'
        && rect.left >= 0 && rect.right <= innerWidth;
      firebaseTrackerSync.loadFirebaseState = load;
      await firebase.__emitAuth(null);
      return safe && !document.getElementById('appNavbar').hidden;
    `), true, 'Failed empty account loading never creates data and shows an accessible Retry.');
    assert.equal(await evaluate(`
      const firebase = await import('/test/fixtures/firebase.mjs');
      await firebase.__emitAuth(null);
      const guestBtn = document.getElementById('btnGuestSettings');
      const userBtn = document.getElementById('btnUserAccount');
      const dropdown = document.getElementById('boardTopNavDropdown');
      const userHeader = document.getElementById('dropdownUserHeader');
      const logoutWrap = document.getElementById('dropdownLogoutWrapper');
      const homeLink = document.getElementById('btnNavHome');
      const topNavbar = document.getElementById('boardTopNavbar');
      const brandLink = topNavbar.querySelector('a');

      const guestInitialOk = !guestBtn.classList.contains('hidden')
        && userBtn.classList.contains('hidden')
        && brandLink.getAttribute('href') === '/'
        && homeLink.getAttribute('href') === '/'
        && !document.body.textContent.includes('Back to Home');

      guestBtn.click();
      const guestOpenOk = !dropdown.classList.contains('hidden')
        && guestBtn.getAttribute('aria-expanded') === 'true'
        && userHeader.classList.contains('hidden')
        && logoutWrap.classList.contains('hidden');

      document.getElementById('boardWorkspace').click();
      const guestOutsideClickCloseOk = dropdown.classList.contains('hidden')
        && guestBtn.getAttribute('aria-expanded') === 'false';

      guestBtn.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const guestCloseOk = dropdown.classList.contains('hidden')
        && guestBtn.getAttribute('aria-expanded') === 'false';

      await firebase.__emitAuth({ uid: 'test-user-456', email: 'noname@example.test', displayName: '' });
      const noNameFallbackOk = document.getElementById('userAccountLabel').textContent === 'Account'
        && document.getElementById('dropdownUserName').textContent === 'Account';

      await firebase.__emitAuth({ uid: 'test-user-123', email: 'jb@example.test', displayName: 'JB Villegas' });
      const signedInVisibleOk = guestBtn.classList.contains('hidden')
        && !userBtn.classList.contains('hidden')
        && document.getElementById('userAccountLabel').textContent === 'JB Villegas';

      userBtn.click();
      const signedInOpenOk = !dropdown.classList.contains('hidden')
        && userBtn.getAttribute('aria-expanded') === 'true'
        && !userHeader.classList.contains('hidden')
        && document.getElementById('dropdownUserName').textContent === 'JB Villegas'
        && document.getElementById('dropdownUserEmail').textContent === 'jb@example.test'
        && !logoutWrap.classList.contains('hidden');

      document.getElementById('btnNavLogout').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      const signedOutOk = !guestBtn.classList.contains('hidden')
        && userBtn.classList.contains('hidden')
        && dropdown.classList.contains('hidden');

      return guestInitialOk && guestOpenOk && guestOutsideClickCloseOk && guestCloseOk && noNameFallbackOk && signedInVisibleOk && signedInOpenOk && signedOutOk;
    `), true, 'Board Main Navbar consolidates global actions, toggles guest/signed-in state, and manages accessible menu.');
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, artifacts, themes: 2, widths: 6,
    entryOnly: Boolean(process.env.JUBRO_ENTRY_ONLY),
    surfacesOnly: Boolean(process.env.JUBRO_SURFACES_ONLY),
    transferOnly: Boolean(process.env.JUBRO_TRANSFER_ONLY),
    authOnly: Boolean(process.env.JUBRO_AUTH_ONLY),
    toolbarWidths: process.env.JUBRO_TOOLBAR_ONLY ? 7 : undefined,
    nextActionOnly: Boolean(process.env.JUBRO_NEXT_ACTION_ONLY),
    colorOnly: Boolean(process.env.JUBRO_COLOR_ONLY),
    listGuideOnly: Boolean(process.env.JUBRO_LIST_GUIDE_ONLY),
    landingOnly: Boolean(process.env.JUBRO_LANDING_ONLY), errors }));
} finally {
  socket?.close();
  server?.close();
  browser.kill('SIGTERM');
}
