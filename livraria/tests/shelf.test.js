'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../shelf.js');
const B = require('../books.js');

function mem(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    raw: () => m.get(S.STORAGE_KEY),
  };
}
const make = (storage) => S.create({ storage: storage || mem(), catalog: B });

test('storage key is dan-books-shelf', () => assert.equal(S.STORAGE_KEY, 'dan-books-shelf'));

test('add merges by book + format and rejects unavailable formats', () => {
  const s = make();
  assert.ok(s.add('lideranca-essencial', 'capa-dura'));
  assert.ok(s.add('lideranca-essencial', 'capa-dura', 2));
  assert.ok(s.add('lideranca-essencial', 'ebook'));
  assert.equal(s.add('cosmos-em-perspectiva', 'ebook'), false);
  assert.equal(s.add('x', 'ebook'), false);
  assert.equal(s.add('lideranca-essencial', 'capa-dura', 0), false);
  assert.deepEqual(s.items(), [
    { id: 'lideranca-essencial', format: 'capa-dura', qty: 3 },
    { id: 'lideranca-essencial', format: 'ebook', qty: 1 },
  ]);
});

test('quantity is capped, setQty and remove work', () => {
  const s = make();
  s.add('lideranca-essencial', 'ebook', 500);
  assert.equal(s.items()[0].qty, S.MAX_QTY);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', 2));
  assert.equal(s.items()[0].qty, 2);
  assert.equal(s.setQty('lideranca-essencial', 'ebook', 'x'), false);
  assert.equal(s.setQty('lideranca-essencial', 'capa-dura', 1), false);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', 0));
  assert.deepEqual(s.items(), []);
  s.add('lideranca-essencial', 'ebook');
  assert.ok(s.remove('lideranca-essencial', 'ebook'));
  assert.equal(s.remove('lideranca-essencial', 'ebook'), false);
});

test('totals use the format price', () => {
  const s = make();
  s.add('lideranca-essencial', 'capa-comum', 2); // 5490 x2
  s.add('lideranca-essencial', 'ebook');         // 3294
  const t = s.totals();
  assert.equal(t.count, 3);
  assert.equal(t.subtotalCents, 5490 * 2 + 3294);
  assert.equal(t.totalCents, t.subtotalCents);
  assert.equal(t.giftWrapCents, 0);
  assert.equal(t.discountCents, 0);
});

test('DANBOOK10 gives 10% off, is case-insensitive, and unknown codes are rejected', () => {
  const s = make();
  s.add('lideranca-essencial', 'capa-comum', 2);
  assert.equal(s.applyCoupon('NOPE'), false);
  assert.ok(s.applyCoupon(' danbook10 '));
  const t = s.totals();
  assert.equal(t.coupon, 'DANBOOK10');
  assert.equal(t.discountCents, Math.round(10980 * 0.1));
  assert.equal(t.totalCents, 10980 - t.discountCents);
  assert.ok(s.removeCoupon());
  assert.equal(s.totals().discountCents, 0);
});

test('gift wrap adds a flat fee only when a physical copy is present', () => {
  const s = make();
  s.add('lideranca-essencial', 'ebook');
  s.setGiftWrap(true);
  assert.equal(s.totals().giftWrap, true);
  assert.equal(s.totals().giftWrapCents, 0);
  s.add('lideranca-essencial', 'capa-dura');
  const t = s.totals();
  assert.equal(t.giftWrapCents, S.GIFT_WRAP_CENTS);
  assert.equal(t.totalCents, t.subtotalCents + S.GIFT_WRAP_CENTS);
  s.applyCoupon('DANBOOK10');
  const t2 = s.totals();
  assert.equal(t2.totalCents, t2.subtotalCents - t2.discountCents + S.GIFT_WRAP_CENTS);
  s.setGiftWrap(false);
  assert.equal(s.totals().giftWrapCents, 0);
});

test('state persists to storage and reloads, dropping invalid data', () => {
  const st = mem();
  const a = make(st);
  a.add('lideranca-essencial', 'capa-dura', 2);
  a.applyCoupon('DANBOOK10');
  a.setGiftWrap(true);
  const b = make(st);
  assert.deepEqual(b.items(), [{ id: 'lideranca-essencial', format: 'capa-dura', qty: 2 }]);
  assert.equal(b.totals().coupon, 'DANBOOK10');
  assert.equal(b.totals().giftWrap, true);

  const bad = make(mem({ [S.STORAGE_KEY]: JSON.stringify({
    items: [{ id: 'x', format: 'ebook', qty: 1 }, { id: 'cosmos-em-perspectiva', format: 'ebook', qty: 1 },
      { id: 'lideranca-essencial', format: 'ebook', qty: 0 }, null],
    coupon: 'FAKE', giftWrap: 'yes' }) }));
  assert.deepEqual(bad.items(), []);
  assert.equal(bad.totals().coupon, null);
  assert.equal(bad.totals().giftWrap, false);
  assert.deepEqual(make(mem({ [S.STORAGE_KEY]: '{not json' })).items(), []);
});

test('clear resets items, coupon and gift wrap; subscribers are notified', () => {
  const st = mem();
  const s = make(st);
  let calls = 0;
  const off = s.subscribe(() => { calls++; });
  s.add('lideranca-essencial', 'capa-dura');
  s.applyCoupon('DANBOOK10');
  s.setGiftWrap(true);
  assert.equal(calls, 3);
  s.clear();
  assert.deepEqual(s.items(), []);
  assert.equal(s.totals().coupon, null);
  assert.equal(s.totals().giftWrap, false);
  off();
  s.add('lideranca-essencial', 'capa-dura');
  assert.equal(calls, 4);
  assert.deepEqual(JSON.parse(st.raw()).items.length, 1);
});

test('works without storage and survives throwing storage', () => {
  const s = S.create({ storage: null, catalog: B });
  assert.ok(s.add('lideranca-essencial', 'ebook'));
  const t = S.create({ storage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }, catalog: B });
  assert.ok(t.add('lideranca-essencial', 'ebook'));
  assert.equal(t.items().length, 1);
});

test('exposes DanBooksShelf as a browser global using localStorage', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const books = fs.readFileSync(path.join(__dirname, '..', 'books.js'), 'utf8');
  const shelf = fs.readFileSync(path.join(__dirname, '..', 'shelf.js'), 'utf8');
  const st = mem();
  const win = { localStorage: st };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(books, ctx);
  vm.runInContext(shelf, ctx);
  assert.ok(win.DanBooksShelf);
  assert.ok(win.DanBooksShelf.add('lideranca-essencial', 'ebook'));
  assert.ok(JSON.parse(st.raw()).items.length === 1);
});
