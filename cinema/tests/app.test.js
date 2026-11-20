'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { el, initApp, resetOccupiedSeats, globalOccupiedSeats } = require('../app.js');

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this._textContent = '';
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.value = '';
    this.checked = false;
    this.selected = false;
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  appendChild(c) { this.children.push(c); }
  removeChild(c) { this.children = this.children.filter(x => x !== c); }
  addEventListener(evt, cb) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(cb);
  }
  dispatchEvent(evt) {
    if (this.listeners[evt.type]) {
      this.listeners[evt.type].forEach(cb => cb({ target: this, ...evt }));
    }
  }
  click() {
    this.dispatchEvent({ type: 'click' });
  }
  get textContent() {
    if (this.children.length > 0) return this.children.map(c => c.textContent).join('');
    return this._textContent || '';
  }
  set textContent(val) {
    this._textContent = val;
    this.children = [];
  }
}

test('el creates element with correct tag and properties', (t) => {
  const originalDoc = global.document;
  global.document = { createElement: tag => new FakeElement(tag) };
  try {
    const btn = el('button', { className: 'test-btn', textContent: 'Click Me', id: 'b1' });
    assert.strictEqual(btn.tagName, 'BUTTON');
    assert.strictEqual(btn.className, 'test-btn');
    assert.strictEqual(btn.textContent, 'Click Me');
    assert.strictEqual(btn.attributes['id'], 'b1');
  } finally {
    global.document = originalDoc;
  }
});

test('el rejects unsafe event handlers and attributes', (t) => {
  const originalDoc = global.document;
  global.document = { createElement: tag => new FakeElement(tag) };
  try {
    assert.throws(() => el('div', { onclick: 'alert(1)' }), TypeError);
    assert.throws(() => el('a', { href: 'javascript:alert(1)' }), Error);
    assert.throws(() => el('div', { innerHTML: '<b>bad</b>' }), Error);
  } finally {
    global.document = originalDoc;
  }
});

test('el securely sets textContent without creating elements', (t) => {
  const originalDoc = global.document;
  global.document = { createElement: tag => new FakeElement(tag) };
  try {
    const maliciousStr = '<img src=x onerror=alert(1)>';
    const d = el('div', { textContent: maliciousStr });
    assert.strictEqual(d._textContent, maliciousStr);
    assert.strictEqual(d.children.length, 0);
  } finally {
    global.document = originalDoc;
  }
});

test('initApp renders initial state without errors', (t) => {
  const originalDoc = global.document;
  global.document = { createElement: tag => new FakeElement(tag) };
  try {
    const root = new FakeElement('div');
    initApp(root);
    assert.strictEqual(root.children.length, 1);
    const container = root.children[0];
    assert.strictEqual(container.tagName, 'DIV');
    assert.strictEqual(container.className, 'container');
  } finally {
    global.document = originalDoc;
  }
});

test('SPA full flow: filter, select session, book seats, error handling', (t) => {
  const originalDoc = global.document;
  global.document = { createElement: tag => new FakeElement(tag) };
  try {
    resetOccupiedSeats();
    const root = new FakeElement('div');
    initApp(root);
    
    // Select movie "Fronteira Final" (index 1 of rating 16 filtered list)
    const moviesList = root.children[0].children[2].children[1];
    moviesList.children[1].click(); // Fronteira Final

    // Select session 'ses-002'
    const sessionsList = root.children[0].children[3].children[1];
    sessionsList.children[0].click(); // First session of Fronteira Final

    // Pick a seat 'A1'
    let seatGrid = root.children[0].children[4].children[2];
    let a1 = seatGrid.children[0].children[0];
    a1.click();
    
    // Fetch a1 again after re-render
    seatGrid = root.children[0].children[4].children[2];
    a1 = seatGrid.children[0].children[0];
    assert.strictEqual(a1.className.includes('selected'), true);

    // Empty buyername -> error
    const checkoutSect = root.children[0].children[6];
    const checkoutBtn = checkoutSect.children[3];
    checkoutBtn.click();
    
    // Check error shown
    const errorDiv = root.children[0].children[1];
    assert.strictEqual(errorDiv.className, 'error');
    assert.ok(errorDiv.textContent.includes('buyerName'));
    
    // Set buyername with XSS payload and valid coupon
    const nameInput = checkoutSect.children[1];
    const couponInput = checkoutSect.children[2];
    nameInput.value = '<script>alert(1)</script>';
    nameInput.dispatchEvent({ type: 'input' });
    couponInput.value = 'DANCINE15';
    couponInput.dispatchEvent({ type: 'input' });

    // Checkout again
    root.children[0].children[7].children[3].click(); // The structure changed because error div is added at [1]
    
    // Now voucher should be rendered
    const voucher = root.children[0].children[1];
    assert.strictEqual(voucher.className, 'voucher');
    assert.ok(voucher.textContent.includes('Protocolo: CINE-0000'));
    // Ensure buyer name is literal and not parsed
    assert.ok(voucher.textContent.includes('<script>alert(1)</script>'));
    
    // Seats are now occupied in global state
    assert.ok(globalOccupiedSeats['ses-002'].includes('A1'));

    // Nova Compra
    root.children[0].children[2].click();
    assert.strictEqual(root.children[0].children.length, 3); // title, filters, movies

  } finally {
    global.document = originalDoc;
    resetOccupiedSeats();
  }
});
