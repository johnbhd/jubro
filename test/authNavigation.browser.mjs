// Invoked through JUBRO_AUTH_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyAuthNavigation({ command, evaluate, context, origin, artifacts }) {
  async function navigate(path) {
    await command('browsingContext.navigate', { context, url: origin + path, wait: 'complete' });
  }

  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        if (await evaluate('return ' + expression + ';')) return;
      } catch {
        // Normal navigation destroys the previous JavaScript context.
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Timed out waiting for ' + expression);
  }

  await evaluate('localStorage.clear(); sessionStorage.clear();');
  await navigate('/');
  await evaluate('await window.jubroComponentsReady;');
  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', {
        context, viewport: { width, height: 900 }, devicePixelRatio: 1,
      });
      const spacing = await evaluate(`
        document.documentElement.classList.toggle('dark', ${JSON.stringify(theme)} === 'dark');
        const nav = document.getElementById('siteNavbar');
        nav.classList.remove('is-scrolled', 'is-hidden');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(nav.getAnimations().map(animation => animation.finished));
        const style = getComputedStyle(nav);
        const bounds = nav.getBoundingClientRect();
        return {
          padding: parseFloat(style.paddingLeft), vertical: parseFloat(style.paddingTop),
          inset: bounds.left, right: document.documentElement.clientWidth - bounds.right,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      `);
      if (theme === 'light') {
        assert.ok(spacing.padding >= 18 && spacing.padding <= 24, JSON.stringify(spacing));
        assert.ok(spacing.vertical >= 10 && spacing.vertical <= 14);
        assert.ok(spacing.inset >= (width >= 1024 ? 32 : width >= 640 ? 24 : 16));
        assert.ok(Math.abs(spacing.inset - spacing.right) < 1);
      } else {
        assert.equal(spacing.padding, 0, 'Unscrolled dark navbar spacing remains unchanged');
      }
      assert.equal(spacing.overflow, false);

      assert.equal(await evaluate(`
        const { showToast } = await import('/js/toast.js');
        const previousFocus = document.activeElement;
        showToast('Login successful', { success: true });
        const toast = document.getElementById('jubroToast');
        const bounds = toast.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.top <= 40
          && bounds.right >= innerWidth - 40
          && toast.getAttribute('role') === 'status' && toast.getAttribute('aria-live') === 'polite'
          && document.activeElement === previousFocus && !toast.classList.contains('hidden');
      `), true, theme + ' ' + width + ': toast appears in top right without stealing focus');
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-auth-navbar.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  assert.equal(await evaluate(`
    await new Promise(resolve => setTimeout(resolve, 3200));
    return document.getElementById('jubroToast').classList.contains('hidden');
  `), true, 'Success toast auto-dismisses after three seconds');

  await navigate('/');
  await evaluate(`
    await window.jubroComponentsReady;
    const firebase = await import('/test/fixtures/firebase.mjs');
    firebase.__setNextUser({ uid: 'auth-browser', email: 'auth@example.test' });
    document.getElementById('btnSignIn').click();
    document.getElementById('authEmail').value = 'auth@example.test';
    document.getElementById('authPassword').value = 'password';
    document.getElementById('authForm').requestSubmit();
  `);
  await waitFor(`location.pathname === '/board/' && document.getElementById('jubroToast')?.textContent.includes('Login successful')`);
  assert.equal(await evaluate(`
    return sessionStorage.getItem('jubro_flash_toast') === null
      && document.querySelectorAll('#jubroToast').length === 1;
  `), true, 'Board consumes login flash once using the existing toast element');

  await navigate('/board/');
  assert.equal(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    return document.getElementById('jubroToast').classList.contains('hidden');
  `), true, 'Refresh does not repeat login success');

  for (const view of ['kanban', 'list', 'dashboard']) {
    await navigate('/board/');
    await evaluate(`
      const { authService } = await import('/js/auth/firebaseAuth.js');
      await authService.waitForWorkspace();
      const firebase = await import('/test/fixtures/firebase.mjs');
      await firebase.__emitAuth({ uid: 'auth-browser', email: 'auth@example.test' });
      const { TrackerApp } = await import('/js/main/main.js');
      const app = new TrackerApp();
      app.setBoardView(${JSON.stringify(view === 'dashboard' ? 'kanban' : view)});
      ${view === 'dashboard' ? 'app.openDashboard();' : ''}
      document.getElementById('btnNavLogout').click();
    `);
    await waitFor(`location.pathname === '/' && document.getElementById('jubroToast')?.textContent.includes('Logout successful')`);
    assert.equal(await evaluate(`
      return sessionStorage.getItem('jubro_flash_toast') === null;
    `), true, view + ': safe logout navigates Home and consumes success once');
  }

  await navigate('/');
  assert.equal(await evaluate(`
    await window.jubroComponentsReady;
    const firebase = await import('/test/fixtures/firebase.mjs');
    await firebase.__emitAuth({ uid: 'auth-browser', email: 'auth@example.test' });
    return location.pathname === '/' && !document.querySelector('.jubro-toast-success:not(.hidden)')
      && document.getElementById('navbarGuest').getAttribute('aria-hidden') === 'true'
      && document.getElementById('btnOpenModal').getAttribute('href') === '/board/';
  `), true, 'Authenticated Home remains accessible without a login toast; guest-first CTA route is unchanged');

  await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.logout();
    localStorage.clear();
    sessionStorage.clear();
  `);
}
