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
    sessionStorage: memStorage(),
    crypto: { getRandomValues: arr => { arr[0] = 0xABCD; arr[1] = 0x1234; return arr; } },
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

test('Showcase is visible only when no filters are applied and hides correctly', () => {
  const storage = memStorage();
  const page = mount(storage, '#/');
  const getTitle = () => page.find(n => n.className === 'showcase__title');
  const getLink = () => page.find(n => n.className === 'event-card__link' && n.href === '#/evento/rock-festival');

  assert.ok(getTitle() && getTitle().textContent === 'Em Destaque', 'Showcase exact title "Em Destaque" should be displayed');
  assert.ok(getLink(), 'Featured card should link to the first event');

  page.navigate('#/?q=rock');
  assert.equal(getTitle(), undefined, 'Showcase must hide when search filter is applied');

  page.navigate('#/?category=Show');
  assert.equal(getTitle(), undefined, 'Showcase must hide when category filter is applied');

  page.navigate('#/?city=São Paulo');
  assert.equal(getTitle(), undefined, 'Showcase must hide when city filter is applied');
});

test('Checkout flow fills valid Name/CPF, rejects invalid CPF, generates real voucher, and manages cart state', () => {
  const storage = memStorage();
  const page = mount(storage, '#/sacola');
  const cart = page.window.DanCart;
  const events = page.window.DanEvents.all();
  
  cart.save(cart.addItem(cart.emptyState(), {
    eventId: events[0].id, eventName: events[0].name,
    sectorId: events[0].sectors[0].id, sectorName: events[0].sectors[0].name,
    lotId: 'lote-1', lotName: 'Lote 1',
    type: 'inteira', qty: 2, unitCents: 15000
  }), storage);
  
  page.navigate('#/sacola');
  
  const checkoutBtn = page.find(n => n.tag === 'a' && (n.getAttribute('href') === '#/checkout' || n.href === '#/checkout'));
  assert.ok(checkoutBtn, 'Cart should have checkout link');
  
  page.navigate('#/checkout');
  
  const nameInputs = page.findAll(n => n.name && n.name.startsWith('nome'));
  const cpfInputs = page.findAll(n => n.name && n.name.startsWith('cpf'));
  
  assert.equal(nameInputs.length, 2, 'Should have 2 name inputs for 2 tickets');
  assert.equal(cpfInputs.length, 2, 'Should have 2 cpf inputs for 2 tickets');
  
  // Submit with invalid CPF
  nameInputs[0].value = 'Alice'; cpfInputs[0].value = '111'; // invalid CPF
  nameInputs[1].value = 'Bob'; cpfInputs[1].value = '222'; // invalid CPF
  const form = page.find(n => n.tag === 'form');
  form.fire('submit');
  
  assert.equal(page.window.location.hash, '#/checkout', 'Should block navigation if CPF is invalid');
  assert.match(page.app.textContent, /CPF inválido: 111/, 'Should show error for invalid CPF');
  
  // Empty name check
  nameInputs[0].value = ''; 
  const errContainer = page.find(n => n.className === 'checkout-errors');
  form.fire('submit');
  assert.equal(page.window.location.hash, '#/checkout', 'Should block navigation if name is empty');
  assert.match(page.app.textContent, /Preencha todos os campos/, 'Should show error for missing fields');

  nameInputs[0].value = 'Alice'; 
  
  // Submit with valid CPF
  cpfInputs[0].value = '12345678909'; // valid CPF
  cpfInputs[1].value = '00000000191'; // valid CPF
  
  form.fire('submit');
  
  assert.equal(page.window.location.hash, '#/voucher', 'Should navigate to voucher page');
  
  const voucherCode = page.find(n => n.className === 'voucher-code');
  assert.ok(voucherCode, 'Voucher code element should exist');
  assert.match(voucherCode.textContent, /Código: TKT-ABCD-1234/, 'Voucher should display crypto generated formatted code');
  assert.match(page.app.textContent, /Alice \(\*\*\*\.456\.789-\*\*\)/, 'Voucher must reference first holder masked CPF');
  assert.match(page.app.textContent, /Bob \(\*\*\*\.000\.001-\*\*\)/, 'Voucher must reference second holder masked CPF');
  
  const cartAfter = JSON.parse(storage._m['dan-tickets-cart']);
  assert.equal(cartAfter.items.length, 0, 'Cart should be empty after checkout');
  
  page.navigate('#/sacola');
  assert.equal(page.count.textContent, '0', 'Badge count should be 0');
  assert.match(page.app.textContent, /Sua sacola está vazia/, 'Cart page should reflect empty state');
});

test('Cart revalidation drops invalid items and prevents checkout of stale data', () => {
  const storage = memStorage();
  const page = mount(storage, '#/checkout');
  const cart = page.window.DanCart;
  const events = page.window.DanEvents.all();
  
  cart.save(cart.addItem(cart.emptyState(), {
    eventId: 'rock-festival', eventName: 'Rock in Dan',
    sectorId: 'pista', sectorName: 'Pista',
    lotId: 'lote-1', lotName: 'Lote 1',
    type: 'inteira', qty: 2, unitCents: 1000 // wrong price
  }), storage);

  cart.save(cart.addItem(cart.load(storage), {
    eventId: 'fake-event', eventName: 'Fake Event',
    sectorId: 'fake-sector', sectorName: 'Fake Sector',
    lotId: 'fake-lot', lotName: 'Fake Lot',
    type: 'inteira', qty: 1, unitCents: 100
  }), storage);

  page.navigate('#/checkout');
  
  // Fake event should be dropped, correct price should be updated
  const stored = JSON.parse(storage._m['dan-tickets-cart']);
  assert.equal(stored.items.length, 1, 'Invalid items should be dropped');
  assert.equal(stored.items[0].unitCents, 12000, 'Price should be corrected during revalidation');
});
test('Empty cart rejects checkout and direct voucher access shows no order', () => {
  const storage = memStorage();
  const page = mount(storage, '#/checkout');
  assert.match(page.app.textContent, /Sua sacola está vazia/, 'Empty cart checkout shows empty message');
  page.navigate('#/voucher');
  assert.match(page.app.textContent, /Nenhum pedido recente encontrado/, 'Direct voucher access without order is rejected');
});
test('isValidCPF boundary tests', () => {
  const ctx = vm.createContext({});
  vm.runInContext(read('app.js'), ctx);
  const isValidCPF = ctx.DanSectors.isValidCPF;
  
  assert.equal(isValidCPF('11111111111'), false, 'All-same digits should be invalid');
  assert.equal(isValidCPF(''), false, 'Empty string should be invalid');
  assert.equal(isValidCPF('1234567890'), false, '10 digits should be invalid');
  assert.equal(isValidCPF('123.456.789-09'), true, 'Formatted valid CPF should be true');
  assert.equal(isValidCPF('000.000.001-91'), true, 'CPF with leading zeros should be true');
});
