(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;

  // Extra catalog metadata (events.js has no city/lot data).
  var CITIES = {
    'rock-festival': 'São Paulo',
    'teatro-comedia': 'Rio de Janeiro',
    'show-pop': 'São Paulo'
  };
  // Remaining tickets per lot, per "eventId/sectorId". Default: 3 open lots.
  var LOT_STOCK = {
    'rock-festival/pista': [0, 120, 300],
    'rock-festival/camarote': [0, 0, 0],
    'show-pop/pista-premium': [15, 80, 200]
  };
  var DEFAULT_STOCK = [50, 100, 150];
  var LOT_MARKUP = [0, 20, 40]; // percent over the sector base price

  function normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  function formatCurrency(cents) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function cityOf(event) {
    return CITIES[event.id] || '';
  }

  function getLots(event, sector) {
    var stock = LOT_STOCK[event.id + '/' + sector.id] || DEFAULT_STOCK;
    return stock.map(function (remaining, i) {
      return {
        id: 'lote-' + (i + 1),
        name: 'Lote ' + (i + 1),
        priceCents: Math.round(sector.priceCents * (100 + LOT_MARKUP[i]) / 100),
        remaining: remaining,
        available: remaining > 0
      };
    });
  }

  function currentLot(event, sector) {
    var lots = getLots(event, sector);
    for (var i = 0; i < lots.length; i++) {
      if (lots[i].available) return lots[i];
    }
    return null;
  }

  function filterEvents(events, filters) {
    var f = filters || {};
    var q = normalize(f.q);
    var cat = normalize(f.category);
    var city = normalize(f.city);
    return events.filter(function (e) {
      if (cat && normalize(e.type) !== cat) return false;
      if (city && normalize(cityOf(e)) !== city) return false;
      if (!q) return true;
      return [e.name, e.type, e.description, cityOf(e)].some(function (v) {
        return normalize(v).indexOf(q) > -1;
      });
    });
  }

  function uniqueSorted(values) {
    var seen = {};
    return values.filter(function (v) {
      if (!v || seen[v]) return false;
      seen[v] = true;
      return true;
    }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  // Hash format: "#/", "#/?q=rock&cat=Show&city=X", "#/evento/<id>[/<sectorId>]"
  function parseHash(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var qs = '';
    var idx = h.indexOf('?');
    if (idx > -1) {
      qs = h.slice(idx + 1);
      h = h.slice(0, idx);
    }
    var params = {};
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf('=');
      var k = eq > -1 ? pair.slice(0, eq) : pair;
      var v = eq > -1 ? pair.slice(eq + 1) : '';
      try {
        params[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
      } catch (err) { /* ignore malformed pair */ }
    });
    var m = /^\/evento\/([^/]+)(?:\/([^/]+))?\/?$/.exec(h);
    if (m) {
      var id, sector = null;
      try {
        id = decodeURIComponent(m[1]);
        sector = m[2] ? decodeURIComponent(m[2]) : null;
      } catch (err) {
        return { route: 'home', params: params };
      }
      return { route: 'event', id: id, sectorId: sector, params: params };
    }
    return { route: 'home', params: params };
  }

  function buildHomeHash(filters) {
    var parts = [];
    ['q', 'category', 'city'].forEach(function (k) {
      var key = k === 'category' ? 'cat' : k;
      if (filters[k]) parts.push(key + '=' + encodeURIComponent(filters[k]));
    });
    return '#/' + (parts.length ? '?' + parts.join('&') : '');
  }

  // ---- DOM rendering ----
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildSelect(id, label, options, value) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field__label', label));
    var sel = el('select');
    sel.id = id;
    options.forEach(function (o) {
      var opt = el('option', null, o.label);
      opt.value = o.value;
      sel.appendChild(opt);
    });
    sel.value = value || '';
    wrap.appendChild(sel);
    return { wrap: wrap, select: sel };
  }

  function renderHome(container, params) {
    var allEvents = root.DanEvents.all();
    var filters = {
      q: params.q || '',
      category: params.cat || '',
      city: params.city || ''
    };

    var view = el('div', 'home-view');
    var bar = el('div', 'search-bar');

    var input = el('input');
    input.type = 'search';
    input.id = 'searchInput';
    input.placeholder = 'Buscar por nome, categoria ou cidade...';
    input.setAttribute('aria-label', 'Buscar eventos');
    input.value = filters.q;
    bar.appendChild(input);

    var cats = uniqueSorted(allEvents.map(function (e) { return e.type; }));
    var cities = uniqueSorted(allEvents.map(cityOf));
    // Map URL values onto the real option (case/accent-insensitive); unknown -> '' ("Todas").
    function resolveOption(options, value) {
      var n = normalize(value);
      for (var i = 0; i < options.length; i++) {
        if (normalize(options[i]) === n && n) return options[i];
      }
      return '';
    }
    filters.category = resolveOption(cats, filters.category);
    filters.city = resolveOption(cities, filters.city);
    var catField = buildSelect('categoryFilter', 'Categoria',
      [{ value: '', label: 'Todas' }].concat(cats.map(function (c) { return { value: c, label: c }; })),
      filters.category);
    var cityField = buildSelect('cityFilter', 'Cidade',
      [{ value: '', label: 'Todas' }].concat(cities.map(function (c) { return { value: c, label: c }; })),
      filters.city);
    bar.appendChild(catField.wrap);
    bar.appendChild(cityField.wrap);
    view.appendChild(bar);

    var count = el('p', 'result-count');
    count.setAttribute('aria-live', 'polite');
    view.appendChild(count);
    var list = el('div', 'event-list');
    list.id = 'eventList';
    view.appendChild(list);

    function renderList() {
      list.textContent = '';
      var filtered = filterEvents(allEvents, filters);
      count.textContent = filtered.length + (filtered.length === 1 ? ' evento encontrado' : ' eventos encontrados');
      if (!filtered.length) {
        list.appendChild(el('p', 'empty', 'Nenhum evento encontrado para os filtros selecionados.'));
        return;
      }
      filtered.forEach(function (e) {
        var card = el('article', 'event-card');
        var link = el('a', 'event-card__title', e.name);
        link.href = '#/evento/' + encodeURIComponent(e.id);
        card.appendChild(link);
        card.appendChild(el('p', 'event-card__meta', e.type + (cityOf(e) ? ' · ' + cityOf(e) : '')));
        card.appendChild(el('p', null, e.description));
        list.appendChild(card);
      });
    }

    // Keep URL in sync without triggering a re-render of the page.
    function syncHash() {
      var target = buildHomeHash(filters);
      if (root.history && root.history.replaceState) {
        root.history.replaceState(null, '', target);
      }
    }
    function onChange() { syncHash(); renderList(); }

    input.addEventListener('input', function () { filters.q = input.value; onChange(); });
    catField.select.addEventListener('change', function () { filters.category = catField.select.value; onChange(); });
    cityField.select.addEventListener('change', function () { filters.city = cityField.select.value; onChange(); });

    renderList();
    container.appendChild(view);
  }

  function renderEvent(container, id, sectorId) {
    var event = root.DanEvents.find(id);
    if (!event) {
      container.appendChild(el('p', 'empty', 'Evento não encontrado'));
      return;
    }

    var view = el('div', 'event-view');
    var back = el('a', 'back-link', '← Voltar');
    back.href = '#/';
    view.appendChild(back);
    view.appendChild(el('h1', null, event.name));
    view.appendChild(el('p', 'event-card__meta', event.type + (cityOf(event) ? ' · ' + cityOf(event) : '')));
    view.appendChild(el('p', null, event.description));

    var form = el('div', 'ticket-form');
    var sectorField = buildSelect('sectorSelect', 'Escolha o setor',
      [{ value: '', label: 'Selecione...' }].concat(event.sectors.map(function (s) {
        return { value: s.id, label: s.name };
      })),
      sectorId);
    form.appendChild(sectorField.wrap);

    var batchInfo = el('div', 'batch-info');
    batchInfo.id = 'batchInfo';
    form.appendChild(batchInfo);

    function renderLots() {
      batchInfo.textContent = '';
      var sector = event.sectors.filter(function (s) { return s.id === sectorField.select.value; })[0];
      if (!sector) return;
      var lots = getLots(event, sector);
      var active = currentLot(event, sector);
      if (!active) {
        batchInfo.appendChild(el('p', 'lot lot--soldout', 'Esgotado: todos os lotes deste setor foram vendidos.'));
      }
      var ul = el('ul', 'lot-list');
      lots.forEach(function (lot) {
        var li = el('li', 'lot' + (lot.available ? '' : ' lot--soldout') + (active && lot.id === active.id ? ' lot--current' : ''));
        var status = lot.available
          ? (active && lot.id === active.id ? 'Disponível agora' : 'Em breve') + ' (' + lot.remaining + ' restantes)'
          : 'Esgotado';
        li.textContent = lot.name + ': ' + formatCurrency(lot.priceCents) + ' – ' + status;
        ul.appendChild(li);
      });
      batchInfo.appendChild(ul);
    }

    sectorField.select.addEventListener('change', function () {
      var v = sectorField.select.value;
      var target = '#/evento/' + encodeURIComponent(event.id) + (v ? '/' + encodeURIComponent(v) : '');
      if (root.history && root.history.replaceState) root.history.replaceState(null, '', target);
      renderLots();
    });

    renderLots();
    view.appendChild(form);
    container.appendChild(view);
  }

  function router() {
    var app = document.getElementById('app');
    if (!app) return;
    app.textContent = '';
    var r = parseHash(root.location.hash);
    if (r.route === 'event') renderEvent(app, r.id, r.sectorId);
    else renderHome(app, r.params);
  }

  root.DanApp = {
    normalize: normalize,
    filterEvents: filterEvents,
    getLots: getLots,
    currentLot: currentLot,
    parseHash: parseHash,
    buildHomeHash: buildHomeHash,
    cityOf: cityOf,
    router: router
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('hashchange', router);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', router);
    else router();
  }
})();
