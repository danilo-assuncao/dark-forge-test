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
    assert.throws(() => submitRestaurantOrder(input), /lineItems must be a non-empty array/);
  }
  for (const field of ['customerName', 'address']) {
    for (const value of [undefined, null, '', ' \n ', 123]) {
      assert.throws(() => submitRestaurantOrder(validOrder({ [field]: value })), {
        name: 'TypeError', message: `${field} must be a non-empty string`,
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
  const invalidOrders = [
    { lineItems: [{ dishId: 'beb-suco-laranja' }] },
    ...[undefined, null, -1, 15.1, NaN, Infinity, '2'].map(distanceKm => ({ distanceKm })),
    { tipPct: 5 }, { couponCode: 'UNKNOWN' },
  ];
  for (const overrides of invalidOrders) {
    assert.throws(() => submitRestaurantOrder(validOrder(overrides)), RangeError);
  }
});

test('pads protocol numbers to four digits', (t) => {
  t.mock.method(Math, 'random', () => 0);
  assert.strictEqual(submitRestaurantOrder(validOrder()).protocol, 'PED-0000');
  Math.random.mock.mockImplementation(() => 0.99999);
  assert.strictEqual(submitRestaurantOrder(validOrder()).protocol, 'PED-9999');
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
