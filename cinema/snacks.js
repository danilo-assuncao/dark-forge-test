'use strict';

// Cinema snack bar catalog and combo calculator. Prices are in BRL (reais);
// all arithmetic is done in integer cents and converted back to 2 decimals.

const BULK_MIN_QTY = 4;
const BULK_DISCOUNT_PCT = 10;
// Per-line limit: each { snackId, qty } line must have qty in 1..MAX_QTY.
// Repeated snackIds on several lines are valid and all count toward the bulk threshold.
const MAX_QTY = 10;

const SNACKS = Object.freeze([
  Object.freeze({ id: 'pipoca-m', name: 'Pipoca Média', price: 24.0 }),
  Object.freeze({ id: 'pipoca-g', name: 'Pipoca Grande', price: 32.0 }),
  Object.freeze({ id: 'refri-500', name: 'Refrigerante 500ml', price: 14.0 }),
  Object.freeze({ id: 'combo-casal', name: 'Combo Casal', price: 58.0 }),
  Object.freeze({ id: 'chocolate', name: 'Chocolate', price: 12.0 })
]);

function listSnacks() {
  return SNACKS.map((s) => ({ id: s.id, name: s.name, price: s.price }));
}

function toCents(value) {
  return Math.round(value * 100);
}

function calculateSnacksTotal(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  const lines = [];
  let totalQty = 0;
  let subtotalCents = 0;
  items.forEach((item) => {
    if (item === null || typeof item !== 'object') throw new TypeError('each item must be an object');
    const snack = SNACKS.find((s) => s.id === item.snackId);
    if (!snack) throw new RangeError('unknown snackId: ' + String(item.snackId));
    const qty = item.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new RangeError('qty per line must be an integer between 1 and ' + MAX_QTY);
    }
    const lineCents = toCents(snack.price) * qty;
    totalQty += qty;
    subtotalCents += lineCents;
    lines.push({ snackId: snack.id, qty, unitPrice: snack.price, subtotal: lineCents / 100 });
  });
  const discountApplied = totalQty >= BULK_MIN_QTY;
  const discountCents = discountApplied ? Math.round((subtotalCents * BULK_DISCOUNT_PCT) / 100) : 0;
  return {
    items: lines,
    totalQty,
    subtotal: subtotalCents / 100,
    discountPct: discountApplied ? BULK_DISCOUNT_PCT : 0,
    discount: discountCents / 100,
    total: (subtotalCents - discountCents) / 100
  };
}

module.exports = { listSnacks, calculateSnacksTotal, BULK_MIN_QTY, BULK_DISCOUNT_PCT, MAX_QTY };
