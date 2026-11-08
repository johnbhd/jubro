import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new Set();
    this.className = '';
    this.listeners = {};
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
});
