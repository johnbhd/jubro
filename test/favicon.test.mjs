import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new Set();
    this.className = '';
    this.listeners = {};
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
    };
    this.src = '';
    this.alt = '';
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return [this._textContent, ...this.children.map((child) => child.textContent)].join('');
  }

  appendChild(node) {
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }
}

globalThis.document = {
  createElement(tag) {
    return new FakeElement(tag);
  },
};

const { getLinkFavicon, createCompanyFaviconElement } = await import('../js/main/favicon.js');
const { listBadgeMethods } = await import('../js/main/listView/badges.js');

test('only OnlineJobs.ph platform badges receive a white favicon circle', () => {
  const context = {
    ...listBadgeMethods,
    isUsefulListValue: Boolean,
    getOptionColor: () => '#334155',
    getContrastColor: () => '#ffffff',
    normalizeText: value => value.toLowerCase(),
    getColumnName: column => column.name,
    getSafeHttpUrl: value => value,
  };

  for (const platform of ['OnlineJobs.ph', 'Online Jobs PH', 'LinkedIn', 'Indeed']) {
    const badge = context.createListBadgeElement({ name: 'Platform' }, platform);
    assert.equal(
      badge.children[0].className.includes('favicon-holder-onlinejobs'),
      platform.startsWith('Online'),
      platform,
    );
  }

  const applicationLink = context.createFaviconElement(getLinkFavicon('https://onlinejobs.ph'));
  assert.equal(applicationLink.className, 'favicon-holder');
});

test('status badges expose their existing accent without changing platform badges', () => {
  const context = {
    ...listBadgeMethods,
    isUsefulListValue: Boolean,
    getOptionColor: () => '#3b82f6',
    getContrastColor: () => '#ffffff',
    normalizeText: value => value.toLowerCase(),
    getColumnName: column => column.name,
  };
  const badge = context.createListBadgeElement({ name: 'Status' }, 'Submitted');
  assert.equal(badge.className.includes('list-status-badge'), true);
  assert.equal(badge.style['--badge-accent'], '#3b82f6');
  assert.equal(badge.style.backgroundColor, '#3b82f6');
  assert.equal(badge.textContent, 'Submitted');
  const other = context.createListBadgeElement({ name: 'Priority' }, 'High');
  assert.equal(other.className.includes('list-status-badge'), false);
});

test('getLinkFavicon only accepts http and https URLs', () => {
  assert.deepEqual(getLinkFavicon('https://google.com/jobs/123'), {
    hostname: 'google.com',
    url: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
  });

  assert.deepEqual(getLinkFavicon('http://example.org/careers'), {
    hostname: 'example.org',
    url: 'https://www.google.com/s2/favicons?domain=example.org&sz=64',
  });

  assert.deepEqual(getLinkFavicon('javascript:alert(1)'), {
    hostname: '',
    url: '',
  });

  assert.deepEqual(getLinkFavicon('data:text/html,<script>alert(1)</script>'), {
    hostname: '',
    url: '',
  });

  assert.deepEqual(getLinkFavicon('file:///etc/passwd'), {
    hostname: '',
    url: '',
  });

  assert.deepEqual(getLinkFavicon(''), {
    hostname: '',
    url: '',
  });

  assert.deepEqual(getLinkFavicon(null), {
    hostname: '',
    url: '',
  });

  assert.deepEqual(getLinkFavicon('not-a-valid-url'), {
    hostname: '',
    url: '',
  });

  // Normalizes bare domains without https (e.g. github.com)
  assert.deepEqual(getLinkFavicon('github.com'), {
    hostname: 'github.com',
    url: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
  });

  assert.deepEqual(getLinkFavicon('github.com/facebook/react'), {
    hostname: 'github.com',
    url: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
  });

  assert.deepEqual(getLinkFavicon('www.github.com'), {
    hostname: 'www.github.com',
    url: 'https://www.google.com/s2/favicons?domain=www.github.com&sz=64',
  });
});

test('createCompanyFaviconElement creates img for valid link and falls back on error or missing link', () => {
  // Case 1: Valid link with company name
  const el1 = createCompanyFaviconElement('https://uber.com/jobs', 'Uber');
  assert.equal(el1.children.length, 1);
  const img1 = el1.children[0];
  assert.equal(img1.tagName, 'IMG');
  assert.equal(img1.src, 'https://www.google.com/s2/favicons?domain=uber.com&sz=64');

  // Trigger error event -> falls back to initial 'U'
  img1.listeners['error']();
  assert.equal(el1.children.length, 1);
  assert.equal(el1.children[0].tagName, 'SPAN');
  assert.equal(el1.children[0].textContent, 'U');

  // Case 2: No link, valid company name -> initial 'A'
  const el2 = createCompanyFaviconElement('', 'Airbnb');
  assert.equal(el2.children.length, 1);
  assert.equal(el2.children[0].tagName, 'SPAN');
  assert.equal(el2.children[0].textContent, 'A');

  // Case 3: No link, no company name -> briefcase icon
  const el3 = createCompanyFaviconElement('', '');
  assert.equal(el3.children.length, 1);
  assert.equal(el3.children[0].tagName, 'I');
  assert.ok(el3.children[0].className.includes('fa-briefcase'));

  // Case 4: No link, '-' company name -> briefcase icon
  const el4 = createCompanyFaviconElement('', '-');
  assert.equal(el4.children.length, 1);
  assert.equal(el4.children[0].tagName, 'I');
  assert.ok(el4.children[0].className.includes('fa-briefcase'));

  // Case 5: Bare domain 'github.com' -> gets logo, circular with dark background, not cropped
  const elGh = createCompanyFaviconElement('github.com', 'GitHub');
  assert.equal(elGh.children.length, 1);
  const imgGh = elGh.children[0];
  assert.equal(imgGh.tagName, 'IMG');
  assert.equal(imgGh.src, 'https://www.google.com/s2/favicons?domain=github.com&sz=64');
  assert.ok(imgGh.className.includes('rounded-full'));
  assert.ok(elGh.className.includes('bg-[#24292e]'));

  // Case 6: Non-circular logo (Google) -> img does NOT have rounded-full (not cropped)
  const elGoog = createCompanyFaviconElement('google.com', 'Google');
  const imgGoog = elGoog.children[0];
  assert.equal(imgGoog.tagName, 'IMG');
  assert.equal(imgGoog.className.includes('rounded-full'), false);
  assert.equal(elGoog.className.includes('bg-[#24292e]'), false);
});
