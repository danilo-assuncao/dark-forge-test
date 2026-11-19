'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../destinations.js');
const app = require('../app.js');

function fakeDocument() {
  function node(tag) {
    return {
      tag, children: [], className: '', value: '', hidden: false, listeners: {}, attrs: {}, _text: '',
      get textContent() { return this._text; },
      set textContent(v) { this._text = v; if (v === '') { this.children = []; } },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      fire(t) { (this.listeners[t] || []).forEach((f) => f()); }
    };
  }
  const ids = {
    catalog: node('div'), filters: node('form'), 'filter-search': node('input'),
    'filter-category': node('select'), 'filter-duration': node('select')
  };
  return { createElement: node, getElementById: (i) => ids[i], readyState: 'complete', ids };
}
const all = (n, tag, out = []) => { if (n.tag === tag) out.push(n); n.children.forEach((c) => all(c, tag, out)); return out; };
const texts = (n, out = []) => { if (n._text) out.push(n._text); n.children.forEach((c) => texts(c, out)); return out; };

test('buildItinerary returns one entry per day with arrival and departure', () => {
  const g = api.getDestination('gramado');
  for (const n of [3, 7, 12]) {
    const days = api.buildItinerary(g, n);
    assert.equal(days.length, n);
    assert.deepEqual(days.map((d) => d.day), Array.from({ length: n }, (_, i) => i + 1));
    assert.equal(days[0].title, 'Chegada');
    assert.equal(days[n - 1].title, 'Despedida');
    assert.ok(days.every((d) => d.title && d.detail));
  }
  assert.deepEqual(api.buildItinerary(api.getDestination('lisboa'), 3), []);
  assert.deepEqual(api.buildItinerary(null, 3), []);
});

test('parseHash handles list filters, detail and unknown routes', () => {
  assert.deepEqual(app.parseHash(''), { name: 'list', category: '', duration: '', query: '' });
  assert.deepEqual(app.parseHash('#/?q=praia+sol&cat=Praias&dur=7'), { name: 'list', category: 'Praias', duration: '7', query: 'praia sol' });
  assert.deepEqual(app.parseHash('#/?cat=Nope&dur=5'), { name: 'list', category: '', duration: '', query: '' });
  assert.deepEqual(app.parseHash('#/destino/gramado?dur=12'), { name: 'detail', id: 'gramado', duration: 12 });
  assert.equal(app.parseHash('#/destino/gramado?dur=99').duration, 3);
  assert.equal(app.parseHash('#/destino/lisboa').duration, 7);
  assert.equal(app.parseHash('#/destino/nope').name, 'notfound');
});

test('buildHash round-trips through parseHash', () => {
  const list = { name: 'list', category: 'Serra & Inverno', duration: '7', query: 'vinho & fondue' };
  assert.deepEqual(app.parseHash(app.buildHash(list)), list);
  assert.equal(app.buildHash({ name: 'list', category: '', duration: '', query: '' }), '#/');
  assert.deepEqual(app.parseHash(app.buildHash({ name: 'detail', id: 'bonito', duration: 7 })), { name: 'detail', id: 'bonito', duration: 7 });
});

test('renderList groups by category, shows only selected duration, links to detail', () => {
  global.document = fakeDocument();
  const c = global.document.createElement('div');
  app.renderList(c, {});
  assert.equal(all(c, 'section').length, 4);
  assert.equal(all(c, 'article').length, api.DESTINATIONS.length);
  assert.ok(all(c, 'a').some((a) => a.href === '#/destino/gramado'));
  app.renderList(c, { duration: '12' });
  const chips = all(c, 'span');
  assert.ok(chips.length > 0 && chips.every((s) => s.textContent.startsWith('12 dias')));
  assert.ok(all(c, 'a').some((a) => a.href === '#/destino/gramado?dur=12'));
  app.renderList(c, { query: 'zzz' });
  assert.equal(c.children[0].textContent, 'Nenhum destino encontrado.');
  delete global.document;
});

