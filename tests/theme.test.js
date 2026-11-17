/*
 * Dependency-free tests for theme.js (Node built-ins only).
 *
 * Run from the repository root:  node --test
 *
 * theme.js is evaluated in a fresh vm context per test with stubbed
 * window/document/localStorage/matchMedia, so each case starts from a clean
 * "page load".
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'theme.js'), 'utf8');
const STORAGE_KEY = 'dan-theme';

function createElement() {
  const attributes = new Map();
  const listeners = new Map();
  return {
    hidden: true,
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(listener);
    },
    dispatch(type) {
      (listeners.get(type) || []).forEach(function (listener) {
        listener({ type: type });
      });
    },
    click() {
      this.dispatch('click');
    },
  };
}

function createStorage(initial, mode) {
  const data = new Map(Object.entries(initial || {}));
  return {
    writes: 0,
    getItem(key) {
      if (mode === 'throw-get' || mode === 'throw-all') {
        throw new Error('SecurityError: storage blocked');
      }
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (mode === 'throw-set' || mode === 'throw-all') {
        throw new Error('QuotaExceededError: storage blocked');
      }
      this.writes += 1;
      data.set(key, String(value));
    },
    peek(key) {
      return data.has(key) ? data.get(key) : null;
    },
  };
}

/**
 * Evaluate theme.js against a fake page.
 *
 * options.systemDark      initial prefers-color-scheme: dark match
 * options.saved           value already stored under the theme key
 * options.storageMode     undefined | 'throw-get' | 'throw-set' | 'throw-all'
 *                         | 'throw-access' (reading window.localStorage throws)
 * options.readyState      document.readyState at evaluation time
 * options.withMatchMedia  false to simulate a browser without matchMedia
 * options.withToggle      false to omit the switch from the DOM
 */
function loadPage(options) {
  const opts = Object.assign({
    systemDark: false,
    saved: undefined,
    storageMode: undefined,
    readyState: 'complete',
    withMatchMedia: true,
    withToggle: true,
  }, options);

  const root = createElement();
  const toggle = opts.withToggle ? createElement() : null;
  const documentListeners = createElement();
  const storage = createStorage(
    opts.saved === undefined ? {} : { [STORAGE_KEY]: opts.saved },
    opts.storageMode
  );

  const mediaQuery = createElement();
  mediaQuery.matches = opts.systemDark;
  mediaQuery.media = '(prefers-color-scheme: dark)';

  const document = {
    documentElement: root,
    readyState: opts.readyState,
    getElementById(id) {
      return id === 'theme-toggle' ? toggle : null;
    },
    addEventListener: documentListeners.addEventListener,
  };

  const sandbox = { document: document };
  sandbox.window = sandbox;
  Object.defineProperty(sandbox, 'localStorage', {
    get() {
      if (opts.storageMode === 'throw-access') {
        throw new Error('SecurityError: storage access denied');
      }
      return storage;
    },
  });
  if (opts.withMatchMedia) {
    sandbox.matchMedia = function (query) {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return mediaQuery;
    };
  }

  vm.runInNewContext(SOURCE, sandbox, { filename: 'theme.js' });

  return {
    root: root,
    toggle: toggle,
    storage: storage,
    theme() {
      return root.getAttribute('data-theme');
    },
    setSystemDark(isDark) {
      mediaQuery.matches = isDark;
      mediaQuery.dispatch('change');
    },
    domContentLoaded() {
      document.readyState = 'interactive';
      documentListeners.dispatch('DOMContentLoaded');
    },
  };
}

test('first visit follows a light system preference', function () {
  const page = loadPage({ systemDark: false });
  assert.equal(page.theme(), 'light');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'false');
  assert.equal(page.storage.writes, 0, 'nothing is saved until the user chooses');
});

test('first visit follows a dark system preference', function () {
  const page = loadPage({ systemDark: true });
  assert.equal(page.theme(), 'dark');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
});

test('saved choice wins over the system preference', function () {
  assert.equal(loadPage({ systemDark: true, saved: 'light' }).theme(), 'light');
  assert.equal(loadPage({ systemDark: false, saved: 'dark' }).theme(), 'dark');
});

