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
  click() {
    if (this.events.click) {
      for (const cb of this.events.click) cb();
    }
  }
  get value() { return this._value; }
  set value(v) { this._value = v; }
  
  querySelector(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className === cls || this.classList.contains(cls)) return this;
      for (const child of this.children) {
        const found = child.querySelector(sel);
        if (found) return found;
      }
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
    }
  };
  global.document = mockDoc;
  global.window = {};
  global.alert = (msg) => alerts.push(msg);
  
  const appPath = require.resolve('../app.js');
  if (require.cache[appPath]) {
    delete require.cache[appPath];
  }
}

test('index.html script loads files with fetch and runs them without global conflicts', async () => {
  const htmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const scriptMatch = html.match(/<script>\s*(\(async function loadApp\(\)[\s\S]*?)\s*<\/script>/);
  assert.ok(scriptMatch, 'Should find loadApp script in index.html');
  const scriptContent = scriptMatch[1];

  let fetchCalls = [];
  const fakeFetch = async (url) => {
    fetchCalls.push(url);
    let filePath = url;
    if (url.startsWith('./')) {
      filePath = path.join(__dirname, '..', url.slice(2));
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { ok: true, text: async () => content };
    } catch (e) {
      return { ok: false };
    }
  };

  const fakeCrypto = {
    getRandomValues: (arr) => { arr[0] = 42; return arr; }
  };

  const sandbox = {
    fetch: fakeFetch,
    crypto: fakeCrypto,
    console: { error: () => {} },
    document: {
      getElementById: () => ({ addEventListener: () => {} }),
      querySelectorAll: () => []
    },
    window: {}
  };
  
  vm.createContext(sandbox);
  await vm.runInContext(scriptContent, sandbox);
  
  assert.deepEqual(fetchCalls, [
    './menu.js', './customizer.js', './delivery.js', './order.js', './app.js'
  ]);
});

test('app.js initializes and renders vitrine', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  assert.ok(vitrine.children.length > 0, 'Vitrine should have items');
  
  const cart = document.getElementById('cart-items');
  assert.equal(cart.textContent, 'Sacola vazia');
});

test('app.js filter feature narrows vitrine and handles empty state', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  const applyBtn = document.getElementById('apply-filters');
  
  // Set filters that will match only Salada verde com castanhas
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
  
  // Now add 'castanhas' to exclusion to yield zero results
  const checkbox2 = new Element('input');
  checkbox2.type = 'checkbox';
  checkbox2.value = 'castanhas';
  checkbox2.checked = true;
  allergenContainer.appendChild(checkbox2);
  
  applyBtn.click();
  assert.equal(vitrine.textContent, 'Nenhum prato encontrado com esses filtros.');
});

test('app.js allows adding items, checking out, and removing items with errors handled', () => {
  resetEnv();
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  const card = vitrine.children[0]; // bruschetta
  const configDiv = card.children[3];
  
  const qtyInput = configDiv.querySelector('.qty-input');
  qtyInput.value = '2';
  
  const donenessSelect = configDiv.querySelector('.doneness-select');
  donenessSelect.value = 'ao-ponto';
  
  const extrasSelect = configDiv.querySelector('.extras-select');
  extrasSelect.selectedOptions = [{value: 'queijo-extra'}];
  
  const notesInput = configDiv.querySelector('.notes-input');
  notesInput.value = 'Sem cebola';
  
  const addBtn = configDiv.children[configDiv.children.length - 1];
  addBtn.click();
  
  const cart = document.getElementById('cart-items');
  assert.equal(cart.children.length, 1, 'Cart should have one item');
  const cartText = cart.children[0].textContent;
  assert.ok(cartText.includes('Sem cebola'));
  assert.ok(cartText.includes('queijo-extra'));
  
  // Checkout missing fields / empty checkout test
  document.getElementById('distance-input').value = '5';
  document.getElementById('tip-input').value = '10';
  document.getElementById('coupon-input').value = 'DANCHEF10';
  document.getElementById('name-input').value = 'Danilo';
  document.getElementById('address-input').value = 'Rua Foo, 123';
  
  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.click();
  
  const receiptContainer = document.getElementById('receipt');
  assert.equal(receiptContainer.style.display, 'block');
  
  const receiptContent = document.getElementById('receipt-content');
  assert.ok(receiptContent.children.length > 0);
  assert.ok(receiptContent.children[0].textContent.includes('Pedido: PED-'));
  
  // Check exact subtotal, discount, etc.
  const totalsDiv = receiptContent.children[3];
  assert.ok(totalsDiv.innerHTML.includes('Subtotal: R$ 61.80'), 'Should have correct subtotal (2 * 24.90 + 2 * 6)');
  assert.ok(totalsDiv.innerHTML.includes('Desconto: R$ 6.18'), 'Should have correct discount (10%)');
  assert.ok(totalsDiv.innerHTML.includes('Subtotal Líquido: R$ 55.62'));
  assert.ok(totalsDiv.innerHTML.includes('Taxa de Entrega: R$ 12.00')); // 5km -> 12.00
  assert.ok(totalsDiv.innerHTML.includes('Gorjeta: R$ 5.56')); // 10% of 55.62 = 5.562 -> 5.56
  assert.ok(totalsDiv.innerHTML.includes('Total: R$ 73.18')); // 55.62 + 12 + 5.56 = 73.18
  
  // Test removing an item
  const removeBtn = cart.children[0].children[0];
  removeBtn.click();
  assert.equal(cart.children.length, 0);
  assert.equal(cart.textContent, 'Sacola vazia');
  
  // Test empty cart checkout
  checkoutBtn.click();
  assert.equal(alerts[0], 'A sacola está vazia.');
  
  // Test invalid qty
  qtyInput.value = '50';
  addBtn.click();
  assert.ok(alerts[1].includes('qty must be an integer between 1 and 20'));
});
