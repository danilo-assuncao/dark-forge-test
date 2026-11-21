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
  const doc = fakeDoc();
  App.init(doc);
  const container = doc.byId['amenities-container'];
  assert.ok(container.children.length > 0);
  assert.match(container.textContent, /coffee-break/);
});

test('renderSpaces displays no spaces if invalid hours', () => {
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-20';
  doc.byId['start-input'].value = '15';
  doc.byId['end-input'].value = '10'; // Start > End
  doc.byId['filter-form'].dispatch('submit');
  assert.match(doc.byId['spaces-list'].textContent, /Horário inválido/);
});

test('booking a space displays pass and updates conflict', () => {
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-20';
  doc.byId['start-input'].value = '10';
  doc.byId['end-input'].value = '12';
  doc.byId['attendees-input'].value = '1';
  doc.byId['filter-form'].dispatch('submit');
  
  const buttons = findButtons(doc, 'Reservar');
  assert.ok(buttons.length > 0);
  
  buttons[0].click(); // Book the first space
  
  assert.match(doc.byId['success-msg'].textContent, /Passe: HUB-\d{4}/);
  
  // Re-render happens. The booked space should now show conflict
  assert.match(doc.byId['spaces-list'].textContent, /Conflito na agenda/);
});

test('applies DANHUB15 coupon successfully', () => {
  const doc = fakeDoc();
  App.init(doc);
  doc.byId['date-input'].value = '2026-11-21';
  doc.byId['start-input'].value = '8';
  doc.byId['end-input'].value = '10'; // 2 hours
  doc.byId['attendees-input'].value = '1';
  doc.byId['coupon-input'].value = 'DANHUB15';
  doc.byId['filter-form'].dispatch('submit');
  
  // price for hot-desk (id 0) is 22/hr -> 44. 15% discount -> 6.6 -> total 37.40
  assert.match(doc.byId['spaces-list'].textContent, /Desconto:/);
});
