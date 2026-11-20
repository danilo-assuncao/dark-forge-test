'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tag = tag;
    this.classList = { 
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.dataset = {};
    this.children = [];
    this.events = {};
    this.style = {};
    this._textContent = '';
    this._value = '';
    this.selectedOptions = []; 
    this.checked = false;
    this.type = '';
    this.className = '';
  }
  get textContent() { 
    let res = this._textContent;
    for (const c of this.children) res += c.textContent;
    return res;
  }
  set textContent(val) { 
    this._textContent = val; 
    this.children = [];
  }
  get innerHTML() { return this.textContent; }
  set innerHTML(val) {
    this._textContent = val;
    this.children = [];
  }
  appendChild(child) {
    this.children.push(child);
  }
  addEventListener(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  }
  removeEventListener(event, cb) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(x => x !== cb);
    }
  }
  click() {
    if (this.events.click) {
      for (const cb of this.events.click) cb();
    }
  }
  get value() { return this._value; }
  set value(v) { this._value = v; }
  
  querySelector(sel) {
    for (const child of this.children) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        if (child.className === cls || child.classList.contains(cls)) return child;
      } else {
        if (child.tag === sel) return child;
      }
      const found = child.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
  querySelectorAll(sel) {
    let results = [];
    if (sel.startsWith('#')) {
      const parts = sel.split(' ');
      const id = parts[0].slice(1);
      if (parts.length > 1 && parts[1] === 'input[type="checkbox"]:checked') {
        const container = mockDoc.elements[id];
        if (container) {
          return container.children.filter(c => c.tag === 'input' && c.type === 'checkbox' && c.checked);
        }
      }
    }
    return results;
  }
}

let mockDoc;
let alerts = [];

function resetEnv() {
  alerts = [];
  mockDoc = {
    elements: {},
    getElementById(id) {
      if (!this.elements[id]) {
        this.elements[id] = new Element('div');
        this.elements[id].id = id;
      }
      return this.elements[id];
    },
    createElement(tag) {
      return new Element(tag);
    },
    querySelectorAll(sel) {
      const dummy = new Element('div');
      return dummy.querySelectorAll.call(this, sel);
    },
    head: new Element('head'),
    body: new Element('body')
  };
  global.document = mockDoc;
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  global.alert = (msg) => alerts.push(msg);
  
  const appPath = require.resolve('../app.js');
  if (require.cache[appPath]) {
    delete require.cache[appPath];
  }
}

test('CSP meta tag exists and is strictly restrictive, and no inline scripts or styles are used', () => {
  const htmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(cspMatch, 'Must have a CSP meta tag');
  const csp = cspMatch[1];
  assert.ok(csp.includes("default-src 'none'"));
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
  
  assert.ok(!html.includes('style='), 'Inline style attribute is forbidden');
  assert.ok(!html.includes('<style>'), 'Inline style tag is forbidden');
  assert.ok(!/<script\b[^>]*>[\s\S]+?<\/script>/i.test(html), 'Inline script block is forbidden');
  assert.ok(!/\bon\w+=/i.test(html), 'Inline event handlers are forbidden');
});

test('loader.js sequentially injects modules and handles execution', async () => {
  const loaderPath = path.join(__dirname, '../loader.js');
  const loaderSrc = fs.readFileSync(loaderPath, 'utf8');
  
  let appendedScripts = [];
  let errorLogs = [];
  
  const fakeCrypto = {
    getRandomValues: (arr) => { arr[0] = 42; return arr; }
  };
  
  const docStub = {
    head: {
      appendChild(script) {
        appendedScripts.push(script);
        sandbox.window.module.exports = { marker: script.src };
        if (script.onload) setImmediate(script.onload);
      }
    },
    body: { innerHTML: '', textContent: '', appendChild: () => {} },
    createElement(tag) { return { tag, type: '', src: '', onload: null, onerror: null, textContent: '', appendChild: () => {} }; }
  };

  const sandbox = {
    crypto: fakeCrypto,
    console: { error: (e) => errorLogs.push(e) },
    document: docStub,
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      __modules: {}, module: { exports: {} }
    }
  };
  
  vm.createContext(sandbox);
  vm.runInContext(loaderSrc, sandbox);
  const loadAppPromise = vm.runInContext('window.loadAppPromise', sandbox);
  await loadAppPromise;
  
  assert.equal(appendedScripts.length, 5);
  assert.equal(appendedScripts[0].src, './menu.js');
  assert.equal(appendedScripts[4].src, './app.js');
  assert.equal(errorLogs.length, 0);
  assert.equal(typeof sandbox.window.require('node:crypto').randomInt, 'function');
  assert.equal(sandbox.window.require('./menu.js').marker, './menu.js');
  assert.equal(sandbox.window.require('./app.js'), undefined);
});

