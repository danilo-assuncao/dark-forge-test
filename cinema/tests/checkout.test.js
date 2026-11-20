'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCinemaOrder } = require('../checkout.js');

const input = (overrides = {}) => ({
  sessionId: 'ses-001', buyerName: ' Dan ',
  seats: [{ code: 'A1', ticketKind: 'full' }, { code: 'A2', ticketKind: 'half' }],
  ...overrides,
});

test('combines full and half tickets with one convenience fee for every room type', () => {
  for (const [sessionId, subtotal] of [['ses-001', 54], ['ses-002', 78], ['ses-004', 96]]) {
    const order = buildCinemaOrder(input({ sessionId }));
    assert.equal(order.sessionId, sessionId);
    assert.equal(order.buyerName, 'Dan');
    assert.equal(order.ticketsSubtotal, subtotal);
    assert.equal(order.discount, 0);
    assert.equal(order.convenienceFee, 4.5);
    assert.equal(order.total, subtotal + 4.5);
    assert.equal(order.snacks.total, 0);
  }
});

test('normalizes coupon case and whitespace and discounts only tickets', () => {
  for (const couponCode of ['DANCINE15', 'dancine15', ' \tDan cine 15\n']) {
    const order = buildCinemaOrder(input({ couponCode, snacks: [{ snackId: 'chocolate', qty: 4 }] }));
    assert.equal(order.couponCode, 'DANCINE15');
    assert.equal(order.discount, 8.1);
    assert.equal(order.snacks.subtotal, 48);
    assert.equal(order.snacks.discount, 4.8);
    assert.equal(order.snacks.total, 43.2);
    assert.equal(order.total, 93.6);
  }
});

test('unknown and empty coupons do not discount the order', () => {
  for (const couponCode of ['', ' ', 'DANCINE150', 'OTHER']) {
    const order = buildCinemaOrder(input({ couponCode }));
    assert.equal(order.discount, 0);
    assert.equal(order.total, 58.5);
  }
});

test('snack-only and empty orders have no ticket discount or fee', () => {
  const order = buildCinemaOrder(input({ seats: [], couponCode: 'DANCINE15', snacks: [{ snackId: 'refri-500', qty: 1 }] }));
  assert.equal(order.ticketsSubtotal, 0);
  assert.equal(order.discount, 0);
  assert.equal(order.convenienceFee, 0);
  assert.equal(order.total, 14);
  assert.equal(buildCinemaOrder(input({ seats: [] })).total, 0);
});

test('recalculates catalog prices without mutating or retaining input objects', () => {
  const args = input({ snacks: [{ snackId: 'pipoca-m', qty: 1, price: 0 }] });
  args.seats[0].price = 0;
  const before = structuredClone(args);
  const order = buildCinemaOrder(args);
  assert.deepEqual(args, before);
  assert.equal(order.total, 82.5);
  order.seats[0].code = 'F8';
  order.snacks.items[0].qty = 10;
  assert.deepEqual(args, before);
});

test('rejects invalid buyers, coupons, sessions, seats, and snacks', () => {
  const invalid = [
    { buyerName: '' }, { buyerName: ' \t' }, { buyerName: null },
    { couponCode: null }, { couponCode: 15 }, { sessionId: 'missing' },
    { sessionId: 1 }, { seats: null }, { seats: [null] }, { seats: [[]] },
    { seats: new Array(1) }, { seats: [{ code: 'G1', ticketKind: 'full' }] },
    { seats: [{ code: 'A1', ticketKind: 'child' }] },
    { seats: [{ code: 'A1', ticketKind: 'full' }, { code: 'A1', ticketKind: 'half' }] },
    { snacks: null }, { snacks: [null] }, { snacks: new Array(1) },
    { snacks: [{ snackId: 'missing', qty: 1 }] },
    { snacks: [{ snackId: 'chocolate', qty: 0 }] },
    { snacks: [{ snackId: 'chocolate', qty: 11 }] },
    { snacks: [{ snackId: 'chocolate', qty: 1.5 }] },
  ];
  for (const overrides of invalid) assert.throws(() => buildCinemaOrder(input(overrides)));
});

test('protocols are deterministic, unique per successful order, and never wrap', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const { createRequire } = require('node:module');
  const filename = require.resolve('../checkout.js');
  const context = { require: createRequire(filename), module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
  const build = context.module.exports.buildCinemaOrder;
  const args = input({ seats: [] });
  assert.throws(() => build(input({ buyerName: '' })));
  assert.equal(build(args).protocol, 'CINE-0000');
  const codes = new Set(['CINE-0000']);
  for (let i = 1; i <= 0xFFFF; i++) {
    const { protocol } = build(args);
    assert.match(protocol, /^CINE-[0-9A-F]{4}$/);
    codes.add(protocol);
  }
  assert.equal(codes.size, 65536);
  assert.ok(codes.has('CINE-FFFF'));
  assert.throws(() => build(args), /capacity exhausted/);
});
