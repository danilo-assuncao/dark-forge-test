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
    wipe: () => m.clear(),
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

test('reload re-reads storage written elsewhere and notifies', () => {
  const st = mem();
  const a = make(st);
  const b = make(st);
  let calls = 0;
  a.subscribe(() => { calls++; });
  b.add('lideranca-essencial', 'ebook');
  b.setGiftWrap(true);
  assert.deepEqual(a.items(), []);
  a.reload();
  assert.equal(a.items().length, 1);
  assert.equal(calls, 1);
});

test('quantity boundaries on add, setQty and persisted data', () => {
  const s = make();
  s.add('lideranca-essencial', 'ebook', 98);
  s.add('lideranca-essencial', 'ebook', 5);
  assert.equal(s.items()[0].qty, 99);
  [null, true, '', '  ', 'abc'].forEach((v) => assert.equal(s.setQty('lideranca-essencial', 'ebook', v), false));
  assert.equal(s.items()[0].qty, 99);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', 2.7));
  assert.equal(s.items()[0].qty, 2);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', '3'));
  assert.equal(s.items()[0].qty, 3);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', 500));
  assert.equal(s.items()[0].qty, 99);
  assert.ok(s.setQty('lideranca-essencial', 'ebook', -1));
  assert.deepEqual(s.items(), []);
  const p = make(mem({ [S.STORAGE_KEY]: JSON.stringify({ items: [
    { id: 'lideranca-essencial', format: 'ebook', qty: 500 },
    { id: 'lideranca-essencial', format: 'ebook', qty: 2 },
    { id: 'lideranca-essencial', format: 'capa-dura', qty: '2' },
    { id: 'lideranca-essencial', format: 'capa-comum', qty: 2.9 }] }) }));
  assert.deepEqual(p.items(), [
    { id: 'lideranca-essencial', format: 'ebook', qty: 99 },
    { id: 'lideranca-essencial', format: 'capa-dura', qty: 2 },
    { id: 'lideranca-essencial', format: 'capa-comum', qty: 2 },
  ]);
});

test('coupon rounding and edge cases use literal values', () => {
  const s = make();
  s.add('lideranca-essencial', 'ebook'); // 3294
  s.applyCoupon('DANBOOK10');
  assert.equal(s.totals().discountCents, 329);
  assert.equal(s.totals().totalCents, 2965);
  s.add('lideranca-essencial', 'capa-comum'); // + 5490 = 8784
  assert.equal(s.totals().discountCents, 878);
  const e = make();
  assert.ok(e.applyCoupon('DANBOOK10'));
  assert.equal(e.totals().discountCents, 0);
  assert.equal(e.totals().totalCents, 0);
  [null, undefined, 10, 'constructor', '__proto__', 'toString', ''].forEach((v) =>
    assert.equal(make().applyCoupon(v), false, String(v)));
  const g = make();
  g.add('lideranca-essencial', 'capa-dura');
  ['true', 1, null, undefined].forEach((v) => { g.setGiftWrap(v); assert.equal(g.totals().giftWrap, false); });
});

test('empty-shelf coupon persists across reload', () => {
  const st = mem();
  make(st).applyCoupon('DANBOOK10');
  assert.equal(make(st).totals().coupon, 'DANBOOK10');
});

test('subscribers: payload, isolation, no notify on failures, idempotent unsubscribe', () => {
  const s = make();
  let n = 0, payload = null;
  s.subscribe(() => { throw new Error('boom'); });
  const off = s.subscribe((t) => { n++; payload = t; });
  assert.ok(s.add('lideranca-essencial', 'ebook'));
  assert.equal(n, 1);
  assert.deepEqual(payload, s.totals());
  s.add('x', 'ebook');
  s.remove('lideranca-essencial', 'capa-dura');
  s.setQty('x', 'ebook', 1);
  s.applyCoupon('NOPE');
  assert.equal(n, 1);
  off(); off();
  s.add('lideranca-essencial', 'ebook');
  assert.equal(n, 1);
});

test('throwing storage: totals work and load starts empty', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const t = S.create({ storage: bad, catalog: B });
  assert.deepEqual(t.items(), []);
  t.add('lideranca-essencial', 'ebook');
  assert.equal(t.totals().subtotalCents, 3294);
});

function runBrowser(win, withBooks) {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  win.window = win;
  const ctx = vm.createContext(win);
  if (withBooks) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'books.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'shelf.js'), 'utf8'), ctx);
  return win;
}

test('browser: throwing localStorage getter degrades to in-memory shelf', () => {
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); } });
  runBrowser(win, true);
  assert.ok(win.DanBooksShelf.add('lideranca-essencial', 'ebook'));
  assert.equal(win.DanBooksShelf.items().length, 1);
});

