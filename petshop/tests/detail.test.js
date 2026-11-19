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
  assert.deepEqual(A.parseHash('#/item/vermifugo'), { view: 'detail', id: 'vermifugo', size: null, cat: null, q: '' });
  assert.deepEqual(A.parseHash('#/item/vermifugo?size=mini'), { view: 'detail', id: 'vermifugo', size: 'mini', cat: null, q: '' });
  assert.equal(A.parseHash('#/nope').view, 'notfound');
  assert.deepEqual(A.parseHash('#/item/%E0%A4%A'), { view: 'detail', id: '%E0%A4%A', size: null, cat: null, q: '' });
  [['#/?q=a+b', { cat: null, q: 'a b' }], ['#/?cat', { cat: null, q: '' }], ['#/?&q=x', { cat: null, q: 'x' }],
   ['#/?q=%E0%A4%A', { cat: null, q: '' }]].forEach(([h, exp]) =>
    assert.deepEqual(A.parseHash(h), { view: 'list', ...exp }, h));
  assert.deepEqual(A.parseHash('#/item/x?size=mini&cat=caes&q=a'), { view: 'detail', id: 'x', size: 'mini', cat: 'caes', q: 'a' });
  assert.equal(A.detailHash('x', 'mini', 'caes', 'a b'), '#/item/x?size=mini&cat=caes&q=a%20b');
});

test('hash builders round-trip', () => {
  assert.equal(A.listHash(null, ''), '#/');
  assert.deepEqual(A.parseHash(A.listHash('caes', 'osso natural')), { view: 'list', cat: 'caes', q: 'osso natural' });
  assert.deepEqual(A.parseHash(A.detailHash('osso-natural', 'grande')), { view: 'detail', id: 'osso-natural', size: 'grande', cat: null, q: '' });
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
  assert.equal(A.validSize(sup, 'xxl'), false);
  assert.equal(A.validSize(A.findItem('arranhador'), 'grande'), false);
});

function fakeNode(tag) {
  return {
    focused: false, focus() { this.focused = true; },
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, dataset: {}, listeners: {},
    type: '', href: '', value: '', hidden: false, disabled: false,
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(e, f) { this.listeners[e] = f; },
  };
}

