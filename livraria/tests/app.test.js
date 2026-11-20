'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const appCode = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

function makeEnv() {
  const win = {
    document: {
      getElementById: (id) => {
        let el = {
          id: id,
          hidden: false,
          value: '',
          textContent: '',
          className: '',
          children: [],
          options: [],
          appendChild: (c) => el.children.push(c),
          removeChild: (c) => { el.children = el.children.filter(x => x !== c); },
          addEventListener: (evt, fn) => {
            if (!el.listeners) el.listeners = {};
            el.listeners[evt] = fn.bind(el);
          },
          setAttribute: (name, val) => {
            if (!el.attrs) el.attrs = {};
            el.attrs[name] = String(val);
          },
          querySelector: () => el,
          reset: () => {},
          get firstChild() { return el.children[0]; }
        };
        if (id === 'cart-count') el.textContent = '0';
        if (id === 'cart-drawer' || id === 'checkout-msg' || id === 'coupon-error' || id === 'cart-summary' || id === 't-discount-row' || id === 'c-remove' || id === 't-gift-row' || id === 'recommender-result') el.hidden = true;
        if (!win._els) win._els = {};
        if (!win._els[id]) win._els[id] = el;
        return win._els[id];
      },
      createElement: (tag) => {
        return {
          tagName: tag,
          className: '',
          textContent: '',
          value: '',
          children: [],
          appendChild: function(c) { this.children.push(c); },
          addEventListener: function(evt, fn) {
            if (!this.listeners) this.listeners = {};
            this.listeners[evt] = fn;
          }
        };
      },
      readyState: 'complete',
    },
    DanBooksCatalog: require('../books.js'),
    DanBooksRecommender: require('../recommender.js'),
  };
  
  const storage = {};
  const mockStorage = {
    getItem: k => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); }
  };
  win.DanBooksShelf = require('../shelf.js').create({ catalog: win.DanBooksCatalog, storage: mockStorage });
  
  const runCtx = new Function('module', 'require', 'window', 'document', appCode);
  runCtx(undefined, undefined, win, win.document);
  
  return win;
}

test('catalog rendering and genre filtering', async () => {
  const env = makeEnv();
  const catList = env.document.getElementById('catalog-list');
  assert.ok(catList.children.length > 0, 'Catalog should be populated');
  
  const initialCount = catList.children.length;
  
  const fGenre = env.document.getElementById('f-genre');
  fGenre.value = 'ficcao-fantasia';
  
  // trigger change
  env.document.getElementById('filters').listeners['change']();
  assert.ok(catList.children.length < initialCount, 'Catalog should be filtered');
  assert.equal(catList.children.length, 3); // 3 fantasy books
});

test('add to cart from catalog opens drawer', async () => {
  const env = makeEnv();
  const catList = env.document.getElementById('catalog-list');
  
  // Simulating the submit event on the first add-form
  // In our mock, children[0] is h3, children[1] is p, children[2] is p, children[3] is card-actions (div)
  // card-actions children[0] is form
  const item1 = catList.children[0];
  const actions = item1.children.find(c => c.className === 'card-actions');
  const form = actions.children[0];
  
  // In our mock, select is the first child of form
  const sel = form.children[0];
  sel.value = 'capa-comum';
  
  form.listeners['submit']({ preventDefault: () => {} });
  
  const count = env.document.getElementById('cart-count');
  assert.equal(String(count.textContent), '1');
  
  const drawer = env.document.getElementById('cart-drawer');
  assert.equal(drawer.hidden, false, 'Adding to cart should open drawer');
  
  const toggle = env.document.getElementById('cart-toggle');
  assert.equal(toggle.attrs['aria-expanded'], 'true');
});

test('cart drawer toggle and close', async () => {
  const env = makeEnv();
  const toggle = env.document.getElementById('cart-toggle');
  const close = env.document.getElementById('cart-close');
  const drawer = env.document.getElementById('cart-drawer');
  
  assert.equal(drawer.hidden, true);
  
  toggle.listeners['click']();
  assert.equal(drawer.hidden, false);
  assert.equal(toggle.attrs['aria-expanded'], 'true');
  
  toggle.listeners['click']();
  assert.equal(drawer.hidden, true);
  assert.equal(toggle.attrs['aria-expanded'], 'false');
  
  toggle.listeners['click']();
  assert.equal(drawer.hidden, false);
  
  close.listeners['click']();
  assert.equal(drawer.hidden, true);
});

test('quantity update and item removal in cart', async () => {
  const env = makeEnv();
  env.DanBooksShelf.add('o-reino-de-cinzas', 'capa-comum', 1);
  
  const items = env.document.getElementById('cart-items');
  assert.equal(items.children.length, 1);
  
  const form = items.children[0].children[2].children[0];
  const inp = form.children[0];
  
  inp.value = '3';
  form.listeners['submit']({ preventDefault: () => {} });
  
  const count = env.document.getElementById('cart-count');
  assert.equal(String(count.textContent), '3');
  
  const subtotal = env.document.getElementById('t-subtotal');
  // 59.90 * 3 = 179.70
  assert.equal(subtotal.textContent, 'R$ 179,70');
  
  // Remove
  const remBtn = items.children[0].children[2].children[1];
  remBtn.listeners['click']();
  
  assert.equal(String(count.textContent), '0');
  assert.equal(items.children.length, 0);
  assert.equal(env.document.getElementById('cart-empty').hidden, false);
});