test('loader.js stops and renders error on fetch/execution failure', async () => {
  const loaderPath = path.join(__dirname, '../loader.js');
  const loaderSrc = fs.readFileSync(loaderPath, 'utf8');
  
  let appendedScripts = [];
  let errorLogs = [];
  let children = [];
  
  const docStub = {
    head: {
      appendChild(script) {
        appendedScripts.push(script);
        if (script.src === './customizer.js') {
          if (script.onerror) setImmediate(script.onerror);
        } else {
          if (script.onload) setImmediate(script.onload);
        }
      }
    },
    body: { innerHTML: '', textContent: '', appendChild(c) { children.push(c); } },
    createElement(tag) { return { tag, type: '', src: '', onload: null, onerror: null, textContent: '', appendChild: () => {} }; }
  };

  const sandbox = {
    console: { error: (e) => errorLogs.push(e) },
    document: docStub,
    window: { addEventListener: () => {}, removeEventListener: () => {}, __modules: {}, module: { exports: {} } }
  };
  
  vm.createContext(sandbox);
  vm.runInContext(loaderSrc, sandbox);
  const loadAppPromise = vm.runInContext('window.loadAppPromise', sandbox);
  try {
    await loadAppPromise;
  } catch(e) {}
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(appendedScripts.length, 2);
  assert.equal(children.length, 2);
  assert.equal(children[1].textContent, 'Failed to load ./customizer.js');
  assert.equal(errorLogs.length, 1);
});

test('loader.js stops and renders error on script runtime execution failure', async () => {
  const loaderPath = path.join(__dirname, '../loader.js');
  const loaderSrc = fs.readFileSync(loaderPath, 'utf8');
  
  let appendedScripts = [];
  let errorLogs = [];
  let errorListeners = {};
  let children = [];
  
  const docStub = {
    head: {
      appendChild(script) {
        appendedScripts.push(script);
        if (script.src === './customizer.js') {
          if (errorListeners['error']) {
            setImmediate(() => {
              errorListeners['error']({filename: 'customizer.js', message: 'SyntaxError'});
            });
          }
        } else {
          if (script.onload) setImmediate(script.onload);
        }
      }
    },
    body: { innerHTML: '', textContent: '', appendChild(c) { children.push(c); } },
    createElement(tag) { return { tag, type: '', src: '', onload: null, onerror: null, textContent: '', appendChild: () => {} }; }
  };

  const sandbox = {
    console: { error: (e) => errorLogs.push(e) },
    document: docStub,
    window: { 
      addEventListener: (evt, cb) => { errorListeners[evt] = cb; },
      removeEventListener: (evt, cb) => { if (errorListeners[evt] === cb) delete errorListeners[evt]; },
      __modules: {}, module: { exports: {} }
    }
  };
  
  vm.createContext(sandbox);
  vm.runInContext(loaderSrc, sandbox);
  const loadAppPromise = vm.runInContext('window.loadAppPromise', sandbox);
  try {
    await loadAppPromise;
  } catch(e) {}
  
  await new Promise(r => setTimeout(r, 0));
  
  assert.equal(appendedScripts.length, 2);
  assert.equal(children.length, 2);
  assert.equal(children[1].textContent, 'Execution error in ./customizer.js: SyntaxError');
  assert.equal(errorLogs.length, 1);
});

