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

test('init routes by hash, filters via inputs and reacts to hashchange', () => {
  const doc = fakeDocument();
  const handlers = {};
  global.window = { location: { hash: '' }, addEventListener: (t, f) => { handlers[t] = f; } };
  // app.js captured `this`/window at load, so use a fresh copy bound to the fake window.
  delete require.cache[require.resolve('../app.js')];
  const fresh = require('../app.js');
  global.document = doc; // set after load so the auto-init does not run twice
  fresh.init();
  const { catalog, filters, 'filter-search': q, 'filter-category': cat, 'filter-duration': dur } = doc.ids;
  assert.deepEqual(cat.children.map((o) => o.value), api.CATEGORIES);
  assert.deepEqual(dur.children.map((o) => o.value), ['3', '7', '12']);
  assert.equal(all(catalog, 'section').length, 4);
  assert.equal(filters.hidden, false);

  cat.value = 'Praias';
  cat.fire('change');
  assert.equal(global.window.location.hash, '#/?cat=Praias');
  handlers.hashchange();
  assert.equal(all(catalog, 'section').length, 1);

  q.value = 'jangada';
  q.fire('input');
  handlers.hashchange();
  assert.equal(all(catalog, 'article').length, 1);

  global.window.location.hash = '#/destino/jericoacoara?dur=12';
  handlers.hashchange();
  assert.equal(filters.hidden, true);
  assert.equal(all(catalog, 'li').length, 12);

  global.window.location.hash = '#/destino/nope';
  handlers.hashchange();
  assert.ok(texts(catalog).includes('Destino nao encontrado.'));

  global.window.location.hash = '#/?dur=99';
  handlers.hashchange();
  assert.equal(all(catalog, 'section').length, 4);
  delete global.document;
  delete global.window;
  delete require.cache[require.resolve('../app.js')];
});
