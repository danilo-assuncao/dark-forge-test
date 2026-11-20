'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Minimal DOM mock
class Element {
  constructor(tag) {
    this.tag = tag;
    this.classList = { add: () => {} };
    this.dataset = {};
    this.children = [];
    this.events = {};
    this.style = {};
    this._textContent = '';
    this._value = '';
    this.selectedOptions = []; 
    this.checked = false;
  }
  get textContent() { return this._textContent; }
  set textContent(val) { 
    this._textContent = val; 
    if (val === '') this.children = [];
  }
  get innerHTML() { return this._textContent; }
  set innerHTML(val) {
    this._textContent = val;
    if (val === '') this.children = [];
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
}

const mockDoc = {
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
    if (sel.includes('checked')) {
      const container = this.elements['allergen-filters'];
      if (!container) return [];
      return container.children.filter(c => c.tag === 'input' && c.type === 'checkbox' && c.checked);
    }
    return [];
  }
};

global.document = mockDoc;
global.window = {
  require: (id) => {
    if (id === './menu.js') return require('../menu.js');
    if (id === './customizer.js') return require('../customizer.js');
    if (id === './order.js') return require('../order.js');
    return {};
  }
};
global.alert = (msg) => { console.error('ALERT:', msg); };

test('app.js initializes and renders vitrine', () => {
  require('../app.js');
  
  const vitrine = document.getElementById('vitrine-items');
  assert.ok(vitrine.children.length > 0, 'Vitrine should have items');
  
  const cart = document.getElementById('cart-items');
  assert.equal(cart.textContent, 'Sacola vazia');
});

test('app.js allows adding items and checking out', () => {
  const vitrine = document.getElementById('vitrine-items');
  
  const card = vitrine.children[0];
  assert.equal(card.tag, 'div');
  
  const configDiv = card.children[3];
  const addBtn = configDiv.children[configDiv.children.length - 1];
  
  const qtyInput = configDiv.children[1];
  qtyInput.value = '2';
  
  const donenessSelect = configDiv.children[3];
  donenessSelect.value = 'ao-ponto';
  
  const extrasSelect = configDiv.children[6];
  extrasSelect.selectedOptions = []; // empty array instead of undefined
  
  const notesInput = configDiv.children[9];
  notesInput.value = 'Sem cebola';
  
  addBtn.click();
  
  const cart = document.getElementById('cart-items');
  assert.ok(cart.children.length > 0, 'Cart should have items after click');
  assert.ok(cart.children[0].textContent.includes('Sem cebola'));
  
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
  assert.ok(receiptContent.children[1].textContent.includes('Danilo'));
});