test('coupon application and removal', async () => {
  const env = makeEnv();
  env.DanBooksShelf.add('o-reino-de-cinzas', 'capa-comum', 1); // 59.90
  
  const couponForm = env.document.getElementById('coupon-form');
  const codeInp = env.document.getElementById('c-code');
  const err = env.document.getElementById('coupon-error');
  
  // Empty
  codeInp.value = '';
  couponForm.listeners['submit']({ preventDefault: () => {} });
  assert.equal(err.hidden, false);
  assert.equal(err.textContent, 'Informe um código de cupom.');
  
  // Invalid
  codeInp.value = 'abc';
  couponForm.listeners['submit']({ preventDefault: () => {} });
  assert.equal(err.hidden, false);
  assert.equal(err.textContent, 'Cupom inválido.');
  
  // Valid
  codeInp.value = 'DANBOOK10';
  couponForm.listeners['submit']({ preventDefault: () => {} });
  assert.equal(err.hidden, true);
  
  const discRow = env.document.getElementById('t-discount-row');
  assert.equal(discRow.hidden, false);
  
  const remBtn = env.document.getElementById('c-remove');
  assert.equal(remBtn.hidden, false);
  
  // Remove
  remBtn.listeners['click']();
  assert.equal(discRow.hidden, true);
  assert.equal(remBtn.hidden, true);
  assert.equal(codeInp.value, '');
});

test('gift wrap visibility and auto-reset', async () => {
  const env = makeEnv();
  // Physical item
  env.DanBooksShelf.add('o-reino-de-cinzas', 'capa-comum', 1);
  
  const giftCheckbox = env.document.getElementById('c-gift');
  const giftRow = env.document.getElementById('t-gift-row');
  
  assert.equal(giftCheckbox.disabled, false);
  
  giftCheckbox.checked = true;
  giftCheckbox.listeners['change']();
  
  assert.equal(giftRow.hidden, false);
  
  // E-book only
  env.DanBooksShelf.remove('o-reino-de-cinzas', 'capa-comum');
  env.DanBooksShelf.add('o-reino-de-cinzas', 'ebook', 1);
  
  // Should auto-reset
  assert.equal(giftCheckbox.disabled, true);
  assert.equal(giftCheckbox.checked, false);
  assert.equal(giftRow.hidden, true);
});

test('recommender boundary inputs and failure paths', async () => {
  const env = makeEnv();
  const recForm = env.document.getElementById('recommender-form');
  const minInp = env.document.getElementById('r-minutes');
  const recErr = env.document.getElementById('recommender-error');
  const box = env.document.getElementById('recommender-result');
  
  const invalidInputs = ['', '0', '-5', 'abc'];
  for (const input of invalidInputs) {
    minInp.value = input;
    recForm.listeners['submit']({ preventDefault: () => {} });
    assert.equal(recErr.textContent, 'Informe os minutos diários de leitura válidos.');
    assert.equal(box.hidden, true);
  }
  
  // Large enough to return null from recommendBox? Actually recommendBox handles large capacities gracefully,
  // but if genre has no books... (doesn't happen for our hardcoded data).
  // We mock recommendBox locally for this specific test assertion.
  const orig = env.DanBooksRecommender.recommendBox;
  env.DanBooksRecommender.recommendBox = () => null;
  minInp.value = '30';
  recForm.listeners['submit']({ preventDefault: () => {} });
  assert.equal(recErr.textContent, 'Não foi possível gerar recomendação para este perfil.');
  assert.equal(box.hidden, true);
  env.DanBooksRecommender.recommendBox = orig;
});

test('recommender success path populates plan UI', async () => {
  const env = makeEnv();
  const recForm = env.document.getElementById('recommender-form');
  const minInp = env.document.getElementById('r-minutes');
  const recErr = env.document.getElementById('recommender-error');
  const box = env.document.getElementById('recommender-result');
  
  minInp.value = '30';
  recForm.listeners['submit']({ preventDefault: () => {} });
  
  assert.equal(recErr.textContent, '');
  assert.equal(box.hidden, false);
  
  const name = env.document.getElementById('plan-name');
  assert.ok(name.textContent.length > 0);
  
  const price = env.document.getElementById('plan-price');
  assert.ok(price.textContent.includes('R$'));
  
  const titles = env.document.getElementById('plan-titles');
  assert.ok(titles.children.length > 0);
});

test('checkout confirmation lifecycle', async () => {
  const env = makeEnv();
  
  // Empty cart doing nothing
  const checkoutBtn = env.document.getElementById('checkout-btn');
  const msg = env.document.getElementById('checkout-msg');
  assert.equal(msg.hidden, true);
  
  env.DanBooksShelf.reload(); // runs renderCart, empty cart
  assert.equal(msg.hidden, true); // early return hides it now
  
  checkoutBtn.listeners['click'](); // no-op on empty cart
  assert.equal(msg.hidden, true);
  
  // Add item and checkout
  env.DanBooksShelf.add('o-reino-de-cinzas', 'capa-comum', 1); // 59.90
  assert.equal(msg.hidden, true); // adding item does not show checkout message
  
  checkoutBtn.listeners['click']();
  assert.equal(msg.hidden, false);
  assert.ok(msg.textContent.includes('R$ 59,90'));
  
  const count = env.document.getElementById('cart-count');
  assert.equal(String(count.textContent), '0'); // cart cleared
  
  // Because it was cleared, renderCart ran again. We modified renderCart to hide messages BEFORE early returning on empty.
  // Wait, if it hides it, how can we see the message? Ah, in checkout button, we set it AFTER S.clear().
  // Let's verify our patch_checkout works.
  assert.equal(msg.hidden, false);
});