test('invalid saved values are ignored in favour of the system preference', function () {
  ['purple', '', 'DARK', 'null'].forEach(function (value) {
    assert.equal(loadPage({ systemDark: true, saved: value }).theme(), 'dark', value);
    assert.equal(loadPage({ systemDark: false, saved: value }).theme(), 'light', value);
  });
});

test('theme is applied while the document is still loading (before first paint)', function () {
  const page = loadPage({ systemDark: true, readyState: 'loading' });
  assert.equal(page.theme(), 'dark');
  assert.equal(page.toggle.hidden, true, 'switch stays hidden until wired up');
  page.domContentLoaded();
  assert.equal(page.toggle.hidden, false);
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
});

test('switch is revealed immediately when the DOM is already parsed', function () {
  const page = loadPage({ readyState: 'complete' });
  assert.equal(page.toggle.hidden, false);
});

test('click toggles immediately, persists the choice and syncs aria-checked', function () {
  const page = loadPage({ systemDark: false });

  page.toggle.click();
  assert.equal(page.theme(), 'dark');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
  assert.equal(page.storage.peek(STORAGE_KEY), 'dark');

  page.toggle.click();
  assert.equal(page.theme(), 'light');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'false');
  assert.equal(page.storage.peek(STORAGE_KEY), 'light');
});

test('persisted choice is restored on the next page load', function () {
  const first = loadPage({ systemDark: false });
  first.toggle.click();
  const saved = first.storage.peek(STORAGE_KEY);

  const reloaded = loadPage({ systemDark: false, saved: saved });
  assert.equal(reloaded.theme(), 'dark');
  assert.equal(reloaded.toggle.getAttribute('aria-checked'), 'true');
});

test('system changes are followed live while nothing is saved', function () {
  const page = loadPage({ systemDark: false });
  page.setSystemDark(true);
  assert.equal(page.theme(), 'dark');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
  page.setSystemDark(false);
  assert.equal(page.theme(), 'light');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'false');
});

test('system changes do not override a choice saved in an earlier visit', function () {
  const page = loadPage({ systemDark: false, saved: 'light' });
  page.setSystemDark(true);
  assert.equal(page.theme(), 'light');
});

test('system changes do not override a choice made in this page view', function () {
  const page = loadPage({ systemDark: false });
  page.toggle.click();
  page.setSystemDark(true);
  page.setSystemDark(false);
  assert.equal(page.theme(), 'dark');
});

test('getItem throwing falls back to the system preference and still toggles', function () {
  const page = loadPage({ systemDark: true, storageMode: 'throw-get' });
  assert.equal(page.theme(), 'dark');
  page.toggle.click();
  assert.equal(page.theme(), 'light');
});

test('reading window.localStorage throwing does not break the page', function () {
  const page = loadPage({ systemDark: true, storageMode: 'throw-access' });
  assert.equal(page.theme(), 'dark');
  page.toggle.click();
  assert.equal(page.theme(), 'light');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'false');
});

test('setItem throwing still toggles for this page view', function () {
  const page = loadPage({ systemDark: false, storageMode: 'throw-set' });
  page.toggle.click();
  assert.equal(page.theme(), 'dark');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
});

test('manual choice survives system changes when storage is blocked', function () {
  ['throw-set', 'throw-all', 'throw-access'].forEach(function (mode) {
    const page = loadPage({ systemDark: false, storageMode: mode });
    page.toggle.click();
    assert.equal(page.theme(), 'dark', mode);
    page.setSystemDark(false);
    assert.equal(page.theme(), 'dark', mode + ': OS change must not override the user');
    page.setSystemDark(true);
    page.setSystemDark(false);
    assert.equal(page.theme(), 'dark', mode + ': OS change must not override the user');
  });
});

test('browsers without matchMedia default to light without errors', function () {
  const page = loadPage({ withMatchMedia: false });
  assert.equal(page.theme(), 'light');
  page.toggle.click();
  assert.equal(page.theme(), 'dark');
});

test('a missing switch element does not throw', function () {
  const page = loadPage({ systemDark: true, withToggle: false });
  assert.equal(page.theme(), 'dark');
});
