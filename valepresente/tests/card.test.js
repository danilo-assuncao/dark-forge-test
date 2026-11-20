'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGiftCard } = require('../card.js');

test('creates a card and reads its balance without consuming it', () => {
  const card = createGiftCard('GIFT-123', 100.5);
  assert.equal(card.code, 'GIFT-123');
  assert.equal(card.balance(), 100.5);
  assert.equal(card.balance(), 100.5);
});

test('redeems partially and then exhausts the balance', () => {
  const card = createGiftCard('GIFT', 100);
  assert.equal(card.redeem(25.5), 74.5);
  assert.equal(card.balance(), 74.5);
  assert.equal(card.redeem(74.5), 0);
  assert.equal(card.balance(), 0);
  assert.throws(() => card.redeem(0.01), RangeError);
  assert.equal(card.balance(), 0);
});

test('subtracts decimal amounts precisely in cents', () => {
  const card = createGiftCard('CENTS', 0.3);
  assert.equal(card.redeem(0.1), 0.2);
  assert.equal(card.redeem(0.1), 0.1);
  assert.equal(card.redeem(0.1), 0);
});

test('rounds initial and redeemed BRL amounts to cents', () => {
  const card = createGiftCard('ROUND', 1.005);
  assert.equal(card.balance(), 1.01);
  assert.equal(card.redeem(0.005), 1);
  assert.equal(card.redeem(0.994), 0.01);
});

test('accepts zero initial balances', () => {
  for (const amount of [0, -0, 0.004, Number.MIN_VALUE]) {
    const card = createGiftCard('EMPTY', amount);
    assert.equal(card.balance(), 0);
    assert.throws(() => card.redeem(1), RangeError);
    assert.equal(card.balance(), 0);
  }
});

test('rounds decimal half cents consistently across magnitudes', () => {
  for (const [amount, rounded] of [[1.005, 1.01], [2.675, 2.68], [8.345, 8.35], [10.075, 10.08]]) {
    assert.equal(createGiftCard('ROUND', amount).balance(), rounded);
    const card = createGiftCard('REDEEM', rounded);
    assert.equal(card.redeem(amount), 0);
  }
  assert.equal(createGiftCard('BELOW', 8.344999999999999).balance(), 8.34);
});

test('accepts large balances and enforces the safe-integer cents boundary', () => {
  for (const amount of [1e13, 90071992547409.9]) {
    const card = createGiftCard('LARGE', amount);
    assert.equal(card.balance(), amount);
    assert.equal(card.redeem(amount), 0);
  }
  assert.throws(() => createGiftCard('TOO-LARGE', 90071992547409.92), RangeError);
  const card = createGiftCard('LIMIT', 90071992547409.9);
  assert.throws(() => card.redeem(90071992547409.92), RangeError);
  assert.equal(card.balance(), 90071992547409.9);
});

test('rejects missing, blank and non-string codes', () => {
  for (const code of [undefined, null, '', ' \n\t', 123, {}, []]) {
    assert.throws(() => createGiftCard(code, 10), TypeError);
  }
});

test('rejects invalid initial balances', () => {
  for (const amount of [undefined, null, '10', true, {}, NaN, Infinity, -Infinity]) {
    assert.throws(() => createGiftCard('GIFT', amount), TypeError);
  }
  for (const amount of [-1, -0.001, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => createGiftCard('GIFT', amount), RangeError);
  }
});

test('failed redemptions preserve the balance and allow later valid redemption', () => {
  const card = createGiftCard('GIFT', 10);
  for (const amount of [undefined, null, '1', true, {}, NaN, Infinity, -Infinity]) {
    assert.throws(() => card.redeem(amount), TypeError);
    assert.equal(card.balance(), 10);
  }
  for (const amount of [-1, -0.001, 0, -0, 0.004, 10.01, Number.MAX_VALUE]) {
    assert.throws(() => card.redeem(amount), RangeError);
    assert.equal(card.balance(), 10);
  }
  assert.equal(card.redeem(1), 9);
});

test('cards maintain independent balances even with the same code', () => {
  const first = createGiftCard('GIFT', 10);
  const second = createGiftCard('GIFT', 20);
  first.redeem(5);
  assert.equal(first.balance(), 5);
  assert.equal(second.balance(), 20);
  second.redeem(1);
  assert.equal(first.balance(), 5);
  assert.equal(second.balance(), 19);
});