test('loader.js randomInt rejection sampling works correctly', () => {
  const loaderPath = path.join(__dirname, '../loader.js');
  const loaderSrc = fs.readFileSync(loaderPath, 'utf8');
  
  let getRandomValuesCalls = 0;
  const fakeCrypto = {
    getRandomValues: (arr) => {
      getRandomValuesCalls++;
      if (getRandomValuesCalls === 1) {
        arr[0] = 0xFFFFFFFF; // should trigger rejection
      } else {
        arr[0] = 42; // accepted
      }
      return arr;
    }
  };
  
  const docStub = {
    head: { appendChild: () => {} },
    body: { innerHTML: '', textContent: '', appendChild: () => {} },
    createElement(tag) { return { tag, type: '', src: '', onload: null, onerror: null, textContent: '', appendChild: () => {} }; }
  };

  const sandbox = {
    crypto: fakeCrypto,
    window: { addEventListener: () => {}, removeEventListener: () => {} },
    document: docStub
  };
  
  vm.createContext(sandbox);
  vm.runInContext(loaderSrc, sandbox);
  
  const cryptoModule = sandbox.window.require('node:crypto');
  const result = cryptoModule.randomInt(0, 100);
  assert.equal(getRandomValuesCalls, 2);
  assert.equal(result, 42);
});

test.afterEach(() => {
  global.document = undefined;
  global.window = undefined;
  global.alert = undefined;
});

test('app.js initializes and renders vitrine', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  assert.ok(vitrine.children.length > 0, 'Vitrine should have items');
  
  const cart = document.getElementById('cart-items');
  assert.equal(cart.textContent, 'Sacola vazia');
});

test('app.js filter feature narrows vitrine and handles empty state and full reset', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  const applyBtn = document.getElementById('apply-filters');
  
  document.getElementById('category-filter').value = 'entradas';
  document.getElementById('dietary-filter').value = 'vegano';
  
  const allergenContainer = document.getElementById('allergen-filters');
  const checkbox = new Element('input');
  checkbox.type = 'checkbox';
  checkbox.value = 'gluten';
  checkbox.checked = true;
  allergenContainer.appendChild(checkbox);
  
  applyBtn.click();
  assert.equal(vitrine.children.length, 1);
  assert.equal(vitrine.children[0].dataset.id, 'ent-salada-castanhas');
  
  document.getElementById('category-filter').value = '';
  document.getElementById('dietary-filter').value = '';
  checkbox.checked = false;
  applyBtn.click();
  assert.ok(vitrine.children.length > 10);
});

test('app.js checkout and cart failure paths (multiple items, NaN distance, bad coupon, empty checkout)', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  const cart = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkout-btn');
  const receiptContainer = document.getElementById('receipt');

  checkoutBtn.click();
  assert.equal(alerts[0], 'A sacola está vazia.');
  
  const card1 = vitrine.children[0];
  const configDiv1 = card1.children[3];
  configDiv1.querySelector('.qty-input').value = '2';
  configDiv1.querySelector('.doneness-select').value = 'ao-ponto';
  configDiv1.children[configDiv1.children.length - 1].click(); // Add btn
  
  const card2 = vitrine.children[1];
  const configDiv2 = card2.children[3];
  configDiv2.querySelector('.qty-input').value = '1';
  configDiv2.querySelector('.doneness-select').value = 'ao-ponto';
  configDiv2.children[configDiv2.children.length - 1].click(); // Add btn

  assert.equal(cart.children.length, 2);
  
  document.getElementById('distance-input').value = 'abc';
  checkoutBtn.click();
  assert.equal(alerts[1], 'Erro ao finalizar pedido: Distância inválida');
  
  document.getElementById('distance-input').value = '5';
  document.getElementById('tip-input').value = '10';
  document.getElementById('coupon-input').value = 'INVALID';
  document.getElementById('name-input').value = 'Danilo';
  document.getElementById('address-input').value = 'Rua Foo';
  checkoutBtn.click();
  assert.ok(alerts[2].includes('Unknown coupon'));
  
  document.getElementById('coupon-input').value = 'DANCHEF10';
  checkoutBtn.click();
  assert.equal(receiptContainer.classList.contains('hidden'), false);
  
  assert.equal(cart.children.length, 0);
  assert.equal(cart.textContent, 'Sacola vazia');
});
