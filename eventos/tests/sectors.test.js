'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  ['events.js', 'app.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  });
  return { events: ctx.window.DanEvents, app: ctx.window.DanApp };
}

test('filters by text, category and city (accent-insensitive)', function () {
  const { events, app } = load();
  const all = events.all();
  assert.equal(app.filterEvents(all, {}).length, all.length);
  assert.deepEqual(Array.from(app.filterEvents(all, { q: 'comedia' }).map(e => e.id)), ['teatro-comedia']);
  assert.deepEqual(Array.from(app.filterEvents(all, { category: 'show' }).map(e => e.id)), ['show-pop']);
  assert.deepEqual(Array.from(app.filterEvents(all, { city: 'Rio de Janeiro' }).map(e => e.id)), ['teatro-comedia']);
  assert.equal(app.filterEvents(all, { q: 'rock', city: 'Rio de Janeiro' }).length, 0);
  assert.deepEqual(Array.from(app.filterEvents(all, { city: 'sao paulo' }).map(e => e.id)), ['rock-festival', 'show-pop']);
});

test('parses and builds hashes', function () {
  const { app } = load();
  assert.equal(app.parseHash('').route, 'home');
  assert.equal(app.parseHash('#/?q=rock%20in&cat=Show').params.q, 'rock in');
  const ev = app.parseHash('#/evento/show-pop/pista');
  assert.deepEqual([ev.route, ev.id, ev.sectorId], ['event', 'show-pop', 'pista']);
  assert.equal(app.parseHash('#/evento/show-pop').sectorId, null);
  assert.equal(app.parseHash('#/evento/%E0%A4%A').route, 'home');
  assert.equal(app.buildHomeHash({}), '#/');
  assert.equal(app.buildHomeHash({ q: 'a b', category: 'Show' }), '#/?q=a%20b&cat=Show');
});

test('lot availability per sector', function () {
  const { events, app } = load();
  const rock = events.find('rock-festival');
  const pista = rock.sectors.find(s => s.id === 'pista');
  const lots = app.getLots(rock, pista);
  assert.equal(lots.length, 3);
  assert.equal(lots[0].available, false);
  assert.equal(app.currentLot(rock, pista).id, 'lote-2');
  assert.equal(lots[1].priceCents, 18000);
  const camarote = rock.sectors.find(s => s.id === 'camarote');
  assert.equal(app.currentLot(rock, camarote), null);
});

test('index.html loads app.js after events.js', function () {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const e = html.search(/<script\s+src="events\.js"[^>]*>/);
  const a = html.search(/<script\s+src="app\.js"[^>]*>/);
  assert.ok(e >= 0 && a >= 0);
  assert.ok(e < a);
});

test('parseHash/buildHomeHash edge cases and round-trip', function () {
  const { app } = load();
  assert.equal(app.parseHash('#/?q=a+b').params.q, 'a b');
  assert.equal(app.parseHash('#/?q=a=b').params.q, 'a=b');
  const bad = app.parseHash('#/?q=%E0%A4%A&cat=Show');
  assert.equal(bad.params.cat, 'Show');
  assert.equal(bad.params.q, undefined);
  assert.equal(app.parseHash('#/evento/x/').id, 'x');
  assert.equal(app.parseHash('#/evento/x/y/z').route, 'home');
  assert.equal(app.buildHomeHash({ city: 'São Paulo' }), '#/?city=S%C3%A3o%20Paulo');
  assert.equal(app.buildHomeHash({ q: 'a', category: 'Show', city: 'X' }), '#/?q=a&cat=Show&city=X');
  const f = { q: 'a&b=c é', category: 'Peça', city: 'São Paulo' };
  const p = app.parseHash(app.buildHomeHash(f)).params;
  assert.equal(p.q, f.q);
  assert.equal(p.cat, f.category);
  assert.equal(p.city, f.city);
});

