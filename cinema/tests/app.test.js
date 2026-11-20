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

function findElements(node, predicate) {
  let results = [];
  if (predicate(node)) results.push(node);
  for (const child of node.children) {
    results.push(...findElements(child, predicate));
  }
  return results;
}

function findByClass(node, cls) {
  return findElements(node, n => n.className && n.className.includes(cls));
}

function findByTag(node, tag) {
  return findElements(node, n => n.tagName === tag.toUpperCase());
}

function findByText(node, text) {
  return findElements(node, n => n.textContent && n.textContent.includes(text));
}

function withDOM(fn) {
  return () => {
    const originalDoc = global.document;
    global.document = { createElement: tag => new FakeElement(tag) };
    try {
      resetOccupiedSeats();
      fn();
    } finally {
      global.document = originalDoc;
      resetOccupiedSeats();
    }
  };
}

test('el creates element with correct tag and properties', withDOM(() => {
  const btn = el('button', { className: 'test-btn', textContent: 'Click Me', id: 'b1' });
  assert.strictEqual(btn.tagName, 'BUTTON');
  assert.strictEqual(btn.className, 'test-btn');
  assert.strictEqual(btn.textContent, 'Click Me');
  assert.strictEqual(btn.attributes['id'], 'b1');
}));

test('el rejects unsafe event handlers and attributes', withDOM(() => {
  assert.throws(() => el('div', { onclick: 'alert(1)' }), TypeError);
  assert.throws(() => el('div', { onChange: 'alert(1)' }), TypeError);
  
  const unsafeAttrs = ['href', 'src', 'style', 'srcdoc', 'innerHTML', 'formaction', 'action', 'poster', 'data', 'srcset', 'xlink:href', 'ping'];
  for (const attr of unsafeAttrs) {
    assert.throws(() => el('a', { [attr]: 'javascript:alert(1)' }), Error, `Should reject ${attr}`);
    assert.throws(() => el('a', { [attr.toUpperCase()]: 'javascript:alert(1)' }), Error, `Should reject ${attr.toUpperCase()}`);
  }
}));

test('el securely sets textContent without creating elements', withDOM(() => {
  const maliciousStr = '<img src=x onerror=alert(1)>';
  const d = el('div', { textContent: maliciousStr });
  assert.strictEqual(d._textContent, maliciousStr);
  assert.strictEqual(d.children.length, 0);
}));

test('initApp renders initial state without errors', withDOM(() => {
  const root = new FakeElement('div');
  initApp(root);
  assert.strictEqual(root.children.length, 1);
  const container = root.children[0];
  assert.strictEqual(container.tagName, 'DIV');
  assert.strictEqual(container.className, 'container');
}));