function boot(opts = {}) {
  const els = {};
  ['categories', 'search', 'catalog', 'empty', 'list-view', 'detail-view', 'sizes'].forEach((id) => { els[id] = fakeNode(id); });
  els.empty.hidden = true;
  els['detail-view'].hidden = true;
  const tbody = fakeNode('tbody');
  const winListeners = {};
  const win = {
    DanPetsCatalog: C,
    DanPetsCart: require('../cart.js'),
    counts: { push: 0, replace: 0, locationReplace: 0 },
    location: {
      _hash: '',
      get hash() { return this._hash; },
      set hash(v) { this._hash = v; win.counts.push++; },
      replace(v) { this._hash = v; win.counts.locationReplace++; },
    },
    history: opts.noReplaceState ? undefined : { replaceState: (st, t, h) => { win.location._hash = h; win.counts.replace++; } },
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
  const go = (hash) => { win.location._hash = hash; winListeners.hashchange(); };
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
  assert.equal(els.catalog.children.length, 1); // rendered directly, no hashchange needed
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
  assert.equal(byText(d, /^acima de 10 ate 17\.5 kg: 2 comprimidos$/).length, 1);
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

test('search replaces history instead of pushing and works on detail route', () => {
  const { els, win, go } = boot();
  go('#/item/vermifugo?size=mini&cat=farmacia');
  els.search.value = 'rac';
  els.search.listeners.input();
  assert.equal(win.location.hash, '#/?q=rac');
  assert.equal(win.counts.replace, 1);
  assert.equal(win.counts.push, 0);
});

test('search falls back to location.replace without history.replaceState', () => {
  const { els, win } = boot({ noReplaceState: true });
  els.search.value = 'rac';
  els.search.listeners.input();
  assert.equal(win.counts.locationReplace, 1);
  assert.equal(win.counts.push, 0);
  assert.equal(win.location.hash, '#/?q=rac');
});

test('clicking the already-selected size does not leave stale focus state', () => {
  const { els, win, go } = boot();
  go('#/item/vermifugo?size=mini');
  const group = () => walk(els['detail-view']).find((n) => n.className === 'sizes');
  group().children[0].listeners.click(); // same hash: focus directly, no push
  assert.equal(win.counts.push, 0);
  assert.equal(group().children[0].focused, true);
  go('#/item/antipulgas?size=mini'); // later render must not steal focus
  assert.equal(group().children[0].focused, false);
});

test('unknown cat in list route is ignored (Todos pressed, all items)', () => {
  const { els, go } = boot();
  go('#/?cat=bogus');
  assert.equal(els.catalog.children.length, C.ITEMS.length);
  assert.equal(els.categories.children[0].attrs['aria-pressed'], 'true');
  go('#/item/osso-natural?cat=bogus');
  assert.equal(walk(els['detail-view']).find((n) => n.className === 'back').href, '#/?cat=bogus');
});

test('rangeLabel branches and table/size text', () => {
  assert.equal(A.rangeLabel({ minKg: 0, maxKg: 5 }), 'ate 5 kg');
  assert.equal(A.rangeLabel({ minKg: 5, maxKg: 10 }), 'acima de 5 ate 10 kg');
  assert.equal(A.rangeLabel({ minKg: 40, maxKg: Infinity }), 'acima de 40 kg');
  const { els, tbody } = boot();
  assert.equal(els.sizes.children[1].textContent, 'Medio (acima de 10 ate 25 kg)');
  assert.deepEqual(tbody.children[0].children.map((c) => c.textContent), ['Mini', 'ate 5 kg', '1/2 comprimido']);
  assert.equal(tbody.children[1].children[1].textContent, 'acima de 5 ate 10 kg');
  assert.equal(tbody.children[5].children[1].textContent, 'acima de 40 kg');
  C.DOSAGE_TABLE.forEach((r) => {
    const sz = C.SIZES.find((x) => x.id === r.size);
    assert.ok(r.minKg >= sz.minKg && r.maxKg <= sz.maxKg);
  });
});

test('Todos button clears the category', () => {
  const { els, win, go } = boot();
  go('#/?cat=gatos');
  els.categories.children[0].listeners.click();
  assert.equal(win.location.hash, '#/');
});

test('back link keeps list filters and size click keeps them and focuses the button', () => {
  const { els, win, go } = boot();
  go('#/?cat=caes&q=osso');
  const link = walk(els.catalog.children[0]).find((n) => n.tagName === 'a');
  assert.equal(link.href, '#/item/osso-natural?cat=caes&q=osso');
  go(link.href);
  const d = els['detail-view'];
  assert.equal(walk(d).find((n) => n.className === 'back').href, '#/?cat=caes&q=osso');
  walk(d).find((n) => n.className === 'sizes').children[2].listeners.click();
  assert.equal(win.location.hash, '#/item/osso-natural?size=grande&cat=caes&q=osso');
  go(win.location.hash);
  const pressed = walk(d).find((n) => n.className === 'sizes').children[2];
  assert.equal(pressed.focused, true);
});

test('CTA label and confirmation message', () => {
  const { els, go } = boot();
  go('#/item/banho-simples?size=medio');
  const d = els['detail-view'];
  const cta = walk(d).find((n) => n.className === 'cta');
  assert.equal(cta.textContent, 'Agendar');
  cta.listeners.click();
  const msg = walk(d).find((n) => n.attrs.role === 'status');
  assert.match(msg.textContent, /Banho/);
  assert.match(msg.textContent, /Medio/);
  go('#/item/osso-natural?size=mini');
  assert.equal(walk(d).find((n) => n.className === 'cta').textContent, 'Escolher');
});

test('dosage section only with size and only for dosage items', () => {
  const { els, go } = boot();
  const d = els['detail-view'];
  go('#/item/vermifugo');
  assert.equal(byText(d, /Dosagem de referencia/).length, 0);
  go('#/item/osso-natural?size=mini');
  assert.equal(byText(d, /Dosagem de referencia/).length, 0);
  go('#/item/vermifugo?size=grande');
  assert.equal(byText(d, /Dosagem de referencia/).length, 1);
  assert.equal(byText(d, /^acima de 40 kg: 5 comprimidos$/).length, 1);
});

test('app.js element ids all exist in index.html', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const ids = [...js.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 7);
  ids.forEach((id) => assert.match(html, new RegExp('id="' + id + '"'), id));
  assert.match(html, /id="dosage"/);
});
