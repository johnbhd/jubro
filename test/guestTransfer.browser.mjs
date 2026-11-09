// Invoked through JUBRO_TRANSFER_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyGuestTransfer({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: 'guest', ownerType: 'guest', ownerId: null, revision: 5,
      data: { guest: {
        id: 'guest', title: 'Guest Search',
        columns: [{ name: 'Company', type: 'text' }], rows: [['Guest Company']],
      } },
    }));
  `);

  async function openPage(path) {
    await command('browsingContext.navigate', { context, url: origin + path, wait: 'complete' });
    await evaluate(`
      const { authService } = await import('/js/auth/firebaseAuth.js');
      await authService.waitForWorkspace();
      window.transferAuth = authService;
      window.transferFirebase = await import('/test/fixtures/firebase.mjs');
      window.transferUser = { uid: 'transfer-account', email: 'transfer@example.test' };
      const cached = JSON.parse(localStorage.getItem('flextracker_data_account_transfer-account'));
      transferFirebase.__setDocument('trackerData/transfer-account', {
        active: 'account', ownerType: 'account', ownerId: transferUser.uid,
        revision: cached?.cloudRevision || 1,
        data: JSON.stringify({ account: {
          id: 'account', title: 'Account Search',
          columns: [{ name: 'Company', type: 'text' }], rows: [['Account Company']],
        } }),
      });
      window.confirm = () => { throw new Error('Native confirm must never run'); };
      window.transferStart = () => {
        window.transferPending = transferFirebase.__emitAuth(transferUser);
      };
    `);
  }

  await openPage('/board/');
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 1440]) {
      await command('browsingContext.setViewport', {
        context, viewport: { width, height: 900 }, devicePixelRatio: 1,
      });
      await evaluate(`
        await transferAuth.logout();
        const { Storage } = await import('/js/storage/storage.js');
        const guest = Storage.load();
        guest.data.guest.title += ' new';
        Storage.save(guest);
        window.transferGuestBefore = localStorage.getItem('flextracker_data');
        document.documentElement.classList.toggle('dark', ${JSON.stringify(theme)} === 'dark');
        transferStart();
      `);
      const modalState = await evaluate(`
        for (let attempt = 0; attempt < 60; attempt += 1) {
          const modal = document.getElementById('syncConflictModal');
          if (modal?.getAttribute('aria-hidden') === 'false') break;
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        const modal = document.getElementById('syncConflictModal');
        const panel = modal.firstElementChild.getBoundingClientRect();
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        modal.click();
        document.body.querySelector('button').focus();
        const trapped = document.activeElement.id === 'btnSyncChoiceCancel';
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        const tabbed = document.activeElement.id === 'btnSyncChoiceConfirm';
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
        return {
          visible: modal.getAttribute('aria-hidden') === 'false',
          dialog: modal.getAttribute('role') === 'dialog',
          modal: modal.getAttribute('aria-modal') === 'true',
          focused: document.activeElement.id,
          trapped, tabbed,
          fits: panel.left >= 0 && panel.right <= innerWidth,
          count: document.querySelectorAll('#syncConflictModal').length,
        };
      `);
      assert.deepEqual(modalState, {
        visible: true, dialog: true, modal: true,
        focused: 'btnSyncChoiceCancel', trapped: true, tabbed: true,
        fits: true, count: 1,
      }, theme + ' ' + width + ': one accessible modal fits and requires an explicit choice');

      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-transfer.png`), Buffer.from(shot.data, 'base64'));

      assert.equal(await evaluate(`
        document.getElementById('btnSyncChoiceCancel').click();
        document.getElementById('btnSyncChoiceConfirm').click();
        await transferPending;
        const { Storage } = await import('/js/storage/storage.js');
        return localStorage.getItem('flextracker_data') === transferGuestBefore
          && Object.keys(Storage.load().data).join() === 'account'
          && JSON.parse(localStorage.getItem('jubro_guest_transfer_decision_transfer-account')).decision === 'keep-account';
      `), true, 'Keep Account Only persists without transferring or deleting guest data');
    }
  }

  // Each navigation creates a fresh Firebase fixture instance; restore its signed-in account explicitly.
  for (const path of ['/', '/board/', '/board/', '/']) {
    await openPage(path);
    assert.equal(await evaluate(`
      transferStart();
      const resolved = await Promise.race([
        transferPending.then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 1000)),
      ]);
      return resolved && !document.querySelector('#syncConflictModal[aria-hidden="false"]');
    `), true, 'Remembered decision survives fresh page startup: ' + path);
  }

  await openPage('/board/');
  assert.equal(await evaluate(`
    transferStart();
    await transferPending;
    const { TrackerApp } = await import('/js/main/main.js');
    const app = new TrackerApp();
    app.setBoardView('list');
    app.openDashboard();
    app.closeDashboard();
    await transferAuth.logout();
    transferStart();
    await transferPending;
    return !document.querySelector('#syncConflictModal[aria-hidden="false"]');
  `), true, 'List, Dashboard, and same-account re-login do not re-prompt');

  await evaluate(`
    await transferAuth.logout();
    const { Storage } = await import('/js/storage/storage.js');
    const guest = Storage.load();
    guest.data.guest.title = 'Bring Guest Search';
    Storage.save(guest);
    transferStart();
  `);
  assert.equal(await evaluate(`
    await new Promise(resolve => requestAnimationFrame(resolve));
    document.getElementById('btnSyncChoiceConfirm').click();
    await transferPending;
    const { Storage } = await import('/js/storage/storage.js');
    return Object.keys(Storage.loadGuest().data).length === 0
      && Object.keys(Storage.load().data).sort().join() === 'account,guest'
      && JSON.parse(localStorage.getItem('jubro_guest_transfer_decision_transfer-account')).decision === 'transferred';
  `), true, 'Bring Guest uses the existing merge and records success after upload');

  // Leave later marketing checks a clean guest workspace.
  await evaluate('await transferAuth.logout(); localStorage.clear();');
}