test('browser: shelf loaded before books.js stays inert, then loads persisted state', () => {
  const st = mem();
  make(st).add('lideranca-essencial', 'ebook');
  const win = runBrowser({ localStorage: st }, false);
  const sh = win.DanBooksShelf;
  let notified = 0;
  sh.subscribe(() => { notified++; });
  assert.equal(sh.add('lideranca-essencial', 'ebook'), false);
  assert.equal(sh.setQty('lideranca-essencial', 'ebook', 1), false);
  assert.equal(sh.remove('lideranca-essencial', 'ebook'), false);
  assert.equal(sh.clear(), false);
  assert.equal(sh.setGiftWrap(true), false);
  assert.equal(sh.applyCoupon('DANBOOK10'), false);
  assert.equal(sh.removeCoupon(), false);
  assert.equal(sh.items().length, 0);
  assert.equal(JSON.parse(st.raw()).items.length, 1); // saved shelf untouched
  win.DanBooksCatalog = B;
  assert.equal(sh.items().length, 1);
  assert.equal(notified, 1);
});

test('browser: storage event from another tab reloads the shelf', () => {
  const st = mem();
  const handlers = [];
  const win = runBrowser({ localStorage: st, addEventListener: (t, f) => handlers.push([t, f]) }, true);
  assert.equal(handlers[0][0], 'storage');
  make(st).add('lideranca-essencial', 'capa-dura');
  assert.equal(win.DanBooksShelf.items().length, 0);
  handlers[0][1]({ key: 'other' });
  assert.equal(win.DanBooksShelf.items().length, 0);
  handlers[0][1]({ key: S.STORAGE_KEY });
  assert.equal(win.DanBooksShelf.items().length, 1);
});

test('browser: storage event handler covers clear, other areas, notification and bad events', () => {
  const st = mem();
  const handlers = [];
  const win = runBrowser({ localStorage: st, addEventListener: (t, f) => handlers.push([t, f]) }, true);
  const fire = handlers[0][1];
  const sh = win.DanBooksShelf;
  let n = 0;
  sh.subscribe(() => { n++; });
  const other = make(st);
  other.add('lideranca-essencial', 'capa-dura');
  other.applyCoupon('DANBOOK10');
  other.setGiftWrap(true);
  fire({ key: 'other' });
  assert.equal(n, 0);
  fire({ key: S.STORAGE_KEY, storageArea: {} }); // e.g. sessionStorage
  assert.equal(n, 0);
  assert.equal(sh.items().length, 0);
  fire({ key: S.STORAGE_KEY, storageArea: st });
  assert.equal(n, 1);
  assert.equal(sh.items().length, 1);
  assert.equal(sh.totals().coupon, 'DANBOOK10');
  assert.equal(sh.totals().giftWrap, true);
  st.wipe(); // another tab ran localStorage.clear()
  fire({ key: null });
  assert.equal(n, 2);
  assert.deepEqual(sh.items().length, 0);
  assert.equal(sh.totals().coupon, null);
  assert.equal(sh.totals().giftWrap, false);
  assert.doesNotThrow(() => fire(undefined));
  assert.equal(n, 2);
});

test('browser: storage event before books.js loads does nothing until the catalog appears', () => {
  const st = mem();
  make(st).add('lideranca-essencial', 'ebook');
  const handlers = [];
  const win = runBrowser({ localStorage: st, addEventListener: (t, f) => handlers.push([t, f]) }, false);
  let n = 0;
  win.DanBooksShelf.subscribe(() => { n++; });
  assert.doesNotThrow(() => handlers[0][1]({ key: S.STORAGE_KEY }));
  assert.equal(n, 0);
  win.DanBooksCatalog = B;
  assert.equal(win.DanBooksShelf.items().length, 1);
});

test('reload keeps in-memory state when the storage read throws', () => {
  let failing = false;
  const inner = mem();
  const st = {
    getItem: (k) => { if (failing) throw new Error('denied'); return inner.getItem(k); },
    setItem: (k, v) => inner.setItem(k, v),
  };
  const s = make(st);
  s.add('lideranca-essencial', 'capa-dura');
  s.applyCoupon('DANBOOK10');
  failing = true;
  s.reload();
  assert.equal(s.items().length, 1);
  assert.equal(s.totals().coupon, 'DANBOOK10');
});

test('coupon plus gift wrap: discount applies to the subtotal only (literal cents)', () => {
  const s = make();
  s.add('lideranca-essencial', 'capa-dura'); // 8235
  s.applyCoupon('DANBOOK10');
  s.setGiftWrap(true);
  const t = s.totals();
  assert.equal(t.subtotalCents, 8235);
  assert.equal(t.discountCents, 824); // round(823.5), wrap excluded
  assert.equal(t.giftWrapCents, 890);
  assert.equal(t.totalCents, 8301); // 8235 - 824 + 890
});
