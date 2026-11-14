import test from 'node:test';
import assert from 'node:assert/strict';

test('static Insights entry failures show Retry without initializing or changing workspace data', async () => {
  const saved = Object.fromEntries(['document', 'window', 'fetch', 'localStorage', 'DOMParser'].map(key => [key, globalThis[key]]));
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const failure of ['network', 'http', 'markup']) {
      let reloads = 0;
      let retryAction;
      const message = { textContent: '' };
      const loading = { hidden: false };
      const errorPanel = { hidden: true };
      const retry = {
        hidden: true,
        addEventListener(name, callback) {
          assert.equal(name, 'click');
          retryAction = callback;
        },
      };
      globalThis.document = {
        documentElement: { classList: { toggle() {} }, dataset: {} },
        getElementById: id => ({
          dashboardEntryMessage: message,
          dashboardEntryRetry: retry,
          dashboardEntryLoading: loading,
          dashboardEntryError: errorPanel,
        })[id],
      };
      globalThis.window = { location: { reload() { reloads += 1; } } };
      globalThis.localStorage = {
        getItem: () => 'light',
        setItem() { throw new Error('Entry must not change workspace data.'); },
      };
      globalThis.DOMParser = class {
        parseFromString() {
          return { getElementById: () => null };
        }
      };
      globalThis.fetch = async url => {
        assert.equal(url, '/board/index.html');
        if (failure === 'network') {
          throw new Error('Offline');
        }
        return { ok: failure !== 'http', text: async () => '<html></html>' };
      };
      await import(`../js/dashboardEntry.js?entry-failure=${failure}`);
      assert.match(message.textContent, /Could not open Job Search Insights/);
      assert.equal(retry.hidden, false);
      assert.equal(loading.hidden, true);
      assert.equal(errorPanel.hidden, false);
      assert.equal(document.documentElement.dataset.loadingView, 'insights');
      retryAction();
      assert.equal(reloads, 1);
    }
  } finally {
    console.error = originalError;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete globalThis[key];
      } else {
        globalThis[key] = value;
      }
    }
  }
});
