'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../catalog.js');
const A = require('../app.js');

const ROOT = path.join(__dirname, '..');

test('parseHash routes list, detail and unknown', () => {
  assert.deepEqual(A.parseHash(''), { view: 'list', cat: null, q: '' });
  assert.deepEqual(A.parseHash('#/?cat=gatos&q=ra%C3%A7%C3%A3o'), { view: 'list', cat: 'gatos', q: 'ração' });
  assert.deepEqual(A.parseHash('#/item/vermifugo'), { view: 'detail', id: 'vermifugo', size: null });
  assert.deepEqual(A.parseHash('#/item/vermifugo?size=mini'), { view: 'detail', id: 'vermifugo', size: 'mini' });
  assert.equal(A.parseHash('#/nope').view, 'notfound');
  assert.equal(A.parseHash('#/item/%E0%A4%A').view, 'detail'); // malformed escape does not throw
});

test('hash builders round-trip', () => {
  assert.equal(A.listHash(null, ''), '#/');
  assert.deepEqual(A.parseHash(A.listHash('caes', 'osso natural')), { view: 'list', cat: 'caes', q: 'osso natural' });
  assert.deepEqual(A.parseHash(A.detailHash('osso-natural', 'grande')), { view: 'detail', id: 'osso-natural', size: 'grande' });
});

test('filterItems by category, accent-insensitive search, and combination', () => {
  assert.equal(A.filterItems(C.ITEMS, null, '').length, C.ITEMS.length);
  assert.deepEqual(A.filterItems(C.ITEMS, 'gatos', '').map((i) => i.id), C.itemsByCategory('gatos').map((i) => i.id));
  assert.deepEqual(A.filterItems(C.ITEMS, null, 'RACAO').map((i) => i.id), ['racao-caes-adultos', 'racao-gatos-castrados']);
  assert.deepEqual(A.filterItems(C.ITEMS, 'caes', 'racao').map((i) => i.id), ['racao-caes-adultos']);
  assert.deepEqual(A.filterItems(C.ITEMS, null, 'farmacia').length, 3); // matches category name
  assert.equal(A.filterItems(C.ITEMS, null, 'zzz').length, 0);
});

test('validSize only accepts sizes the item offers', () => {
  const sup = A.findItem('suplemento-articular');
  assert.equal(A.validSize(sup, 'mini'), false);
  assert.equal(A.validSize(sup, 'medio'), true);
  assert.equal(A.validSize(sup, null), false);
  assert.equal(A.validSize(null, 'mini'), false);
});

function fakeNode(tag) {
  return {
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, dataset: {}, listeners: {},
    type: '', href: '', value: '', hidden: false, disabled: false,
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(e, f) { this.listeners[e] = f; },
  };
}

function boot() {
  const els = {};
  ['categories', 'search', 'catalog', 'empty', 'list-view', 'detail-view', 'sizes'].forEach((id) => { els[id] = fakeNode(id); });
  els.empty.hidden = true;
  els['detail-view'].hidden = true;
  const tbody = fakeNode('tbody');
  const winListeners = {};
  const win = {
    DanPetsCatalog: C,
    location: { hash: '' },
    addEventListener: (e, f) => { winListeners[e] = f; },
  };
  const document = {
    getElementById: (id) => els[id],
    querySelector: () => tbody,
    createElement: fakeNode,
  };
  const ctx = { window: win, document };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), ctx);
  const go = (hash) => { win.location.hash = hash; winListeners.hashchange(); };
  return { els, tbody, win, go };
}

const walk = (n, out = []) => { out.push(n); n.children.forEach((c) => walk(c, out)); return out; };
const byText = (root, re) => walk(root).filter((n) => re.test(n.textContent));

test('index.html wires the SPA containers', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ['categories', 'search', 'catalog', 'list-view', 'detail-view'].forEach((id) =>
    assert.match(html, new RegExp('id="' + id + '"')));
  assert.match(html, /src="app\.js"/);
});

