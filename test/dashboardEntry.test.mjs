import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('Dashboard applies its saved theme before rendering the initial loader without storage writes', async () => {
  const entry = await readFile(new URL('../dashboard/index.html', import.meta.url), 'utf8');
  const script = entry.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const preference of ['light', 'dark', null, 'unavailable']) {
    let dark;
    const document = {
      documentElement: {
        dataset: {},
        classList: {
          toggle(name, enabled) {
            assert.equal(name, 'dark');
            dark = enabled;
          },
        },
      },
    };
    runInNewContext(script, {
      document,
      localStorage: {
        getItem(key) {
          assert.equal(key, 'jubro_theme');
          if (preference === 'unavailable') {
            throw new Error('Storage unavailable');
          }
          return preference;
        },
        setItem() {
          assert.fail('Loading must not write browser data.');
        },
      },
    });
    assert.equal(dark, preference !== 'light');
    assert.equal(document.documentElement.dataset.loadingView, 'insights');
  }
});

test('Insights has a real static entry without requiring a hosting rewrite', async () => {
  const entry = await readFile(new URL('../dashboard/index.html', import.meta.url), 'utf8');
  assert.match(entry, /\/js\/dashboardEntry\.js/);
  assert.match(entry, /Job Search Insights/);
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.rewrites.some(rule => /^\/dashboard\/?$/.test(rule.source)), false);
});

test('first navbar has one Dashboard modal button with the existing Insights icon', async () => {
  const html = await readFile(new URL('../board/index.html', import.meta.url), 'utf8');
  const top = html.slice(html.indexOf('id="boardTopNavbar"'), html.indexOf('id="workspaceLoading"'));
  const toolbar = html.slice(html.indexOf('id="appNavbar"'), html.indexOf('id="boardWorkspace"'));
  assert.doesNotMatch(html, /id="btnInsights"/);
  assert.equal((top.match(/id="btnDashboard"/g) || []).length, 1);
  assert.match(top, /id="btnDashboard"[^>]*aria-label="Dashboard"[^>]*aria-haspopup="dialog"/);
  assert.match(top, /fa-chart-simple/);
  assert.match(top, /<span>Dashboard<\/span>/);
  assert.doesNotMatch(top, /<span>Quick Overview<\/span>/);
  assert.doesNotMatch(toolbar, /id="btnInsights"/);
  assert.doesNotMatch(toolbar, /id="btnDashboard"/);
});

test('first and second navbars are erased on the dashboard page but preserved on the board page', async () => {
  const css = await readFile(new URL('../css/global.css', import.meta.url), 'utf8');
  assert.match(
    css,
    /:is\([^)]*data-workspace-page="insights"[^)]*\)\s*:is\(#boardTopNavbar,\s*#appNavbar/,
    'CSS hides #boardTopNavbar and #appNavbar when on the insights page'
  );
  assert.match(
    css,
    /:is\(#boardTopNavbar,\s*#appNavbar[^)]*\)\s*\{\s*display:\s*none\s*!important;/,
    'Hidden navbars use display: none !important'
  );

  const entry = await readFile(new URL('../dashboard/index.html', import.meta.url), 'utf8');
  assert.match(entry, /data-workspace-page="insights"/, 'Dashboard entry marks workspacePage as insights');

  const boardHtml = await readFile(new URL('../board/index.html', import.meta.url), 'utf8');
  assert.match(boardHtml, /id="boardTopNavbar"/, 'Board retains first navbar');
  assert.match(boardHtml, /id="appNavbar"/, 'Board retains second navbar');
});