test('SPA full flow: filter, select session, book seats, errors, voucher, reset', withDOM(() => {
  const root = new FakeElement('div');
  initApp(root);
  
  // Test whitespace genre handling (should not throw and should render movies)
  let genreInput = findByTag(root, 'input').find(n => n.attributes.placeholder === 'Gênero');
  genreInput.value = '   ';
  genreInput.dispatchEvent({ type: 'change' });
  let movies = findByClass(root, 'movie-item');
  assert.ok(movies.length > 0, 'Movies should be rendered when genre is whitespace');
  
  // Select movie "Fronteira Final"
  let movieItem = movies.find(m => m.textContent.includes('Fronteira Final'));
  movieItem.click();
  
  // Select session
  let sessionItem = findByClass(root, 'session-item')[0];
  sessionItem.click();
  
  // Pick a seat 'A1'
  let a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  a1.click();
  
  // Refetch A1 to check if selected
  a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  assert.strictEqual(a1.className.includes('selected'), true);

  // Try clicking it again to deselect
  a1.click();
  a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  assert.strictEqual(a1.className.includes('selected'), false);

  // Select it back
  a1.click();

  // Test Snacks (+ / - bounds)
  for(let i=0; i<15; i++) {
    let addBtn = findElements(findByClass(root, 'snack-item')[0], n => n.tagName === 'BUTTON' && n.textContent === '+')[0];
    addBtn.click();
  }
  
  let qtySpan = findElements(findByClass(root, 'snack-item')[0], n => n.tagName === 'SPAN')[1];
  assert.strictEqual(qtySpan.textContent, '10', 'Qty should clamp at 10');

  for(let i=0; i<15; i++) {
    let minusBtn = findElements(findByClass(root, 'snack-item')[0], n => n.tagName === 'BUTTON' && n.textContent === '-')[0];
    minusBtn.click();
  }
  
  // Item shouldn't be in order state, qty visual should reset to 0
  qtySpan = findElements(findByClass(root, 'snack-item')[0], n => n.tagName === 'SPAN')[1];
  assert.strictEqual(qtySpan.textContent, '0', 'Qty should allow removal down to 0');
  
  // Add 1 snack back
  let addBtn = findElements(findByClass(root, 'snack-item')[0], n => n.tagName === 'BUTTON' && n.textContent === '+')[0];
  addBtn.click();

  // Pick ticket kind half
  let halfTicketInput = findElements(root, n => n.tagName === 'INPUT' && n.attributes.value === 'half')[0];
  halfTicketInput.checked = true;
  halfTicketInput.dispatchEvent({ type: 'change' });

  // Empty buyername -> error
  let checkoutBtn = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'Finalizar Compra')[0];
  checkoutBtn.click();
  
  let errorDiv = findByClass(root, 'error')[0];
  assert.ok(errorDiv.textContent.includes('buyerName'));
  
  // Changing filter should clear error
  genreInput = findByTag(root, 'input').find(n => n.attributes.placeholder === 'Gênero');
  genreInput.value = '';
  genreInput.dispatchEvent({ type: 'change' });
  
  errorDiv = findByClass(root, 'error')[0];
  assert.strictEqual(errorDiv, undefined, 'Error should be cleared on filter change');

  // Relocating back to session
  movies = findByClass(root, 'movie-item');
  movieItem = movies.find(m => m.textContent.includes('Fronteira Final'));
  movieItem.click();
  sessionItem = findByClass(root, 'session-item')[0];
  sessionItem.click();
  
  // Select seat A1 again and A2
  a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  a1.click();
  let a2 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A2')[0];
  a2.click();

  let nameInput = findByTag(root, 'input').find(n => n.attributes.placeholder === 'Nome do Comprador');
  let couponInput = findByTag(root, 'input').find(n => n.attributes.placeholder === 'Cupom');
  
  // Invalid coupon test
  nameInput.value = 'John';
  nameInput.dispatchEvent({ type: 'input' });
  couponInput.value = 'INVALID123';
  couponInput.dispatchEvent({ type: 'input' });
  
  // Actually buildCinemaOrder ignores invalid coupon and applies 0 discount
  // We'll just complete checkout.
  checkoutBtn = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'Finalizar Compra')[0];
  checkoutBtn.click();

  let voucher = findByClass(root, 'voucher')[0];
  assert.ok(voucher, 'Voucher should be rendered');
  assert.ok(voucher.textContent.includes('Total: R$'), 'Voucher total should be present');
  
  // Seats are occupied
  assert.ok(globalOccupiedSeats['ses-002'].includes('A1'));
  assert.ok(globalOccupiedSeats['ses-002'].includes('A2'));

  // Nova Compra
  let novaCompraBtn = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'Nova Compra')[0];
  novaCompraBtn.click();

  // Select same session again
  movies = findByClass(root, 'movie-item');
  movieItem = movies.find(m => m.textContent.includes('Fronteira Final'));
  movieItem.click();
  sessionItem = findByClass(root, 'session-item')[0];
  sessionItem.click();

  // A1 and A2 should be occupied
  a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  a2 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A2')[0];
  assert.strictEqual(a1.className.includes('occupied'), true);
  assert.strictEqual(a2.className.includes('occupied'), true);

  // Try selecting occupied seat A1
  a1.click();
  a1 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A1')[0];
  assert.strictEqual(a1.className.includes('selected'), false, 'Cannot select occupied seat');

  // Double-booking guard
  // Simulate state manipulation to select A1 directly
  let a3 = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'A3')[0];
  a3.click();
  
  // We manipulate globalOccupiedSeats manually to simulate a race condition where seat was occupied before checkout
  globalOccupiedSeats['ses-002'].push('A3');
  
  nameInput = findByTag(root, 'input').find(n => n.attributes.placeholder === 'Nome do Comprador');
  nameInput.value = 'John 2';
  nameInput.dispatchEvent({ type: 'input' });

  checkoutBtn = findElements(root, n => n.tagName === 'BUTTON' && n.textContent === 'Finalizar Compra')[0];
  checkoutBtn.click();

  errorDiv = findByClass(root, 'error')[0];
  assert.ok(errorDiv.textContent.includes('já ocupada'), 'Should throw double-booking error');
}));
