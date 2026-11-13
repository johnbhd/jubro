import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyWorkspaceLoading({ command, evaluate, context, origin, artifacts }) {
  const preload = await command('script.addPreloadScript', {
    functionDeclaration: `() => {
      window.workspaceAuthGate = new Promise(resolve => {
        window.releaseWorkspaceAuth = resolve;
      });
    }`,
    contexts: [context],
  });

  try {
    for (const theme of ['dark', 'light']) {
      for (const view of ['kanban', 'list']) {
        await command('browsingContext.navigate', { context, url: origin + '/blank', wait: 'complete' });
        await evaluate(`
          localStorage.clear();
          localStorage.setItem('jubro_theme', ${JSON.stringify(theme)});
          localStorage.setItem('jubro_board_view', ${JSON.stringify(view)});
          localStorage.setItem('flextracker_data', JSON.stringify({
            active: 'loading-test', ownerType: 'guest', ownerId: null, revision: 1,
            data: { 'loading-test': {
              id: 'loading-test', title: 'Loading test',
              columns: [
                { name: 'Company', type: 'text' },
                { name: 'Position', type: 'text' },
                { name: 'Status', type: 'select', options: ['Applied', 'Interview'] },
              ],
              rows: [['Real company', 'Developer', 'Applied']],
            } },
          }));
        `);
        const snapshot = await evaluate('return localStorage.getItem("flextracker_data");');
        await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });

        for (const width of [390, 430, 768, 1024, 1440, 1920]) {
          await command('browsingContext.setViewport', {
            context, viewport: { width, height: 900 }, devicePixelRatio: 1,
          });
          const loading = await evaluate(`
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const shell = document.getElementById('workspaceLoading');
            const workspace = document.getElementById('boardWorkspace');
            const toolbar = document.getElementById('appNavbar');
            const card = document.querySelector('.skeleton-application');
            const bar = card.querySelector('.skeleton-bar');
            const shimmer = getComputedStyle(bar, '::after');
            return {
              busy: workspace.getAttribute('aria-busy'),
              loading: document.body.hasAttribute('data-workspace-loading') && !shell.hidden,
              hidden: getComputedStyle(workspace).display === 'none'
                && getComputedStyle(toolbar).display === 'none',
              inert: workspace.inert && toolbar.inert,
              header: getComputedStyle(document.getElementById('boardTopNavbar')).display !== 'none',
              correctView: getComputedStyle(document.querySelector('.skeleton-list')).display
                === (${JSON.stringify(view)} === 'list' ? 'grid' : 'none'),
              columns: shell.querySelectorAll('.skeleton-column').length,
              rows: shell.querySelectorAll('.skeleton-list-row').length,
              safe: !shell.querySelector('button, input, select, a, .kanban-card, .list-view-row'),
              fits: document.documentElement.scrollWidth <= innerWidth,
              reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
              motion: shimmer.animationName,
              duration: shimmer.animationDuration,
              card: getComputedStyle(card).backgroundColor,
              state: localStorage.getItem('flextracker_data'),
            };
          `);
          assert.equal(loading.loading && loading.hidden && loading.inert && loading.header, true);
          assert.equal(loading.busy, 'true');
          assert.equal(loading.correctView && loading.safe && loading.fits, true,
            JSON.stringify({ theme, view, width, loading }));
          assert.equal(loading.columns, 4);
          assert.equal(loading.rows, 4);
          assert.equal(loading.motion, loading.reduced ? 'none' : 'workspaceSkeletonShimmer');
          if (!loading.reduced) {
            assert.equal(loading.duration, '1.8s');
          }
          assert.equal(loading.card, theme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)');
          assert.equal(loading.state, snapshot, 'Loading never writes canonical data');
          const screenshot = await command('browsingContext.captureScreenshot', { context });
          await writeFile(resolve(artifacts, `loading-${theme}-${view}-${width}.png`),
            Buffer.from(screenshot.data, 'base64'));
        }

        assert.equal(await evaluate(`
          const { confirmGuestTransfer } = await import('/js/auth/syncChoice.js');
          window.loadingTransferChoice = confirmGuestTransfer({
            guestState: JSON.parse(localStorage.getItem('flextracker_data')),
            accountState: { data: { account: {} } },
          });
          await new Promise(resolve => requestAnimationFrame(resolve));
          const button = document.getElementById('btnSyncChoiceCancel');
          const usable = !button.closest('[inert]')
            && getComputedStyle(document.getElementById('syncConflictModal')).display !== 'none';
          button.click();
          await window.loadingTransferChoice;
          return usable && document.body.hasAttribute('data-workspace-loading');
        `), true, 'The shared transfer dialog remains usable above loading placeholders');

        const ready = await evaluate(`
          window.releaseWorkspaceAuth();
          const deadline = performance.now() + 5000;
          while (document.body.hasAttribute('data-workspace-loading') && performance.now() < deadline) {
            await new Promise(resolve => requestAnimationFrame(resolve));
          }
          return {
            ready: !document.body.hasAttribute('data-workspace-loading'),
            hidden: document.getElementById('workspaceLoading').hidden,
            busy: document.getElementById('boardWorkspace').getAttribute('aria-busy'),
            view: document.getElementById('boardViewSelect').value,
            state: localStorage.getItem('flextracker_data'),
          };
        `);
        assert.equal(ready.ready && ready.hidden, true);
        assert.equal(ready.busy, 'false');
        assert.equal(ready.view, view);
        assert.equal(ready.state, snapshot, 'Settling a valid guest workspace does not resave applications');
        console.log('Skeleton startup verified:', theme, view);
      }
    }
  } finally {
    await command('script.removePreloadScript', { script: preload.script });
  }

  assert.equal(await evaluate(`
    const mutations = [];
    const observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-workspace-loading'] });
    document.querySelector('[data-board-view-button="kanban"]').click();
    document.querySelector('[data-board-view-button="list"]').click();
    document.dispatchEvent(new CustomEvent('tracker:sync-complete'));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    observer.disconnect();
    return mutations.length === 0;
  `), true, 'Instant view switches and background sync never show a skeleton');

  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    const firebase = await import('/test/fixtures/firebase.mjs');
    window.loadingAuthService = authService;
    window.loadingFirebase = firebase;
    window.loadingPrepareWorkspace = authService.prepareWorkspace;
    window.loadingAccountGate = new Promise(resolve => { window.finishLoadingAccount = resolve; });
    authService.prepareWorkspace = async function (user) {
      if (user?.uid === 'loading-account') {
        await window.loadingAccountGate;
        return;
      }
      return window.loadingPrepareWorkspace.call(this, user);
    };
    window.accountLoad = firebase.__emitAuth({ uid: 'loading-account', email: 'loading@example.test' });
    return true;
  `);
  assert.equal(await evaluate(`
    return document.body.hasAttribute('data-workspace-loading')
      && getComputedStyle(document.getElementById('boardWorkspace')).display === 'none'
      && document.documentElement.dataset.loadingView === 'list';
  `), true, 'Account changes hide previous data and use the saved List skeleton');
  await evaluate(`
    window.finishLoadingAccount();
    await window.accountLoad;
    window.loadingAuthService.prepareWorkspace = window.loadingPrepareWorkspace;
    return true;
  `);
  assert.equal(await evaluate(`
    return !document.body.hasAttribute('data-workspace-loading')
      && !document.getElementById('workspaceRetry').hidden;
  `), true, 'An unresolved account owner displays safe Retry, not old guest data');

  await evaluate(`
    window.loadingRetryGate = new Promise(resolve => { window.finishLoadingRetry = resolve; });
    window.loadingAuthService.prepareWorkspace = async function (user) {
      await window.loadingRetryGate;
      return window.loadingPrepareWorkspace.call(this, user);
    };
    document.querySelector('#workspaceRetry button').click();
    return true;
  `);
  assert.equal(await evaluate(`
    return document.body.hasAttribute('data-workspace-loading')
      && getComputedStyle(document.getElementById('workspaceRetry')).display === 'none';
  `), true, 'Retry shows the same skeleton while the workspace is unresolved');
  assert.equal(await evaluate(`
    window.finishLoadingRetry();
    const deadline = performance.now() + 5000;
    while (document.body.hasAttribute('data-workspace-loading') && performance.now() < deadline) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    window.loadingAuthService.prepareWorkspace = window.loadingPrepareWorkspace;
    return !document.body.hasAttribute('data-workspace-loading')
      && document.getElementById('workspaceRetry').hidden
      && !document.getElementById('boardWorkspace').hidden;
  `), true, 'Retry success replaces placeholders with the resolved account workspace');

  await evaluate(`
    const gates = {};
    window.releaseStaleAccount = {};
    for (const uid of ['stale-a', 'stale-b']) {
      gates[uid] = new Promise(resolve => { window.releaseStaleAccount[uid] = resolve; });
    }
    window.loadingAuthService.prepareWorkspace = async function (user) {
      await gates[user.uid];
    };
    window.staleFirst = window.loadingFirebase.__emitAuth({ uid: 'stale-a' });
    window.staleSecond = window.loadingFirebase.__emitAuth({ uid: 'stale-b' });
    return true;
  `);
  assert.equal(await evaluate(`
    window.releaseStaleAccount['stale-a']();
    await window.staleFirst;
    return document.body.hasAttribute('data-workspace-loading');
  `), true, 'Stale Account A completion cannot dismiss Account B loading');
  await evaluate(`
    window.releaseStaleAccount['stale-b']();
    await window.staleSecond;
    window.loadingAuthService.prepareWorkspace = window.loadingPrepareWorkspace;
    return true;
  `);

  await command('browsingContext.navigate', { context, url: origin + '/blank', wait: 'complete' });
  await evaluate(`
    localStorage.clear();
    localStorage.setItem('jubro_theme', 'light');
    localStorage.setItem('jubro_board_view', 'list');
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  assert.equal(await evaluate(`
    const deadline = performance.now() + 5000;
    while (document.body.hasAttribute('data-workspace-loading') && performance.now() < deadline) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const state = JSON.parse(localStorage.getItem('flextracker_data'));
    return !document.body.hasAttribute('data-workspace-loading')
      && Object.keys(state.data).length === 1
      && state.data[state.active].rows.length === 0
      && document.getElementById('listCards').textContent.includes('EXAMPLE');
  `), true, 'A confirmed empty guest workspace finishes loading with its UI-only List guide');
}
