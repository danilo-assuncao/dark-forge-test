/* Dan Imóveis SPA: wires search, detail with SAC/Price simulator, comparison
   drawer and visit scheduling on top of the ImoveisListings, ImoveisMortgage,
   ImoveisCompare and ImoveisVisits modules. Pure helpers are exported via
   module.exports for Node tests; the DOM part runs only in the browser.
   All dynamic text is written with textContent (no HTML injection). */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var L = isNode ? require('./listings.js') : root.ImoveisListings;
  var M = isNode ? require('./mortgage.js') : root.ImoveisMortgage;
  var C = isNode ? require('./compare.js') : root.ImoveisCompare;
  var V = isNode ? require('./visits.js') : root.ImoveisVisits;
  var P = isNode ? require('./proposal.js') : root.ImoveisProposal;

  function num(v) {
    if (v === '' || v == null) return undefined;
    var n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  // Raw form values (strings) -> filterListings() argument. maxPrice is in reais.
  function buildFilters(v) {
    v = v || {};
    var maxReais = num(v.maxPrice);
    var f = {
      type: v.type || '',
      modality: v.modality || '',
      neighborhood: v.neighborhood || '',
      minBedrooms: num(v.bedrooms),
      maxPrice: maxReais === undefined ? undefined : Math.round(maxReais * 100),
      q: v.q || '',
    };
    return f;
  }

  function search(values) {
    return L.filterListings(buildFilters(values));
  }

  // Mortgage simulation for a sale listing. inputs: downPercent, annualRate, years.
  // Returns { ok:true, result } or { ok:false, error } (never throws).
  function simulateListing(listing, inputs) {
    if (!listing || listing.modality !== 'venda') {
      return { ok: false, error: 'O simulador está disponível apenas para imóveis à venda.' };
    }
    inputs = inputs || {};
    var pct = num(inputs.downPercent);
    var rate = num(inputs.annualRate);
    var years = num(inputs.years);
    if (pct === undefined || pct < 0 || pct > 100) return { ok: false, error: 'Entrada deve estar entre 0% e 100%.' };
    if (rate === undefined || rate < 0 || rate > M.MAX_ANNUAL_RATE) return { ok: false, error: 'Taxa deve estar entre 0 e ' + M.MAX_ANNUAL_RATE + '% a.a.' };
    if (years === undefined || !Number.isInteger(years) || years < 1 || years * 12 > M.MAX_MONTHS) {
      return { ok: false, error: 'Prazo deve ser de 1 a ' + (M.MAX_MONTHS / 12) + ' anos.' };
    }
    try {
      var down = Math.round(listing.price * pct / 100);
      return { ok: true, result: M.simulate({ price: listing.price, down: down, annualRate: rate, months: years * 12 }) };
    } catch (e) {
      return { ok: false, error: 'Não foi possível simular com estes valores.' };
    }
  }

  // Rows for the SAC x Price table: [label, sacText, priceText].
  function simulationRows(result) {
    var f = L.formatBRL;
    return [
      ['Valor financiado', f(result.financed), f(result.financed)],
      ['1ª parcela', f(result.sac.first), f(result.price.first)],
      ['Última parcela', f(result.sac.last), f(result.price.last)],
      ['Juros totais', f(result.sac.interest), f(result.price.interest)],
      ['Custo total', f(result.sac.total), f(result.price.total)],
      ['Renda familiar recomendada', f(result.sac.recommendedIncome), f(result.price.recommendedIncome)],
    ];
  }

  // Comparison rows for the drawer: each is { label, cells:[{text,best}] }.
  function comparisonRows(listings) {
    var rows = C.compareListings(listings);
    function row(label, fn, bestFn) {
      return { label: label, cells: rows.map(function (r) { return { text: fn(r), best: !!(bestFn && bestFn(r)) }; }) };
    }
    return {
      rows: rows,
      table: [
        row('Modalidade', function (r) { return r.modality === 'venda' ? 'Venda' : 'Aluguel'; }),
        row('Preço', function (r) { return L.formatBRL(r.price); }),
        row('Área', function (r) { return L.formatArea(r.areaM2); }),
        row('Preço por m²', function (r) { return r.pricePerM2 === null ? '—' : L.formatBRL(r.pricePerM2); }, function (r) { return r.bestValue; }),
        row('Quartos', function (r) { return String(r.bedrooms); }),
        row('Vagas', function (r) { return String(r.parking); }),
        row('Custo mensal', function (r) { return L.formatBRL(L.monthlyCost(r)); }),
      ],
    };
  }

  // Maps a scheduler result to a user-facing message.
  function visitMessage(res) {
    if (res.ok) return { ok: true, text: 'Visita confirmada! Protocolo ' + res.protocol + ' com ' + res.booking.brokerName + '.' };
    var e = res.errors || {};
    var c = e.contact || {};
    var first = e.slot || e.listingId || e.mode || e.date || e.shift || c.name || c.email || c.phone;
    return { ok: false, text: first || 'Não foi possível agendar a visita.' };
  }

  function isoDate(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------------- DOM ---------------- */

  function initDom(doc) {
    var $ = function (id) { return doc.getElementById(id); };
    var store = C.createStore();
    var scheduler = V.createScheduler();
    var current = null;

    function el(tag, text, cls) {
      var n = doc.createElement(tag);
      if (text != null) n.textContent = text;
      if (cls) n.className = cls;
      return n;
    }
    function option(sel, value, label) {
      var o = doc.createElement('option');
      o.value = value;
      o.textContent = label;
      sel.appendChild(o);
    }
    function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

    L.TYPES.forEach(function (t) { option($('f-type'), t.id, t.name); });
    L.MODALITIES.forEach(function (m) { option($('f-modality'), m.id, m.name); });
    L.NEIGHBORHOODS.forEach(function (n) { option($('f-neighborhood'), n, n); });
    V.MODES.forEach(function (m) { option($('v-mode'), m.id, m.name); });
    P.CONDITIONS.forEach(function (c) { option($('p-condition'), c.id, c.name); });

    function values() {
      return {
        type: $('f-type').value, modality: $('f-modality').value, neighborhood: $('f-neighborhood').value,
        bedrooms: $('f-bedrooms').value, maxPrice: $('f-maxprice').value, q: $('f-q').value,
      };
    }

    function renderCards() {
      var list = search(values());
      var ul = $('cards');
      clear(ul);
      $('results-count').textContent = list.length + (list.length === 1 ? ' imóvel encontrado' : ' imóveis encontrados');
      list.forEach(function (l) {
        var li = el('li', null, 'card');
        li.appendChild(el('span', l.modality === 'venda' ? 'Venda' : 'Aluguel', 'badge'));
        li.appendChild(el('h3', l.title));
        li.appendChild(el('p', l.neighborhood + ' · ' + L.formatArea(l.areaM2) + ' · ' + l.bedrooms + ' quarto(s) · ' + l.parking + ' vaga(s)', 'muted'));
        li.appendChild(el('p', L.formatBRL(l.price) + (l.modality === 'aluguel' ? '/mês' : ''), 'price'));
        var actions = el('div', null, 'card-actions');
        var open = el('button', 'Ver detalhes');
        open.type = 'button';
        open.addEventListener('click', function () { showDetail(l.id); });
        var fav = el('button', 'Favorito', 'secondary');
        fav.type = 'button';
        fav.setAttribute('aria-pressed', String(store.isFavorite(l.id)));
        fav.addEventListener('click', function () {
          fav.setAttribute('aria-pressed', String(store.toggleFavorite(l.id)));
        });
        var cmp = el('button', store.isInCompare(l.id) ? 'Remover da comparação' : 'Comparar', 'secondary');
        cmp.type = 'button';
        cmp.addEventListener('click', function () {
          if (store.isInCompare(l.id)) store.removeFromCompare(l.id);
          else if (!store.addToCompare(l.id)) { $('results-count').textContent = 'Máximo de ' + C.MAX_COMPARE + ' imóveis na comparação.'; return; }
          cmp.textContent = store.isInCompare(l.id) ? 'Remover da comparação' : 'Comparar';
          renderDrawer();
        });
        actions.appendChild(open); actions.appendChild(fav); actions.appendChild(cmp);
        li.appendChild(actions);
        ul.appendChild(li);
      });
    }

    function renderSim() {
      var box = $('sim');
      if (!current || current.modality !== 'venda') { box.hidden = true; return; }
      box.hidden = false;
      var res = simulateListing(current, { downPercent: $('s-down').value, annualRate: $('s-rate').value, years: $('s-years').value });
      var tbody = $('sim-table').querySelector('tbody');
      clear(tbody);
      $('sim-error').textContent = res.ok ? '' : res.error;
      $('sim-note').textContent = '';
      if (!res.ok) return;
      simulationRows(res.result).forEach(function (r) {
        var tr = doc.createElement('tr');
        var th = el('th', r[0]); th.scope = 'row';
        tr.appendChild(th); tr.appendChild(el('td', r[1])); tr.appendChild(el('td', r[2]));
        tbody.appendChild(tr);
      });
      $('sim-note').textContent = 'Economia do SAC sobre a Price: ' + L.formatBRL(res.result.sacSavings) + '.';
    }

    function refreshShifts() {
      var sel = $('v-shift');
      clear(sel);
      var avail = $('v-date').value ? scheduler.availableShifts($('v-date').value, $('v-mode').value) : [];
      V.SHIFTS.forEach(function (s) {
        if (avail.indexOf(s.id) !== -1) option(sel, s.id, s.name + ' (' + s.hours + ')');
      });
      if (!sel.options.length) option(sel, '', 'Sem turnos disponíveis');
    }

    function showDetail(id) {
      current = L.byId(id);
      if (!current) return;
      $('detail').hidden = false;
      $('detail-title').textContent = current.title;
      var dl = $('detail-facts');
      clear(dl);
      [
        ['Tipo', (L.typeById(current.type) || {}).name || current.type],
        ['Modalidade', current.modality === 'venda' ? 'Venda' : 'Aluguel'],
        ['Bairro', current.neighborhood],
        ['Área', L.formatArea(current.areaM2)],
        ['Preço', L.formatBRL(current.price)],
        ['Condomínio', L.formatBRL(current.condo)],
        ['IPTU', L.formatBRL(current.iptu)],
        ['Custo mensal', L.formatBRL(L.monthlyCost(current))],
      ].forEach(function (p) { var d = el('div'); d.appendChild(el('dt', p[0])); d.appendChild(el('dd', p[1])); dl.appendChild(d); });
      $('visit-msg').textContent = '';
      $('proposal-msg').textContent = '';
      $('proposal-summary').hidden = true;
      renderSim();
      refreshShifts();
      $('detail-title').focus();
    }

    function renderDrawer() {
      var ids = store.getCompareIds();
      var data = comparisonRows(ids.map(L.byId).filter(Boolean));
      $('cmp-count').textContent = String(data.rows.length);
      $('cmp-empty').hidden = data.rows.length > 0;
      $('cmp-table').hidden = data.rows.length === 0;
      var head = $('cmp-head'), body = $('cmp-body');
      clear(head); clear(body);
      head.appendChild(el('th', 'Item'));
      data.rows.forEach(function (r) { var th = el('th', r.title); th.scope = 'col'; head.appendChild(th); });
      data.table.forEach(function (r) {
        var tr = doc.createElement('tr');
        var th = el('th', r.label); th.scope = 'row';
        tr.appendChild(th);
        r.cells.forEach(function (c) { tr.appendChild(el('td', c.text + (c.best ? ' ★ melhor custo-benefício' : ''), c.best ? 'best' : '')); });
        body.appendChild(tr);
      });
    }

    $('filters').addEventListener('input', renderCards);
    $('filters').addEventListener('change', renderCards);
    $('filters').addEventListener('reset', function () { setTimeout(renderCards, 0); });
    $('filters').addEventListener('submit', function (e) { e.preventDefault(); });
    $('sim-form').addEventListener('input', renderSim);
    $('sim-form').addEventListener('submit', function (e) { e.preventDefault(); });
    $('detail-close').addEventListener('click', function () { $('detail').hidden = true; current = null; $('results').focus(); });
    $('v-date').addEventListener('change', refreshShifts);
    $('v-mode').addEventListener('change', refreshShifts);
    $('drawer-toggle').addEventListener('click', function () {
      var open = $('drawer-body').hidden;
      $('drawer-body').hidden = !open;
      $('drawer-toggle').setAttribute('aria-expanded', String(open));
      $('drawer-toggle').textContent = open ? 'Fechar' : 'Abrir';
    });
    $('cmp-clear').addEventListener('click', function () { store.clearCompare(); renderDrawer(); renderCards(); });
    $('visit-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!current) return;
      var res = scheduler.schedule({
        listingId: current.id, mode: $('v-mode').value, date: $('v-date').value, shift: $('v-shift').value,
        contact: { name: $('v-name').value, email: $('v-email').value, phone: $('v-phone').value },
      });
      var msg = visitMessage(res);
      var out = $('visit-msg');
      out.textContent = msg.text;
      out.className = msg.ok ? 'ok' : 'error';
      if (msg.ok) refreshShifts();
    });

    $('proposal-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!current) return;
      var res = P.validateProposal({
        listingId: current.id,
        condition: $('p-condition').value,
        amount: $('p-amount').value,
        contact: { name: $('p-name').value, email: $('p-email').value, phone: $('p-phone').value }
      });
      var out = $('proposal-msg');
      if (res.ok) {
        out.textContent = 'Proposta enviada com sucesso! Protocolo ' + res.proposal.protocol + '.';
        out.className = 'ok';
        var sum = P.generateSummary(res.proposal);
        var sumDl = $('summary-facts');
        clear(sumDl);
        [
          ['Protocolo', sum.title],
          ['Data', sum.date],
          ['Proponente', sum.buyer.name],
          ['Imóvel', sum.property.title],
          ['Modalidade', sum.property.modality],
          ['Preço original', sum.property.price],
          ['Condição proposta', sum.offer.condition],
          ['Valor proposto', sum.offer.amount],
        ].forEach(function (p) { var d = el('div'); d.appendChild(el('dt', p[0])); d.appendChild(el('dd', p[1])); sumDl.appendChild(d); });
        $('proposal-summary').hidden = false;
      } else {
        var firstError = res.errors.contact ? res.errors.contact.name || res.errors.contact.email || res.errors.contact.phone : res.errors.condition || res.errors.amount || res.errors.listingId;
        out.textContent = firstError || 'Não foi possível enviar a proposta.';
        out.className = 'error';
        $('proposal-summary').hidden = true;
      }
    });

    $('print-proposal').addEventListener('click', function () {
      window.print();
    });

    var now = new Date();
    var max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + V.MAX_DAYS_AHEAD);
    $('v-date').min = isoDate(now);
    $('v-date').max = isoDate(max);
    renderCards();
    renderDrawer();
  }

  var api = { buildFilters: buildFilters, search: search, simulateListing: simulateListing, simulationRows: simulationRows, comparisonRows: comparisonRows, visitMessage: visitMessage };
  root.ImoveisApp = api;
  if (isNode) module.exports = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initDom(document); });
    else initDom(document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
