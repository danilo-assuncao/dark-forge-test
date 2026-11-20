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

  assert.match(result.protocol, /^PED-\d{4}$/);
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

const validOrder = (overrides = {}) => ({
  lineItems: [{ dishId: 'pri-risoto-cogumelos' }],
  distanceKm: 2,
  customerName: ' Alice ',
  address: ' Rua A, 123 ',
  ...overrides,
});

test('defaults tip and coupon and trims customer details', () => {
  const result = submitRestaurantOrder(validOrder());
  assert.strictEqual(result.customerName, 'Alice');
  assert.strictEqual(result.address, 'Rua A, 123');
  assert.deepStrictEqual(result.totals, {
    itemsSubtotalBrl: 58, discountBrl: 0, netSubtotalBrl: 58,
    deliveryFeeBrl: 7, tipBrl: 0, totalBrl: 65,
  });
});

test('prices extras and quantities from the catalog before coupon, fee and tip', () => {
  const input = validOrder({
    lineItems: [{
      dishId: 'ent-bruschetta', qty: 3, extras: ['molho-trufado'],
      doneness: 'bem-passado', notes: 'Sem sal', totalBrl: 1, unitPriceBrl: 1,
    }],
    distanceKm: 4.1, couponCode: ' danchef10 ', tipPct: 12,
  });
  const original = JSON.parse(JSON.stringify(input));
  const result = submitRestaurantOrder(input);
  assert.deepStrictEqual(result.items, [{
    dishId: 'ent-bruschetta', name: 'Bruschetta de tomate', qty: 3,
    extras: ['molho-trufado'], doneness: 'bem-passado', notes: 'Sem sal',
    unitPriceBrl: 34.9, totalBrl: 104.7,
  }]);
  assert.deepStrictEqual(result.totals, {
    itemsSubtotalBrl: 104.7, discountBrl: 10.47, netSubtotalBrl: 94.23,
    deliveryFeeBrl: 12, tipBrl: 11.31, totalBrl: 117.54,
  });
  assert.deepStrictEqual(input, original);
  result.items[0].extras.push('queijo-extra');
  assert.deepStrictEqual(input, original);
});

test('uses the longest preparation time and rounds fractional travel minutes up', () => {
  for (const [distanceKm, estimatedMinutes] of [[0, 45], [0.1, 46], [4.1, 58], [15, 90]]) {
    const result = submitRestaurantOrder(validOrder({
      lineItems: [
        { dishId: 'pri-moqueca-camarao', qty: 2 },
        { dishId: 'ent-bruschetta', qty: 3 },
      ],
      distanceKm,
    }));
    assert.strictEqual(result.estimatedMinutes, estimatedMinutes);
  }
});

test('rejects missing or empty line items and customer details', () => {
  for (const input of [undefined, null, {}, validOrder({ lineItems: [] }),
    validOrder({ lineItems: {} }), validOrder({ lineItems: null })]) {
    assert.throws(() => submitRestaurantOrder(input), /lineItems must be a non-empty array with at most 50 items/);
  }
  for (const field of ['customerName', 'address']) {
    for (const value of [undefined, null, '', ' \n ', 123]) {
      assert.throws(() => submitRestaurantOrder(validOrder({ [field]: value })), {
        name: 'TypeError', message: new RegExp(`${field} must be a valid string up to [0-9]+ characters without control characters`),
      });
    }
  }
});

test('propagates dish customization errors', () => {
  for (const item of [null, { dishId: 'unknown' },
    { dishId: 'pri-risoto-cogumelos', qty: 0 },
    { dishId: 'pri-risoto-cogumelos', extras: ['unknown'] },
    { dishId: 'pri-risoto-cogumelos', doneness: 'raw' }]) {
    assert.throws(() => submitRestaurantOrder(validOrder({ lineItems: [item] })), RangeError);
  }
  assert.throws(() => submitRestaurantOrder(validOrder({ lineItems: new Array(1) })), RangeError);
});

test('enforces delivery minimum, radius, tip and coupon validation', () => {
  const cases = [
    [{ lineItems: [{ dishId: 'beb-suco-laranja' }] }, /minimum/i],
    ...[undefined, null, -1, 15.1, NaN, Infinity, '2'].map(distanceKm => [{ distanceKm }, /distance/i]),
    [{ tipPct: 5 }, /tipPct/i],
    [{ couponCode: 'UNKNOWN' }, /Unknown coupon/i],
  ];
  for (const [overrides, errRegex] of cases) {
    assert.throws(() => submitRestaurantOrder(validOrder(overrides)), { name: 'RangeError', message: errRegex });
  }
});

test('pads protocol numbers to four digits', (t) => {
  const crypto = require('node:crypto');
  t.mock.method(crypto, 'randomInt', () => 0);
  assert.strictEqual(submitRestaurantOrder(validOrder()).protocol, 'PED-0000');
  crypto.randomInt.mock.mockImplementation(() => 9999);
  assert.strictEqual(submitRestaurantOrder(validOrder()).protocol, 'PED-9999');
});

test('rejects hostile or oversized free-text input and large lineItems', () => {
  const longName = 'A'.repeat(101);
  const longAddress = 'B'.repeat(301);
  assert.throws(() => submitRestaurantOrder(validOrder({ customerName: longName })), /valid string up to 100 characters/);
  assert.throws(() => submitRestaurantOrder(validOrder({ address: longAddress })), /valid string up to 300 characters/);
  assert.throws(() => submitRestaurantOrder(validOrder({ customerName: 'Alice\x00' })), /without control characters/);
  assert.throws(() => submitRestaurantOrder(validOrder({ address: 'Rua \n 123' })), /without control characters/);
  
  const manyItems = Array(51).fill({ dishId: 'pri-risoto-cogumelos' });
  assert.throws(() => submitRestaurantOrder(validOrder({ lineItems: manyItems })), /at most 50 items/);
});

test('applies coupon code but charges delivery fee if net subtotal drops below 120', () => {
  const result = submitRestaurantOrder({
    lineItems: [
      { dishId: 'pri-moqueca-camarao', qty: 1 }, // 79.9
      { dishId: 'ent-bruschetta', qty: 2 } // 49.8
    ],
    distanceKm: 2, 
    couponCode: 'DANCHEF10',
    customerName: 'Bob',
    address: 'Avenida B'
  });

  // Gross subtotal is 129.7. Discount is 12.97. Net is 116.73.
  // Net subtotal < 120, so delivery fee of 7.00 is applied.
  assert.strictEqual(result.totals.discountBrl, 12.97);
  assert.strictEqual(result.totals.deliveryFeeBrl, 7); 
});
