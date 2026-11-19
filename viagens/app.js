/* Viagens UI: hash routing, search + category/duration filters and the
   destination detail page with a day-by-day itinerary and package selector.
   Routes: "#/" (catalog, optional ?q=&cat=&dur=) and "#/destino/<id>?dur=N". */
(function (root) {
  'use strict';

  var data = root.ViagensDestinations || (typeof require !== 'undefined' ? require('./destinations.js') : null);

  function parseHash(hash) {
    var raw = String(hash || '').replace(/^#/, '');
    var qi = raw.indexOf('?');
    var path = qi < 0 ? raw : raw.slice(0, qi);
    var params = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) { return; }
        var eq = pair.indexOf('=');
        var k = eq < 0 ? pair : pair.slice(0, eq);
        var v = eq < 0 ? '' : pair.slice(eq + 1);
        try { params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { /* ignore malformed */ }
      });
    }
    var m = /^\/destino\/([^/]+)\/?$/.exec(path);
    if (m) {
      var id;
      try { id = decodeURIComponent(m[1]); } catch (e) { id = m[1]; }
      var dest = data.getDestination(id);
      if (!dest) { return { name: 'notfound', id: id }; }
      var dur = Number(params.dur);
      if (dest.durations.indexOf(dur) < 0) { dur = dest.durations[0]; }
      return { name: 'detail', id: id, duration: dur };
    }
    var cat = data.CATEGORIES.indexOf(params.cat) >= 0 ? params.cat : '';
    var d = data.DURATIONS.indexOf(Number(params.dur)) >= 0 ? String(Number(params.dur)) : '';
    return { name: 'list', category: cat, duration: d, query: params.q || '' };
  }

  function buildHash(route) {
    if (route.name === 'detail') {
      return '#/destino/' + encodeURIComponent(route.id) + (route.duration ? '?dur=' + route.duration : '');
    }
    var parts = [];
    if (route.query) { parts.push('q=' + encodeURIComponent(route.query)); }
    if (route.category) { parts.push('cat=' + encodeURIComponent(route.category)); }
    if (route.duration) { parts.push('dur=' + encodeURIComponent(route.duration)); }
    return '#/' + (parts.length ? '?' + parts.join('&') : '');
  }

  // DOM helpers (DOM APIs only, no innerHTML).
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined) { n.textContent = text; }
    if (cls) { n.className = cls; }
    return n;
  }

  function link(text, href, cls) {
    var a = el('a', text, cls);
    a.href = href;
    return a;
  }

  function renderList(container, route) {
    container.textContent = '';
    var list = data.filterDestinations(route);
    if (!list.length) {
      container.appendChild(el('p', 'Nenhum destino encontrado.', 'empty'));
      return;
    }
    data.CATEGORIES.forEach(function (cat) {
      var items = list.filter(function (d) { return d.category === cat; });
      if (!items.length) { return; }
      var section = el('section', undefined, 'category');
      section.appendChild(el('h2', cat));
      var grid = el('div', undefined, 'grid');
      items.forEach(function (d) {
        var card = el('article', undefined, 'card');
        var h = el('h3');
        h.appendChild(link(d.name, buildHash({ name: 'detail', id: d.id, duration: route.duration ? Number(route.duration) : undefined })));
        card.appendChild(h);
        var chips = el('p', undefined, 'chips');
        var shown = route.duration ? [Number(route.duration)] : d.durations;
        shown.forEach(function (n) {
          chips.appendChild(el('span', data.durationLabel(n) + ' - ' + data.formatBRL(d.priceCents[n]), 'chip'));
        });
        card.appendChild(chips);
        var table = el('table');
        [
          ['Melhor epoca', d.climate.season],
          ['Temperatura media', d.climate.avgTempC + ' C'],
          ['Clima', d.climate.summary],
          ['Inclusos', d.includes.join(', ')]
        ].forEach(function (r) {
          var tr = el('tr');
          var th = el('th', r[0]);
          th.scope = 'row';
          tr.appendChild(th);
          tr.appendChild(el('td', r[1]));
          table.appendChild(tr);
        });
        card.appendChild(table);
        card.appendChild(link('Ver roteiro dia a dia', buildHash({ name: 'detail', id: d.id, duration: route.duration ? Number(route.duration) : undefined }), 'more'));
        grid.appendChild(card);
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function renderDetail(container, route) {
    container.textContent = '';
    var d = data.getDestination(route.id);
    container.appendChild(link('← Voltar aos destinos', route.backHash || '#/', 'back'));
    var article = el('article', undefined, 'detail');
    article.appendChild(el('h2', d.name));
    article.appendChild(el('p', d.category + ' - ' + d.climate.summary, 'muted'));

    var picker = el('div', undefined, 'package-picker');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Escolha o pacote');
    d.durations.forEach(function (n) {
      var active = n === route.duration;
      var a = link(data.durationLabel(n) + ' - ' + data.formatBRL(d.priceCents[n]),
        buildHash({ name: 'detail', id: d.id, duration: n }), 'package' + (active ? ' active' : ''));
      if (active) { a.setAttribute('aria-current', 'true'); }
      picker.appendChild(a);
    });
    article.appendChild(picker);

    article.appendChild(el('p', 'Inclusos: ' + d.includes.join(', ') + '.'));
    article.appendChild(el('h3', 'Roteiro de ' + data.durationLabel(route.duration)));
    var ol = el('ol', undefined, 'itinerary');
    data.buildItinerary(d, route.duration).forEach(function (day) {
      var li = el('li', undefined, 'day');
      li.appendChild(el('strong', 'Dia ' + day.day + ' - ' + day.title));
      li.appendChild(el('p', day.detail));
      ol.appendChild(li);
    });
    article.appendChild(ol);
    container.appendChild(article);
  }

  function renderNotFound(container) {
    container.textContent = '';
    container.appendChild(el('p', 'Destino nao encontrado.', 'empty'));
    container.appendChild(link('← Voltar aos destinos', '#/', 'back'));
  }

  function init() {
    var container = document.getElementById('catalog');
    var filters = document.getElementById('filters');
    var searchIn = document.getElementById('filter-search');
    var catSel = document.getElementById('filter-category');
    var durSel = document.getElementById('filter-duration');
    if (!container || !catSel || !durSel || !searchIn) { return; }
    data.CATEGORIES.forEach(function (c) {
      var o = el('option', c); o.value = c; catSel.appendChild(o);
    });
    data.DURATIONS.forEach(function (n) {
      var o = el('option', data.durationLabel(n)); o.value = String(n); durSel.appendChild(o);
    });

    function currentHash() { return root.location ? root.location.hash : ''; }

    var lastListHash = '#/';

    function route() {
      var r = parseHash(currentHash());
      if (filters) { filters.hidden = r.name !== 'list'; }
      if (r.name === 'detail') {
        r.backHash = lastListHash;
        renderDetail(container, r);
        if (root.scrollTo) { root.scrollTo(0, 0); }
      } else if (r.name === 'notfound') {
        renderNotFound(container);
      } else {
        lastListHash = buildHash(r);
        if (searchIn.value.trim() !== r.query) { searchIn.value = r.query; }
        catSel.value = r.category;
        durSel.value = r.duration;
        renderList(container, r);
      }
      return r;
    }

    // Search typing replaces the current history entry (no entry per keystroke);
    // select changes push a new entry. replaceState does not fire hashchange,
    // so the view is re-rendered directly.
    function fromFilters(replace) {
      var h = buildHash({ name: 'list', query: searchIn.value.trim(), category: catSel.value, duration: durSel.value });
      if (!root.location || root.location.hash === h) { return; }
      if (replace === true && root.history && root.history.replaceState) {
        root.history.replaceState(null, '', h);
        route();
      } else {
        root.location.hash = h; // triggers hashchange in browsers
        if (!root.addEventListener) { route(); }
      }
    }

    searchIn.addEventListener('input', function () { fromFilters(true); });
    catSel.addEventListener('change', function () { fromFilters(false); });
    durSel.addEventListener('change', function () { fromFilters(false); });
    if (root.addEventListener) { root.addEventListener('hashchange', route); }
    route();
  }

  var api = { parseHash: parseHash, buildHash: buildHash, renderList: renderList, renderDetail: renderDetail, init: init };
  root.ViagensApp = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : this);
