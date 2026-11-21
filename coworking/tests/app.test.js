'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const App = require('../app.js');

class FakeNode {
  constructor(tag, doc) {
    this.tag = tag;
    this.doc = doc;
    this.children = [];
    this.className = '';
    this.value = '';
    this._text = '';
    this.type = '';
    this.checked = false;
    this.listeners = {};
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  dispatch(t, extra) {
    const e = Object.assign({ preventDefault() { this.prevented = true; }, prevented: false }, extra);
    (this.listeners[t] || []).forEach((f) => f(e));
    return e;
  }
  click() { return this.dispatch('click'); }
  querySelectorAll(sel) {
    const out = [];
    this.find((n) => n.className === sel.replace('.', ''), out);
    return out;
  }
  find(pred, out) {
    if (pred(this)) out.push(this);
    this.children.forEach((c) => c.find(pred, out));
  }
  get classList() {
    return {
      add: (c) => {
        const classes = this.className.split(' ').filter(Boolean);
        if (!classes.includes(c)) classes.push(c);
        this.className = classes.join(' ');
      }
    };
  }
}

function fakeDoc() {
  const doc = { byId: {} };
  doc.createElement = (t) => new FakeNode(t, doc);
  doc.getElementById = (id) => doc.byId[id] || null;
  doc.createTextNode = (text) => {
    const n = new FakeNode('text', doc);
    n.textContent = text;
    return n;
  };
  doc.querySelectorAll = (sel) => {
    // Collect from body (simulated)
    const out = [];
    Object.values(doc.byId).forEach(n => {
      n.find(child => child.className === sel.replace('.', ''), out);
    });
    return out;
  };

  const ids = [
    'filter-form', 'date-input', 'attendees-input', 'start-input', 'end-input',
    'coupon-input', 'amenities-container', 'search-btn', 'success-msg', 'spaces-list'
  ];
  ids.forEach(id => { doc.byId[id] = new FakeNode('div', doc); });
  return doc;
}

function findButtons(doc, text) {
  const out = [];
  doc.byId['spaces-list'].find(n => n.tag === 'button' && n.textContent === text, out);
  return out;
}

test('initialization populates amenities', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  const container = doc.byId['amenities-container'];
  assert.ok(container.children.length > 0);
  assert.match(container.textContent, /coffee-break/);
});

test('renderSpaces displays no spaces if invalid hours', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-20';
  doc.byId['start-input'].value = '15';
  doc.byId['end-input'].value = '10'; // Start > End
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Horário inválido/);
});

test('booking a space displays booking confirmation and updates conflict', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-20';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  doc.byId['attendees-input'].value = '1';
  
  // Set amenities
  const checkboxes = doc.querySelectorAll('.amenity-cb');
  const coffeeBreakCb = checkboxes.find(cb => cb.value === 'coffee-break');
  assert.ok(coffeeBreakCb);
  coffeeBreakCb.checked = true;
  
  doc.byId['filter-form'].dispatch('submit');
  
  let buttons = findButtons(doc, 'Reservar');
  const initialButtonCount = buttons.length;
  assert.ok(initialButtonCount > 0);
  
  // Retrieve the card of the first space
  const firstCard = doc.byId['spaces-list'].children[0];
  
  buttons[0].click(); // Book the first space
  
  assert.match(doc.byId['success-msg'].textContent, /Reserva de .* confirmada/);
  assert.match(doc.byId['success-msg'].textContent, /Total do pacote:/);
  assert.match(doc.byId['success-msg'].textContent, /Serviços inclusos: coffee-break/);
  
  // Re-render happens. The booked space should now show conflict
  const newFirstCard = doc.byId['spaces-list'].children[0];
  assert.match(newFirstCard.className, /conflict/);
  
  buttons = findButtons(doc, 'Reservar');
  assert.equal(buttons.length, initialButtonCount - 1);
});

test('applies DANHUB15 coupon successfully', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-21';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10'; // 2 hours
  doc.byId['attendees-input'].value = '1';
  doc.byId['coupon-input'].value = 'DANHUB15';
  doc.byId['filter-form'].dispatch('submit');
  
  // price for hot-desk (id 0) is 22/hr -> 44. 15% discount -> 6.6 -> total 37.40
  // Handle non-breaking spaces emitted by toLocaleString
  const text = doc.byId['spaces-list'].textContent.replace(/\u00A0/g, ' ');
  assert.match(text, /Total: R\$ 37,40/);
  assert.match(text, /Desconto: R\$ 6,60/);
});

test('invalid coupon does not apply discount', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-22';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10'; // 2 hours
  doc.byId['attendees-input'].value = '1';
  doc.byId['coupon-input'].value = 'INVALID';
  doc.byId['filter-form'].dispatch('submit');
  
  const text = doc.byId['spaces-list'].textContent;
  assert.doesNotMatch(text, /Desconto:/);
});

test('attendees above maximum capacity shows no spaces', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-25';
  doc.byId['attendees-input'].value = '999';
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Nenhum espaço disponível para essa capacidade/);
});

test('start hour equal to end hour shows invalid hours', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-25';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '10';
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Horário inválido/);
});

test('amenity checked reflects in total', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-26';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '11'; // 1 hour
  doc.byId['attendees-input'].value = '1'; // 1 attendee
  
  // hot-desk price is 22. Coffee-break is 28/attendee
  const checkboxes = doc.querySelectorAll('.amenity-cb');
  const coffeeBreakCb = checkboxes.find(cb => cb.value === 'coffee-break');
  assert.ok(coffeeBreakCb);
  coffeeBreakCb.checked = true;
  
  doc.byId['filter-form'].dispatch('submit');
  
  const text = doc.byId['spaces-list'].textContent.replace(/\u00A0/g, ' ');
  assert.match(text, /Total: R\$ 50,00/); // 22 + 28
});