test('lot defaults, prices and filter edge cases', function () {
  const { events, app } = load();
  const t = events.find('teatro-comedia');
  const s = t.sectors[0];
  const lots = app.getLots(t, s);
  assert.deepEqual(Array.from(lots.map(l => l.remaining)), [50, 100, 150]);
  assert.deepEqual(Array.from(lots.map(l => l.priceCents)), [8000, 9600, 11200]);
  assert.equal(app.currentLot(t, s).id, 'lote-1');
  const all = events.all();
  const ids = f => Array.from(app.filterEvents(all, f).map(e => e.id));
  assert.equal(ids({ category: 'nada' }).length, 0);
  assert.deepEqual(ids({ category: ' SHOW ' }), ['show-pop']);
  assert.deepEqual(ids({ q: 'são paulo' }), ['rock-festival', 'show-pop']);
  assert.deepEqual(ids({ q: 'stand-up' }), ['teatro-comedia']);
  assert.equal(app.filterEvents(all, null).length, all.length);
});

// ---- Minimal fake DOM for rendering/router tests ----
function makeDom(hash) {
  function Node(tag) {
    this.tag = tag; this.children = []; this.listeners = {}; this.attrs = {};
    this.className = ''; this.id = ''; this._text = '';
    this._value = '';
  }
  Node.prototype.appendChild = function (c) { this.children.push(c); return c; };
  Node.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
  Node.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
  Node.prototype.fire = function (t) { (this.listeners[t] || []).forEach(fn => fn({ target: this })); };
  Object.defineProperty(Node.prototype, 'textContent', {
    get() { return this._text + this.children.map(c => c.textContent).join(''); },
    set(v) { this._text = v; this.children = []; }
  });
  Object.defineProperty(Node.prototype, 'value', {
    get() { return this._value; },
    set(v) {
      if (this.tag === 'select') {
        const ok = this.children.some(o => o.value === v);
        this._value = ok ? v : '';
      } else this._value = v;
    }
  });
  const app = new Node('main');
  const calls = [];
  const win = {
    location: { hash },
    history: { replaceState(a, b, url) { calls.push(url); } },
    addEventListener() {}
  };
  const doc = {
    readyState: 'complete',
    createElement: t => new Node(t),
    getElementById: () => app,
    addEventListener() {}
  };
  return { app, calls, win, doc };
}

function boot(hash) {
  const dom = makeDom(hash);
  const ctx = { window: dom.win, document: dom.doc };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  ['events.js', 'app.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  });
  return dom;
}

function findAll(n, pred, out) {
  out = out || [];
  if (pred(n)) out.push(n);
  n.children.forEach(c => findAll(c, pred, out));
  return out;
}

test('router: sold-out sector shows message', function () {
  const dom = boot('#/evento/rock-festival/camarote');
  assert.match(dom.app.textContent, /Esgotado: todos os lotes/);
  const sel = findAll(dom.app, n => n.id === 'sectorSelect')[0];
  assert.equal(sel.value, 'camarote');
});

test('router: unknown event shows not found', function () {
  const dom = boot('#/evento/nope');
  assert.match(dom.app.textContent, /Evento não encontrado/);
});

test('home: category change syncs hash and filters list', function () {
  const dom = boot('#/');
  const sel = findAll(dom.app, n => n.id === 'categoryFilter')[0];
  sel.value = 'Show';
  sel.fire('change');
  assert.equal(dom.calls[dom.calls.length - 1], '#/?cat=Show');
  const list = findAll(dom.app, n => n.id === 'eventList')[0];
  assert.equal(list.children.length, 1);
  assert.match(dom.app.textContent, /1 evento encontrado/);
});

test('home: URL filter values are reconciled with select options', function () {
  const dom = boot('#/?cat=show&city=Atlantis');
  const cat = findAll(dom.app, n => n.id === 'categoryFilter')[0];
  const city = findAll(dom.app, n => n.id === 'cityFilter')[0];
  assert.equal(cat.value, 'Show');
  assert.equal(city.value, '');
  assert.match(dom.app.textContent, /1 evento encontrado/);
});
