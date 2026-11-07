// Run with `node test/statusCustomization.browser.mjs`; requires local Firefox.
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
      if (!path.startsWith(`${root}/`)) throw new Error('Invalid path');
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      let data = await readFile(path);
      if (extname(path) === '.js') {
        data = Buffer.from(data.toString().replace(
          /https:\/\/www\.gstatic\.com\/firebasejs\/12\.12\.1\/firebase-[a-z-]+\.js/g,
          '/test/fixtures/firebase.mjs',
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
  await command('browsingContext.navigate', { context, url: `${origin}/blank`, wait: 'complete' });
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
      && document.querySelector('dialog[open] [role="alert"]').textContent.includes('reloaded');
    document.querySelector('dialog[open]').close();
    await nextFrame();
    openAction(0, 'Rename status');
    statusApp.reloadStateFromStorage();
    submitDialog();
    const replaced = document.querySelector('dialog[open] [role="alert"]').textContent.includes('tracker changed');
    document.querySelector('dialog[open]').close();
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
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, artifacts, themes: 2, widths: 6, mouseDropCompleted, browserInputChecks: 4, errors }));
} finally {
  socket?.close();
  server?.close();
  browser.kill('SIGTERM');
}
