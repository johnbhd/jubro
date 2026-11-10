import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('board top navbar markup has Sign In Now after Home, and consistent icon widths', () => {
  const html = readFileSync(resolve(process.cwd(), 'board/index.html'), 'utf8');

  // Verify btnNavSignIn exists and is positioned after btnNavHome in the first space-y-1 block
  const homeIndex = html.indexOf('id="btnNavHome"');
  const signInIndex = html.indexOf('id="btnNavSignIn"');
  const settingsIndex = html.indexOf('id="btnNavSettings"');

  assert.ok(homeIndex > 0, 'btnNavHome exists');
  assert.ok(signInIndex > 0, 'btnNavSignIn exists');
  assert.ok(settingsIndex > 0, 'btnNavSettings exists');
  assert.ok(signInIndex > homeIndex, 'btnNavSignIn comes after btnNavHome');
  assert.ok(settingsIndex > signInIndex, 'btnNavSettings comes after btnNavSignIn');

  // Verify text content of Sign In Now
  assert.ok(html.includes('<span>Sign In Now</span>'), 'Contains Sign In Now label');

  // Verify Export and Logout have consistent w-5 shrink-0 icon styling
  assert.ok(html.includes('fa-file-export w-5 text-center text-gray-400 shrink-0'), 'Export JSON icon has w-5 shrink-0');
  assert.ok(html.includes('fa-file-import w-5 text-center text-gray-400 shrink-0'), 'Import JSON icon has w-5 shrink-0');
  assert.ok(html.includes('fa-arrow-right-from-bracket w-5 text-center text-red-500 shrink-0'), 'Logout icon has w-5 shrink-0');
  assert.ok(html.includes('fa-arrow-right-to-bracket w-5 text-center text-gray-400 shrink-0'), 'Sign In icon has w-5 shrink-0');
  assert.ok(html.includes('fa-house w-5 text-center text-gray-400 shrink-0'), 'Home icon has w-5 shrink-0');
});

test('boardNav manages Sign In Now visibility between guest and authenticated states', async () => {
  // Mock DOM environment for boardNav
class FakeClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.classes.has(cls)) this.classes.delete(cls); else this.classes.add(cls);
    } else if (force) {
      this.classes.add(cls);
    } else {
      this.classes.delete(cls);
    }
  }
  contains(cls) { return this.classes.has(cls); }
}

class FakeElem {
  constructor(id) {
    this.id = id;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = '';
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(event, handler) { this.listeners.set(event, handler); }
  querySelector() { return null; }
}

  const elems = new Map();
  [
    'boardTopNavbar', 'btnGuestSettings', 'btnUserAccount', 'userAccountLabel',
    'boardTopNavDropdown', 'dropdownUserHeader', 'dropdownUserName', 'dropdownUserEmail',
    'dropdownLogoutWrapper', 'btnNavHome', 'btnNavSignIn', 'btnNavSettings',
    'btnThemeLight', 'btnThemeDark', 'btnNavLogout', 'btnImport', 'btnExport'
  ].forEach(id => elems.set(id, new FakeElem(id)));

  globalThis.document = {
    getElementById: (id) => elems.get(id) || null,
    documentElement: { classList: new Set() },
    addEventListener() {},
  };
  globalThis.document.documentElement.classList.toggle = () => {};
  const storageMap = new Map([['jubro_theme', 'dark']]);
  globalThis.localStorage = {
    getItem: (key) => storageMap.get(key) ?? null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
  globalThis.window = { addEventListener() {} };

  let authCallback;
  const mockAuthService = {
    getCurrentUser: () => null,
    onAuthChange: (cb) => { authCallback = cb; },
  };

  const { initBoardTopNavbar } = await import('../js/main/boardNav.js');
  initBoardTopNavbar(mockAuthService);

  const btnSignIn = elems.get('btnNavSignIn');
  const btnSettings = elems.get('btnNavSettings');
  const btnGuest = elems.get('btnGuestSettings');
  const btnUser = elems.get('btnUserAccount');

  // Initial guest state
  assert.equal(btnSignIn.classList.contains('hidden'), false, 'Sign In Now is visible for guest');
  assert.equal(btnSettings.classList.contains('hidden'), true, 'Settings is hidden for guest');
  assert.equal(btnGuest.classList.contains('hidden'), false, 'Guest trigger is visible');
  assert.equal(btnUser.classList.contains('hidden'), true, 'User trigger is hidden');

  // Authenticate user
  authCallback({ uid: 'u123', email: 'test@example.com', displayName: 'Jane' });
  assert.equal(btnSignIn.classList.contains('hidden'), true, 'Sign In Now is hidden for authenticated user');
  assert.equal(btnSettings.classList.contains('hidden'), false, 'Settings is visible for authenticated user');
  assert.equal(btnGuest.classList.contains('hidden'), true, 'Guest trigger is hidden');
  assert.equal(btnUser.classList.contains('hidden'), false, 'User trigger is visible');

  // Log out back to guest
  authCallback(null);
  assert.equal(btnSignIn.classList.contains('hidden'), false, 'Sign In Now becomes visible again for guest');
  assert.equal(btnSettings.classList.contains('hidden'), true, 'Settings is hidden again for guest');
});