test('bookSlot catch path calls alert', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-27';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10';
  doc.byId['filter-form'].dispatch('submit');
  
  let alerted = false;
  globalThis.alert = () => { alerted = true; };
  
  // force quote to succeed, but book to fail
  const originalBook = App.scheduler.bookSlot;
  try {
    App.scheduler.bookSlot = () => { throw new Error('Simulated error'); };
    
    const buttons = findButtons(doc, 'Reservar');
    buttons[0].click();
    
    assert.ok(alerted);
  } finally {
    App.scheduler.bookSlot = originalBook;
    delete globalThis.alert;
  }
});

test('DOM rendering is safe against XSS', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-28';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  
  let innerHTMLSet = false;
  
  // Patch FakeNode to throw if innerHTML is used
  Object.defineProperty(doc.byId['spaces-list'], 'innerHTML', {
    set(v) { innerHTMLSet = true; }
  });
  
  const originalQuote = App.scheduler.quoteSlot;
  try {
    App.scheduler.quoteSlot = () => { throw new Error('<script>alert(1)</script>'); };
    
    doc.byId['filter-form'].dispatch('submit');
    
    // Check that the textContent preserves the script tag as plain text
    const text = doc.byId['spaces-list'].textContent;
    assert.match(text, /<script>alert\(1\)<\/script>/);
    assert.ok(!innerHTMLSet, 'innerHTML should not be set');
  } finally {
    App.scheduler.quoteSlot = originalQuote;
  }
});

test('quoteSlot error branch renders error message', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-11-29';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10';
  doc.byId['attendees-input'].value = '1';
  
  const originalQuote = App.scheduler.quoteSlot;
  try {
    App.scheduler.quoteSlot = () => { throw new Error('Quote error injected'); };
    
    doc.byId['filter-form'].dispatch('submit');
    assert.match(doc.byId['spaces-list'].textContent, /Quote error injected/);
  } finally {
    App.scheduler.quoteSlot = originalQuote;
  }
});

test('empty date renders nothing', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '';
  doc.byId['filter-form'].dispatch('submit');
  assert.equal(doc.byId['spaces-list'].textContent, '');
});

test('conflict checks handle boundaries correctly', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  
  // Book 10-12
  doc.byId['date-input'].value = '2099-12-01';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  doc.byId['filter-form'].dispatch('submit');
  
  let buttons = findButtons(doc, 'Reservar');
  buttons[0].click(); // Book the first space
  
  // Try 12-14 (adjacent) -> no conflict
  doc.byId['start-input'].value = '12';
  doc.byId['end-input'].value = '14';
  doc.byId['filter-form'].dispatch('submit');
  
  let firstCard = doc.byId['spaces-list'].children[0];
  assert.doesNotMatch(firstCard.className, /conflict/);
  
  // Try 11-13 (partial overlap) -> conflict
  doc.byId['start-input'].value = '11';
  doc.byId['end-input'].value = '13';
  doc.byId['filter-form'].dispatch('submit');
  
  firstCard = doc.byId['spaces-list'].children[0];
  assert.match(firstCard.className, /conflict/);
  
  // Try 9-13 (containment) -> conflict
  doc.byId['start-input'].value = '9';
  doc.byId['end-input'].value = '13';
  doc.byId['filter-form'].dispatch('submit');
  
  firstCard = doc.byId['spaces-list'].children[0];
  assert.match(firstCard.className, /conflict/);
});

test('listSpaces error branch renders error message', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2099-12-02';
  
  const spacesAPI = require('../spaces.js');
  const originalListSpaces = spacesAPI.listSpaces;
  try {
    spacesAPI.listSpaces = () => { throw new Error('Simulated listSpaces error'); };
    doc.byId['filter-form'].dispatch('submit');
    assert.match(doc.byId['spaces-list'].textContent, /Erro ao buscar espaços: Simulated listSpaces error/);
  } finally {
    spacesAPI.listSpaces = originalListSpaces;
  }
});
test('shim loads modules correctly into window context', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  
  const ctx = {
    crypto: {
      getRandomValues: (arr) => { arr.fill(42); }
    },
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ addEventListener: () => {} })
    },
    addEventListener: () => {}
  };
  ctx.window = ctx; // Make window reference itself like in a browser
  vm.createContext(ctx);
  
  const scripts = [
    '../shim.js',
    '../spaces.js',
    '../save-spaces.js',
    '../bookings.js',
    '../save-bookings.js',
    '../amenities.js',
    '../save-amenities.js',
    '../cleanup.js',
    '../app.js'
  ];
  
  for (const script of scripts) {
    const src = fs.readFileSync(path.join(__dirname, script), 'utf8');
    vm.runInContext(src, ctx);
  }
  
  // Assert window APIs
  assert.ok(ctx.window.spacesAPI, 'spacesAPI is defined');
  assert.ok(ctx.window.bookingsAPI, 'bookingsAPI is defined');
  assert.ok(ctx.window.amenitiesAPI, 'amenitiesAPI is defined');
  assert.ok(ctx.window.CoworkingApp, 'CoworkingApp is defined');
  
  // Assert APIs are distinct
  assert.notEqual(ctx.window.spacesAPI, ctx.window.bookingsAPI);
  
  // Assert globals cleaned up
  assert.equal(typeof ctx.window.require, 'undefined', 'require cleaned up');
  assert.equal(typeof ctx.window.module, 'undefined', 'module cleaned up');
});