test('renderDetail shows the itinerary and a package selector', () => {
  global.document = fakeDocument();
  const c = global.document.createElement('div');
  app.renderDetail(c, { name: 'detail', id: 'gramado', duration: 7 });
  assert.equal(all(c, 'li').length, 7);
  const pkgs = all(c, 'a').filter((a) => a.className.startsWith('package'));
  assert.equal(pkgs.length, 3);
  assert.deepEqual(pkgs.map((a) => a.href), ['#/destino/gramado?dur=3', '#/destino/gramado?dur=7', '#/destino/gramado?dur=12']);
  assert.deepEqual(pkgs.map((a) => a.className.includes('active')), [false, true, false]);
  assert.ok(texts(c).includes('Roteiro de 7 dias'));
  app.renderDetail(c, { name: 'detail', id: 'lisboa', duration: 12 });
  assert.equal(all(c, 'li').length, 12);
  assert.equal(all(c, 'a').filter((a) => a.className.startsWith('package')).length, 2);
  delete global.document;
});

test('buildItinerary middle days: activities, free days, no lodging/insurance', () => {
  const g = api.getDestination('gramado');
  for (const n of [7, 12]) {
    const days = api.buildItinerary(g, n);
    assert.ok(days.slice(1, -1).some((d) => d.title === 'Dia livre'), 'free day n=' + n);
    assert.ok(days.every((d) => !/Hospedagem|Lodge|Seguro|Passagem|Guia|Translado|Fondue/.test(d.title)));
    assert.ok(days.slice(1, -1).some((d) => g.activities.includes(d.title)));
  }
  const three = api.buildItinerary(g, 3);
  assert.equal(three.length, 3);
  assert.ok(g.activities.includes(three[1].title));
  const bonito = api.buildItinerary(api.getDestination('bonito'), 7).map((d) => d.title);
  assert.ok(!bonito.includes('Guia credenciado') && bonito.includes('Flutuacao no Rio Sucuri'));
  // Destination without activities: every middle day is free.
  const lisboa = api.buildItinerary(api.getDestination('lisboa'), 7);
  assert.ok(lisboa.slice(1, -1).every((d) => d.title === 'Dia livre'));
});

test('departure day mentions breakfast only when included', () => {
  const last = (id, n) => api.buildItinerary(api.getDestination(id), n).pop().detail;
  assert.match(last('gramado', 3), /Cafe da manha/);
  assert.doesNotMatch(last('santiago', 3), /Cafe da manha/);
});

test('parseHash/buildHash/normalize boundary paths', () => {
  assert.equal(app.parseHash('#/?q=%E0%A4%A').query, '');
  assert.equal(app.parseHash('#/destino/gramado/').name, 'detail');
  assert.equal(app.parseHash('#/destino/%E0%A4%A').name, 'notfound');
  assert.equal(app.parseHash('#/?foo&q=a').query, 'a');
  assert.equal(app.parseHash('#/?q=').query, '');
  assert.equal(app.parseHash('#/?q=%20%20').query, '  ');
  assert.equal(app.parseHash('#/?q=a+b').query, 'a b');
  assert.equal(app.parseHash('#/?q=a%20b').query, 'a b');
  assert.equal(api.normalize(null), '');
  assert.equal(api.normalize(undefined), '');
  assert.equal(app.buildHash({ name: 'detail', id: 'x' }), '#/destino/x');
});

test('search edge cases: blank query, query + duration, whitespace collapsing', () => {
  assert.equal(api.filterDestinations({ query: '   ' }).length, api.DESTINATIONS.length);
  assert.deepEqual(api.filterDestinations({ query: 'gramado', duration: 12 }).map((d) => d.id), ['gramado']);
  assert.deepEqual(api.filterDestinations({ query: 'lisboa', duration: 3 }), []);
  assert.ok(api.filterDestinations({ query: 'cafe   da    manha' }).length > 0);
});

test('renderDetail uses aria-current on the active package and a custom back link', () => {
  global.document = fakeDocument();
  try {
    const c = global.document.createElement('div');
    app.renderDetail(c, { name: 'detail', id: 'gramado', duration: 7, backHash: '#/?cat=Praias' });
    const pkgs = all(c, 'a').filter((a) => a.className.startsWith('package'));
    assert.deepEqual(pkgs.map((a) => a.attrs['aria-current']), [undefined, 'true', undefined]);
    assert.equal(all(c, 'a').find((a) => a.className === 'back').href, '#/?cat=Praias');
  } finally { delete global.document; }
});

