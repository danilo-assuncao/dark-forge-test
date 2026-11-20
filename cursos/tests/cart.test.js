'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Cart = require('../cart.js');

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

test('cart initializes empty', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  const t = cart.totals();
  assert.equal(t.subtotalCents, 0);
  assert.equal(t.totalCents, 0);
  assert.equal(t.passeAnual, false);
  assert.deepEqual(t.courses, []);
  assert.deepEqual(t.lines, []);
  assert.equal(t.coupon, null);
  assert.equal(t.discountCents, 0);
});

test('can add and remove avulso courses', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  
  assert.ok(cart.addCurso('algoritmos-101'));
  let t = cart.totals();
  assert.deepEqual(t.courses, ['algoritmos-101']);
  assert.equal(t.subtotalCents, Cart.PRICE_AVULSO_CENTS);
  assert.equal(t.totalCents, Cart.PRICE_AVULSO_CENTS);

  assert.ok(cart.addCurso('sql-fundamentos'));
  t = cart.totals();
  assert.deepEqual(t.courses, ['algoritmos-101', 'sql-fundamentos']);
  assert.equal(t.subtotalCents, Cart.PRICE_AVULSO_CENTS * 2);

  // adding again has no effect
  cart.addCurso('sql-fundamentos');
  t = cart.totals();
  assert.equal(t.courses.length, 2);

  assert.ok(cart.removeCurso('algoritmos-101'));
  t = cart.totals();
  assert.deepEqual(t.courses, ['sql-fundamentos']);
  assert.equal(t.subtotalCents, Cart.PRICE_AVULSO_CENTS);
  
  assert.ok(!cart.removeCurso('inexistente'));
});

test('can set passe anual', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  
  assert.ok(cart.setPasseAnual(true));
  let t = cart.totals();
  assert.equal(t.passeAnual, true);
  assert.equal(t.subtotalCents, Cart.PRICE_PASSE_ANUAL_CENTS);

  assert.ok(cart.setPasseAnual(false));
  t = cart.totals();
  assert.equal(t.passeAnual, false);
  assert.equal(t.subtotalCents, 0);
});

test('computes totals for both courses and passe anual', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  cart.addCurso('algoritmos-101');
  cart.setPasseAnual(true);
  
  const t = cart.totals();
  assert.equal(t.subtotalCents, Cart.PRICE_AVULSO_CENTS + Cart.PRICE_PASSE_ANUAL_CENTS);
  assert.equal(t.lines.length, 2);
  assert.equal(t.lines[0].type, 'curso');
  assert.equal(t.lines[1].type, 'passe_anual');
});

test('applies DANEDU10 coupon', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  cart.setPasseAnual(true);
  
  assert.ok(cart.applyCoupon('danedu10')); // Case insensitive
  const t = cart.totals();
  assert.equal(t.coupon, 'DANEDU10');
  
  const expectedSubtotal = Cart.PRICE_PASSE_ANUAL_CENTS;
  const expectedDiscount = Math.round(expectedSubtotal * 0.1);
  
  assert.equal(t.subtotalCents, expectedSubtotal);
  assert.equal(t.discountCents, expectedDiscount);
  assert.equal(t.totalCents, expectedSubtotal - expectedDiscount);
});

test('persists cart state', () => {
  const storage = createMemoryStorage();
  const cart1 = Cart.create({ storage });
  
  cart1.addCurso('algoritmos-101');
  cart1.setPasseAnual(true);
  cart1.applyCoupon('DANEDU10');
  
  const cart2 = Cart.create({ storage });
  const t = cart2.totals();
  
  assert.deepEqual(t.courses, ['algoritmos-101']);
  assert.equal(t.passeAnual, true);
  assert.equal(t.coupon, 'DANEDU10');
});

test('clear cart resets state', () => {
  const cart = Cart.create({ storage: createMemoryStorage() });
  cart.addCurso('algoritmos-101');
  cart.setPasseAnual(true);
  cart.applyCoupon('DANEDU10');
  
  assert.ok(cart.clear());
  
  const t = cart.totals();
  assert.equal(t.subtotalCents, 0);
  assert.equal(t.courses.length, 0);
  assert.equal(t.passeAnual, false);
  assert.equal(t.coupon, null);
});