test('list view renders all items, nav with Todos, sizes and dosage table', () => {
  const { els, tbody } = boot();
  assert.equal(els.categories.children.length, 5);
  assert.equal(els.catalog.children.length, C.ITEMS.length);
  assert.equal(els.sizes.children.length, 3);
  assert.equal(tbody.children.length, 6);
  assert.equal(els['list-view'].hidden, false);
  assert.equal(els['detail-view'].hidden, true);
});

test('category button and search drive the hash and the list', () => {
  const { els, win, go } = boot();
  els.categories.children[2].listeners.click(); // Gatos
  assert.equal(win.location.hash, '#/?cat=gatos');
  go(win.location.hash);
  assert.equal(els.catalog.children.length, C.itemsByCategory('gatos').length);
  assert.equal(els.categories.children[2].attrs['aria-pressed'], 'true');
  assert.equal(els.categories.children[0].attrs['aria-pressed'], 'false');
  els.search.value = 'areia';
  els.search.listeners.input();
  assert.equal(win.location.hash, '#/?cat=gatos&q=areia');
  go(win.location.hash);
  assert.equal(els.catalog.children.length, 1);
  go('#/?q=zzz');
  assert.equal(els.catalog.children.length, 0);
  assert.equal(els.empty.hidden, false);
});

test('card links to the detail route', () => {
  const { els } = boot();
  const link = walk(els.catalog.children[0]).find((n) => n.tagName === 'a');
  assert.equal(link.href, '#/item/racao-caes-adultos');
});

test('detail requires a size: CTA disabled until one is chosen', () => {
  const { els, win, go } = boot();
  go('#/item/banho-simples');
  const d = els['detail-view'];
  assert.equal(d.hidden, false);
  assert.equal(els['list-view'].hidden, true);
  const cta = walk(d).find((n) => n.className === 'cta');
  assert.equal(cta.disabled, true);
  assert.equal(byText(d, /Selecione um porte/).length, 1);
  const group = walk(d).find((n) => n.className === 'sizes');
  assert.deepEqual(group.children.map((b) => b.dataset.id), ['mini', 'medio', 'grande']);
  assert.ok(group.children.every((b) => b.attrs['aria-pressed'] === 'false'));
  group.children[1].listeners.click();
  assert.equal(win.location.hash, '#/item/banho-simples?size=medio');
  go(win.location.hash);
  const cta2 = walk(d).find((n) => n.className === 'cta');
  assert.equal(cta2.disabled, false);
  assert.equal(byText(d, /^R\$ 70,00$/).length, 1);
  assert.equal(walk(d).find((n) => n.className === 'sizes').children[1].attrs['aria-pressed'], 'true');
});

test('detail ignores a size the item does not offer', () => {
  const { els, go } = boot();
  go('#/item/arranhador?size=grande');
  const cta = walk(els['detail-view']).find((n) => n.className === 'cta');
  assert.equal(cta.disabled, true);
  go('#/item/suplemento-articular');
  const group = walk(els['detail-view']).find((n) => n.className === 'sizes');
  assert.deepEqual(group.children.map((b) => b.dataset.id), ['medio', 'grande']);
});

test('pharmacy detail shows dosage for the chosen size only', () => {
  const { els, go } = boot();
  go('#/item/vermifugo?size=medio');
  const d = els['detail-view'];
  assert.equal(byText(d, /^10 a 17\.5 kg: 2 comprimidos$/).length, 1);
  assert.equal(byText(d, /1\/2 comprimido/).length, 0);
});

test('unknown item and unknown route do not crash', () => {
  const { els, go } = boot();
  go('#/item/nope');
  assert.equal(byText(els['detail-view'], /nao encontrado/).length, 1);
  go('#/whatever');
  assert.equal(els['list-view'].hidden, false);
  assert.equal(els.catalog.children.length, C.ITEMS.length);
});
