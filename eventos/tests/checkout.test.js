'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function memStorage(initial) {
  const m = Object.assign({}, initial);
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _m: m
  };
}

function mount(storage, hash) {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.handlers = {}; this.value = ''; this.text = ''; this.className = ''; this.type = ''; this.name = ''; this.required = false; this.href = ''; }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    appendChild(child) {
      this.children.push(child);
      if (this.tag === 'select' && (child.selected || this.children.length === 1)) this.value = child.value;
      return child;
    }
    setAttribute(key, value) { this.attrs[key] = value; }
    getAttribute(key) { return this.attrs[key] || null; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    fire(name) { if (this.handlers[name]) this.handlers[name]({ preventDefault() {} }); }
  }
  const app = new Element('main');
  const count = new Element('span');
  const listeners = {};
  const window = {
    localStorage: storage,
    location: {
      get hash() { return hash; },
      set hash(v) { hash = v; if (listeners.hashchange) listeners.hashchange(); }
    },
    document: { readyState: 'complete', createElement: tag => new Element(tag), getElementById: id => id === 'app' ? app : count },
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  const ctx = vm.createContext({ window });
  for (const file of ['events.js', 'cart.js', 'app.js']) vm.runInContext(read(file), ctx);
  function all(node = app) { return [node, ...node.children.flatMap(child => all(child))]; }
  return {
    app, count, window,
    find: predicate => all().find(predicate),
    findAll: predicate => all().filter(predicate),
    navigate(hash) { window.location.hash = hash; listeners.hashchange(); }
  };
}

test('Home page displays featured showcase', () => {
  const storage = memStorage();
  const page = mount(storage, '#/');
  const showcase = page.find(n => n.className && n.className.includes('showcase'));
  assert.ok(showcase, 'Showcase should be displayed');
  assert.match(showcase.textContent, /Em Destaque|Vitrine/i, 'Showcase title missing');
});

test('Checkout flow fills Name/CPF and generates voucher TKT-XXXX', () => {
  const storage = memStorage({
    'dan-tickets-cart': JSON.stringify({
      items: [{
        eventId: 'rock-festival', eventName: 'Rock in Dan',
        sectorId: 'pista', sectorName: 'Pista',
        lotId: 'lote-1', lotName: 'Lote 1',
        type: 'inteira', qty: 2, unitCents: 15000
      }],
      coupon: ''
    })
  });
  
  const page = mount(storage, '#/sacola');
  const checkoutBtn = page.find(n => n.tag === 'a' && (n.getAttribute('href') === '#/checkout' || n.href === '#/checkout'));
  assert.ok(checkoutBtn, 'Cart should have checkout link');
  
  page.navigate('#/checkout');
  
  const nameInputs = page.findAll(n => n.name && n.name.startsWith('nome'));
  const cpfInputs = page.findAll(n => n.name && n.name.startsWith('cpf'));
  
  assert.equal(nameInputs.length, 2, 'Should have 2 name inputs for 2 tickets');
  assert.equal(cpfInputs.length, 2, 'Should have 2 cpf inputs for 2 tickets');
  
  nameInputs[0].value = 'Alice'; cpfInputs[0].value = '111';
  nameInputs[1].value = 'Bob'; cpfInputs[1].value = '222';
  
  const form = page.find(n => n.tag === 'form');
  form.fire('submit');
  
  assert.equal(page.window.location.hash, '#/voucher');
  
  const voucher = page.find(n => n.textContent.includes('TKT-XXXX'));
  assert.ok(voucher, 'Voucher should display TKT-XXXX');
  
  const cartAfter = JSON.parse(storage._m['dan-tickets-cart']);
  assert.equal(cartAfter.items.length, 0, 'Cart should be empty after checkout');
});