test('renderNotFound-style route shows message and back link', () => {
  const doc = fakeDocument();
  const w = { location: { hash: '#/destino/nope' }, addEventListener() {} };
  try {
    const fresh = loadFresh(w);
    global.document = doc;
    fresh.init();
    assert.ok(texts(doc.ids.catalog).includes('Destino nao encontrado.'));
    assert.ok(all(doc.ids.catalog, 'a').some((a) => a.className === 'back' && a.href === '#/'));
  } finally { cleanup(); }
});

// Loads app.js bound to the given fake window (root is captured at load time).
function loadFresh(w) {
  global.window = w;
  delete require.cache[require.resolve('../app.js')];
  return require('../app.js');
}
function cleanup() {
  delete global.document;
  delete global.window;
  delete require.cache[require.resolve('../app.js')];
}

test('init routes by hash, filters via inputs and reacts to hashchange', () => {
  const doc = fakeDocument();
  const handlers = {};
  const scrolls = [];
  const replaced = [];
  const w = {
    location: { hash: '' }, scrollTo: (x, y) => scrolls.push([x, y]),
    addEventListener: (t, f) => { handlers[t] = f; },
    history: { replaceState: (_s, _t, h) => { replaced.push(h); w.location.hash = h; } }
  };
  try {
    const fresh = loadFresh(w);
    global.document = doc; // set after load so auto-init does not run twice
    fresh.init();
    assert.equal(typeof handlers.hashchange, 'function');
    const { catalog, filters, 'filter-search': q, 'filter-category': cat, 'filter-duration': dur } = doc.ids;
    assert.deepEqual(cat.children.map((o) => o.value), api.CATEGORIES);
    assert.deepEqual(dur.children.map((o) => o.value), ['3', '7', '12']);
    assert.equal(all(catalog, 'section').length, 4);
    assert.equal(filters.hidden, false);

    cat.value = 'Praias';
    cat.fire('change');
    assert.equal(w.location.hash, '#/?cat=Praias');
    handlers.hashchange();
    assert.equal(all(catalog, 'section').length, 1);

    // Search uses replaceState (no history entry) and re-renders directly.
    q.value = '  jangada ';
    q.fire('input');
    assert.deepEqual(replaced, ['#/?q=jangada&cat=Praias']);
    assert.equal(all(catalog, 'article').length, 1);
    assert.equal(q.value, '  jangada ', 'input is not rewritten under the user');

    w.location.hash = '#/destino/jericoacoara?dur=12';
    handlers.hashchange();
    assert.equal(filters.hidden, true);
    assert.equal(all(catalog, 'li').length, 12);
    assert.deepEqual(scrolls.pop(), [0, 0]);
    assert.equal(all(catalog, 'a').find((a) => a.className === 'back').href, '#/?q=jangada&cat=Praias');

    w.location.hash = '#/destino/nope';
    handlers.hashchange();
    assert.ok(texts(catalog).includes('Destino nao encontrado.'));

    w.location.hash = '#/?dur=99';
    handlers.hashchange();
    assert.equal(all(catalog, 'section').length, 4);
  } finally { cleanup(); }
});

test('init falls back to synchronous re-render when window has no addEventListener', () => {
  const doc = fakeDocument();
  const w = { location: { hash: '' } };
  try {
    const fresh = loadFresh(w);
    global.document = doc;
    fresh.init();
    doc.ids['filter-category'].value = 'Ecoturismo';
    doc.ids['filter-category'].fire('change');
    assert.equal(w.location.hash, '#/?cat=Ecoturismo');
    assert.equal(all(doc.ids.catalog, 'section').length, 1);
  } finally { cleanup(); }
});

test('auto-init runs on DOMContentLoaded when the document is still loading', () => {
  const doc = fakeDocument();
  doc.readyState = 'loading';
  const reg = {};
  doc.addEventListener = (t, f) => { reg[t] = f; };
  try {
    global.document = doc;
    global.window = { location: { hash: '' }, addEventListener() {} };
    delete require.cache[require.resolve('../app.js')];
    require('../app.js');
    assert.equal(typeof reg.DOMContentLoaded, 'function');
    assert.equal(doc.ids.catalog.children.length, 0);
    reg.DOMContentLoaded();
    assert.equal(all(doc.ids.catalog, 'section').length, 4);
  } finally { cleanup(); }
});
