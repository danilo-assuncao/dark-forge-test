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

test('booking a space displays pass and updates conflict', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-20';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  doc.byId['attendees-input'].value = '1';
  doc.byId['filter-form'].dispatch('submit');
  
  let buttons = findButtons(doc, 'Reservar');
  const initialButtonCount = buttons.length;
  assert.ok(initialButtonCount > 0);
  
  // Retrieve the card of the first space
  const firstCard = doc.byId['spaces-list'].children[0];
  
  buttons[0].click(); // Book the first space
  
  assert.match(doc.byId['success-msg'].textContent, /Passe: HUB-[0-9A-F]{4}/);
  
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
  doc.byId['date-input'].value = '2026-11-21';
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
  doc.byId['date-input'].value = '2026-11-22';
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
  doc.byId['date-input'].value = '2026-11-25';
  doc.byId['attendees-input'].value = '999';
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Nenhum espaço disponível para essa capacidade/);
});

test('start hour equal to end hour shows invalid hours', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-25';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '10';
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Horário inválido/);
});

test('amenity checked reflects in total', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-26';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '11'; // 1 hour
  doc.byId['attendees-input'].value = '1'; // 1 attendee
  
  // hot-desk price is 22. Coffee-break is 28/attendee
  const checkboxes = doc.querySelectorAll('.amenity-cb');
  const coffeeBreakCb = checkboxes.find(cb => cb.value === 'coffee-break');
  if (coffeeBreakCb) coffeeBreakCb.checked = true;
  
  doc.byId['filter-form'].dispatch('submit');
  
  const text = doc.byId['spaces-list'].textContent.replace(/\u00A0/g, ' ');
  assert.match(text, /Total: R\$ 50,00/); // 22 + 28
});

test('bookSlot catch path calls alert', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-27';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10';
  doc.byId['filter-form'].dispatch('submit');
  
  let alerted = false;
  globalThis.alert = () => { alerted = true; };
  
  // force quote to succeed, but book to fail
  const originalBook = App.scheduler.bookSlot;
  App.scheduler.bookSlot = () => { throw new Error('Simulated error'); };
  
  const buttons = findButtons(doc, 'Reservar');
  buttons[0].click();
  
  assert.ok(alerted);
  App.scheduler.bookSlot = originalBook;
  delete globalThis.alert;
});

test('DOM rendering is safe against XSS', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-28';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  
  const originalQuote = App.scheduler.quoteSlot;
  App.scheduler.quoteSlot = () => { throw new Error('<script>alert(1)</script>'); };
  
  doc.byId['filter-form'].dispatch('submit');
  
  // Check that the textContent preserves the script tag as plain text
  const text = doc.byId['spaces-list'].textContent;
  assert.match(text, /<script>alert\(1\)<\/script>/);
  
  App.scheduler.quoteSlot = originalQuote;
});

test('quoteSlot error branch renders error message', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-29';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10';
  doc.byId['attendees-input'].value = '1';
  
  const originalQuote = App.scheduler.quoteSlot;
  App.scheduler.quoteSlot = () => { throw new Error('Quote error injected'); };
  
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Quote error injected/);
  
  App.scheduler.quoteSlot = originalQuote;
});

test('empty date renders nothing', () => {
  App.resetScheduler();
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '';
  doc.byId['filter-form'].dispatch('submit');
  assert.equal(doc.byId['spaces-list'].textContent, '');
});

test('shim provides valid exports and fallback crypto', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  
  const ctx = {
    window: {
      crypto: {
        getRandomValues: (arr) => { arr.fill(42); }
      }
    }
  };
  vm.createContext(ctx);
  
  const shimSrc = fs.readFileSync(path.join(__dirname, '../shim.js'), 'utf8');
  vm.runInContext(shimSrc, ctx);
  
  assert.ok(ctx.window.module);
  assert.equal(typeof ctx.window.require, 'function');
  
  const cryptoMock = ctx.window.require('node:crypto');
  const uuid = cryptoMock.randomUUID();
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  
  ctx.window.spacesAPI = { isSpaces: true };
  assert.equal(ctx.window.require('./spaces').isSpaces, true);
});
