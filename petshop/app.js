/* Dan Pets SPA: hash routing, category/species filter, text search and item
   detail with a mandatory size (porte) selector. Pure helpers are exported via
   module.exports for Node tests; the DOM layer only runs in a browser. */
(function (root) {
  'use strict';

  var C = root.DanPetsCatalog || (typeof require === 'function' ? require('./catalog.js') : null);

  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function parseQuery(qs) {
    var out = {};
    if (!qs) return out;
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i === -1 ? pair : pair.slice(0, i);
      var v = i === -1 ? '' : pair.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { /* ignore malformed */ }
    });
    return out;
  }

  // '#/' or '#/?cat=caes&q=osso' -> list; '#/item/<id>?size=mini' -> detail.
  function parseHash(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var qi = h.indexOf('?');
    var path = qi === -1 ? h : h.slice(0, qi);
    var query = parseQuery(qi === -1 ? '' : h.slice(qi + 1));
    var m = /^\/item\/([^/]+)\/?$/.exec(path);
    if (m) {
      var id;
      try { id = decodeURIComponent(m[1]); } catch (e) { id = m[1]; }
      return { view: 'detail', id: id, size: query.size || null, cat: query.cat || null, q: query.q || '' };
    }
    if (path === '' || path === '/') return { view: 'list', cat: query.cat || null, q: query.q || '' };
    return { view: 'notfound' };
  }

  function listHash(cat, q) {
    var parts = [];
    if (cat) parts.push('cat=' + encodeURIComponent(cat));
    if (q) parts.push('q=' + encodeURIComponent(q));
    return '#/' + (parts.length ? '?' + parts.join('&') : '');
  }

  // cat/q are carried along so the back link can restore the list filters.
  function detailHash(id, size, cat, q) {
    var parts = [];
    if (size) parts.push('size=' + encodeURIComponent(size));
    if (cat) parts.push('cat=' + encodeURIComponent(cat));
    if (q) parts.push('q=' + encodeURIComponent(q));
    return '#/item/' + encodeURIComponent(id) + (parts.length ? '?' + parts.join('&') : '');
  }

  function rangeLabel(r) {
    return r.minKg === 0 ? 'ate ' + r.maxKg + ' kg'
      : r.maxKg === Infinity ? 'acima de ' + r.minKg + ' kg'
      : 'acima de ' + r.minKg + ' ate ' + r.maxKg + ' kg';
  }

  function filterItems(items, cat, q) {
    var needle = normalize(q);
    return items.filter(function (it) {
      if (cat && it.category !== cat) return false;
      if (!needle) return true;
      var catObj = C.CATEGORIES.filter(function (c) { return c.id === it.category; })[0];
      return normalize(it.name + ' ' + (catObj ? catObj.name : '')).indexOf(needle) !== -1;
    });
  }

  function findItem(id) {
    return C.ITEMS.filter(function (i) { return i.id === id; })[0] || null;
  }

  function findSize(id) {
    return C.SIZES.filter(function (s) { return s.id === id; })[0] || null;
  }

  // A size is valid for an item only if the item is offered in it.
  function validSize(item, sizeId) {
    return !!(item && sizeId && item.sizes.indexOf(sizeId) !== -1 && findSize(sizeId));
  }

  var api = {
    normalize: normalize, parseHash: parseHash, listHash: listHash, detailHash: detailHash,
    filterItems: filterItems, rangeLabel: rangeLabel, findItem: findItem, validSize: validSize,
  };
  root.DanPetsApp = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function $(id) { return document.getElementById(id); }

  var nav = $('categories');
  var search = $('search');
  var grid = $('catalog');
  var empty = $('empty');
  var listView = $('list-view');
  var detailView = $('detail-view');
  var focusSize = null;

  function renderList(route) {
    var cat = route.cat && C.CATEGORIES.some(function (c) { return c.id === route.cat; }) ? route.cat : null;
    listView.hidden = false;
    detailView.hidden = true;
    Array.prototype.forEach.call(nav.children, function (b) {
      b.setAttribute('aria-pressed', String((b.dataset.id || '') === (cat || '')));
    });
    if (search.value !== route.q) search.value = route.q;
    clear(grid);
    var items = filterItems(C.ITEMS, cat, route.q);
    empty.hidden = items.length > 0;
    items.forEach(function (it) {
      var card = el('article', 'card');
      var link = el('a', null, it.name);
      link.href = detailHash(it.id, null, cat, route.q);
      var h3 = el('h3');
      h3.appendChild(link);
      var from = Math.min.apply(null, it.sizes.map(function (s) { return C.priceFor(it, s); }));
      card.appendChild(h3);
      card.appendChild(el('p', 'muted', it.sizes.map(function (s) { return findSize(s).name; }).join(' · ')));
      card.appendChild(el('p', 'price', 'A partir de ' + C.formatBRL(from)));
      grid.appendChild(card);
    });
  }

  function renderDetail(route) {
    listView.hidden = true;
    detailView.hidden = false;
    clear(detailView);
    var back = el('a', 'back', '← Voltar a listagem');
    back.href = listHash(route.cat, route.q);
    detailView.appendChild(back);
    var item = findItem(route.id);
    if (!item) {
      detailView.appendChild(el('p', null, 'Item nao encontrado.'));
      return;
    }
    var size = validSize(item, route.size) ? route.size : null;
    var catObj = C.CATEGORIES.filter(function (c) { return c.id === item.category; })[0];
    detailView.appendChild(el('h2', null, item.name));
    detailView.appendChild(el('p', 'muted', catObj.name));
    detailView.appendChild(el('h3', null, 'Escolha o porte (obrigatorio)'));
    var group = el('div', 'sizes');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Porte');
    item.sizes.forEach(function (sid) {
      var s = findSize(sid);
      var b = el('button', null, s.name + ' (' + s.weightRange + ')');
      b.type = 'button';
      b.dataset.id = sid;
      b.setAttribute('aria-pressed', String(sid === size));
      b.addEventListener('click', function () {
        var next = detailHash(item.id, sid, route.cat, route.q);
        if (next === root.location.hash) {
          // No hashchange will fire: keep focus on the button directly.
          if (b.focus) b.focus();
          return;
        }
        focusSize = sid;
        root.location.hash = next;
      });
      group.appendChild(b);
    });
    detailView.appendChild(group);
    if (focusSize) {
      Array.prototype.forEach.call(group.children, function (b) {
        if (b.dataset.id === focusSize && b.focus) b.focus();
      });
      focusSize = null;
    }
    var priceEl = el('p', 'price', size ? C.formatBRL(C.priceFor(item, size)) : 'Selecione um porte para ver o preco.');
    priceEl.setAttribute('aria-live', 'polite');
    detailView.appendChild(priceEl);
    if (item.dosage && size) {
      detailView.appendChild(el('h3', null, 'Dosagem de referencia'));
      var ul = el('ul');
      C.DOSAGE_TABLE.filter(function (r) { return r.size === size; }).forEach(function (r) {
        ul.appendChild(el('li', null, rangeLabel(r) + ': ' + r.dose));
      });
      detailView.appendChild(ul);
    }
    var cta = el('button', 'cta', item.service ? 'Agendar' : 'Escolher');
    cta.type = 'button';
    cta.disabled = !size;
    var msg = el('p', 'muted');
    msg.setAttribute('role', 'status');
    cta.addEventListener('click', function () {
      msg.textContent = item.name + ' - porte ' + findSize(size).name + ' selecionado.';
    });
    detailView.appendChild(cta);
    detailView.appendChild(msg);
  }

  function renderStatic() {
    var all = el('button', null, 'Todos');
    all.type = 'button';
    all.dataset.id = '';
    all.addEventListener('click', function () { root.location.hash = listHash(null, search.value); });
    nav.appendChild(all);
    C.CATEGORIES.forEach(function (c) {
      var b = el('button', null, c.name);
      b.type = 'button';
      b.dataset.id = c.id;
      b.addEventListener('click', function () { root.location.hash = listHash(c.id, search.value); });
      nav.appendChild(b);
    });
    search.addEventListener('input', function () {
      var r = parseHash(root.location.hash);
      var next = listHash(r.view === 'list' ? r.cat : null, search.value);
      // Replace (not push) so typing does not flood the history with partial queries.
      if (root.history && root.history.replaceState) {
        root.history.replaceState(null, '', next);
        render();
      } else {
        root.location.replace(next); // hashchange re-renders
      }
    });
    var ul = $('sizes');
    C.SIZES.forEach(function (s) { ul.appendChild(el('li', null, s.name + ' (' + s.weightRange + ')')); });
    var tbody = document.querySelector('#dosage tbody');
    C.DOSAGE_TABLE.forEach(function (r) {
      var size = findSize(r.size);
      var range = rangeLabel(r);
      var tr = el('tr');
      [size.name, range, r.dose].forEach(function (t) { tr.appendChild(el('td', null, t)); });
      tbody.appendChild(tr);
    });
  }

  function render() {
    var route = parseHash(root.location.hash);
    if (route.view === 'detail') renderDetail(route);
    else renderList(route.view === 'list' ? route : { cat: null, q: '' });
  }

  renderStatic();
  root.addEventListener('hashchange', render);
  render();
})(typeof window !== 'undefined' ? window : this);
