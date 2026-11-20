const test = require('node:test');
const assert = require('node:assert');
const { submitRestaurantOrder } = require('../order.js');

test('submitRestaurantOrder creates a valid order', () => {
  const result = submitRestaurantOrder({
    lineItems: [
      { dishId: 'ent-bruschetta', qty: 2 },
      { dishId: 'pri-risoto-cogumelos', doneness: 'ao-ponto', qty: 1 }
    ],
    distanceKm: 5,
    tipPct: 10,
    customerName: 'Alice',
    address: 'Rua A, 123'
  });

  assert.ok(result.protocol.startsWith('PED-'));
  assert.strictEqual(result.protocol.length, 8); // PED-XXXX
  assert.strictEqual(result.customerName, 'Alice');
  assert.strictEqual(result.address, 'Rua A, 123');
  assert.strictEqual(result.items.length, 2);
  
  // Bruschetta: 24.9 * 2 = 49.8
  // Risoto: 58.0 * 1 = 58.0
  // Subtotal = 107.8
  assert.strictEqual(result.totals.itemsSubtotalBrl, 107.8);
  
  // prep minutes: bruschetta (10), risoto (30). Max = 30.
  // estimated = 30 + Math.ceil(5 * 3) + 10 = 30 + 15 + 10 = 55.
  assert.strictEqual(result.estimatedMinutes, 55);
});

test('submitRestaurantOrder fails on invalid customer', () => {
  assert.throws(() => {
    submitRestaurantOrder({
      lineItems: [{ dishId: 'ent-bruschetta' }],
      distanceKm: 5,
      customerName: '   ',
      address: 'Rua A, 123'
    });
  }, TypeError);
});

test('submitRestaurantOrder applies coupon code', () => {
  const result = submitRestaurantOrder({
    lineItems: [
      { dishId: 'pri-moqueca-camarao', qty: 2 } // 79.9 * 2 = 159.8
    ],
    distanceKm: 2, // Fee: 700 cents, but subtotal > 120 so fee = 0
    couponCode: 'DANCHEF10',
    customerName: 'Bob',
    address: 'Avenida B'
  });

  // discount: 10% of 159.8 = 15.98
  assert.strictEqual(result.totals.discountBrl, 15.98);
  assert.strictEqual(result.totals.deliveryFeeBrl, 0); // free delivery
});
