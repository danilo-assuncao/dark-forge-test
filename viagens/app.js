/* Viagens UI: hash routing, search + category/duration filters and the
   destination detail page with a day-by-day itinerary and package selector.
   Routes: "#/" (catalog, optional ?q=&cat=&dur=) and "#/destino/<id>?dur=N". */
(function (root) {
  'use strict';

  var data = root.ViagensDestinations || (typeof require !== 'undefined' ? require('./destinations.js') : null);
  var quote = root.ViagensQuote || (typeof require !== 'undefined' ? require('./quote.js') : null);
  var booking = root.ViagensBooking || (typeof require !== 'undefined' ? require('./booking.js') : null);

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

  function buildAddForm(d, route) {
    var form = el('form', undefined, 'quote-add');
    form.setAttribute('aria-label', 'Adicionar a cotacao');
    var tl = el('label', 'Viajantes ');
    var tin = el('input');
    tin.type = 'number'; tin.min = '1'; tin.max = String(quote.MAX_TRAVELERS); tin.value = '1';
    tin.id = 'quote-travelers';
    tl.appendChild(tin);
    form.appendChild(tl);
    var il = el('label', undefined, 'check');
    var cb = el('input');
    cb.type = 'checkbox'; cb.id = 'quote-insurance';
    il.appendChild(cb);
    il.appendChild(document.createTextNode('Seguro viagem (+' + data.formatBRL(quote.INSURANCE_CENTS) + ' por viajante)'));
    form.appendChild(il);
    var btn = el('button', 'Adicionar a cotacao');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      route.onAddQuote({ id: d.id, duration: route.duration, travelers: tin.value, insurance: cb.checked });
    });
    form.appendChild(btn);
    return form;
  }

  function renderQuote(container, state, handlers, opts) {
    opts = opts || {};
    container.textContent = '';
    container.appendChild(el('h2', 'Minha cotacao'));
    var res = quote.compute(state);
    if (!res.lines.length) {
      container.appendChild(el('p', 'Sua cotacao esta vazia.', 'empty'));
      return res;
    }
    var ul = el('ul', undefined, 'quote-lines');
    res.lines.forEach(function (l) {
      var li = el('li', undefined, 'quote-line');
      li.appendChild(link(l.name + ' - ' + data.durationLabel(l.duration), buildHash({ name: 'detail', id: l.id, duration: l.duration })));
      var tl = el('label', 'Viajantes ');
      var tin = el('input');
      tin.type = 'number'; tin.min = '1'; tin.max = String(quote.MAX_TRAVELERS); tin.value = String(l.travelers);
      tin.addEventListener('change', function () { handlers.onUpdate(l.id, l.duration, { travelers: tin.value }); });
      tl.appendChild(tin);
      li.appendChild(tl);
      var il = el('label', undefined, 'check');
      var cb = el('input');
      cb.type = 'checkbox'; cb.checked = l.insurance;
      cb.addEventListener('change', function () { handlers.onUpdate(l.id, l.duration, { insurance: cb.checked }); });
      il.appendChild(cb);
      il.appendChild(document.createTextNode('Seguro viagem'));
      li.appendChild(il);
      li.appendChild(el('span', data.formatBRL(l.totalCents), 'line-total'));
      var rm = el('button', 'Remover');
      rm.type = 'button';
      rm.addEventListener('click', function () { handlers.onRemove(l.id, l.duration); });
      li.appendChild(rm);
      ul.appendChild(li);
    });
    container.appendChild(ul);

    var cl = el('label', 'Cupom ');
    var cin = el('input');
    cin.type = 'text'; cin.id = 'quote-coupon'; cin.value = state.coupon; cin.placeholder = 'DANTRIP10';
    cl.appendChild(cin);
    container.appendChild(cl);
    var apply = el('button', 'Aplicar cupom');
    apply.type = 'button';
    apply.addEventListener('click', function () { handlers.onCoupon(cin.value); });
    container.appendChild(apply);
    if (opts.couponError) { container.appendChild(el('p', 'Cupom invalido.', 'coupon-error')); }
    if (state.coupon) {
      container.appendChild(el('p', 'Cupom ' + state.coupon + ' aplicado (-' + quote.COUPON_PERCENT + '%).', 'coupon-ok'));
    }
    container.appendChild(el('p', 'Subtotal: ' + data.formatBRL(res.subtotalCents), 'subtotal'));
    if (res.discountCents) { container.appendChild(el('p', 'Desconto: -' + data.formatBRL(res.discountCents), 'discount')); }
    container.appendChild(el('p', 'Total: ' + data.formatBRL(res.totalCents), 'total'));
    if (handlers.onCheckout) {
      var co = el('button', 'Finalizar reserva', 'checkout-start');
      co.type = 'button';
      co.addEventListener('click', function () { handlers.onCheckout(); });
      container.appendChild(co);
    }
    return res;
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

    if (route.onAddQuote) { article.appendChild(buildAddForm(d, route)); }

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

  function renderHighlights(container, month) {
    container.textContent = '';
    var list = booking.seasonHighlights(month, 3);
    if (!list.length) { return; }
    container.appendChild(el('h2', 'Destaques da temporada'));
    var grid = el('div', undefined, 'grid');
    list.forEach(function (d) {
      var card = el('article', undefined, 'card highlight');
      var h = el('h3');
      h.appendChild(link(d.name, buildHash({ name: 'detail', id: d.id })));
      card.appendChild(h);
      card.appendChild(el('p', 'Melhor epoca: ' + d.climate.season, 'muted'));
      card.appendChild(el('p', 'A partir de ' + data.formatBRL(Math.min.apply(null, d.durations.map(function (n) { return d.priceCents[n]; }))), 'chip'));
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  function renderVoucher(container, v) {
    container.textContent = '';
    container.hidden = false;
    var box = el('article', undefined, 'voucher');
    box.appendChild(el('h2', 'Reserva confirmada'));
    box.appendChild(el('p', v.code, 'voucher-code'));
    box.appendChild(el('p', 'Embarque: ' + v.boarding));
    var pl = el('ul', undefined, 'voucher-travelers');
    v.travelers.forEach(function (t) { pl.appendChild(el('li', t.name + ' - doc. ' + t.document)); });
    box.appendChild(pl);
    var ul = el('ul', undefined, 'voucher-lines');
    v.lines.forEach(function (l) {
      ul.appendChild(el('li', l.name + ' - ' + data.durationLabel(l.duration) + (l.insurance ? ' (com seguro)' : '') + ': ' + data.formatBRL(l.totalCents)));
    });
    box.appendChild(ul);
    if (v.discountCents) { box.appendChild(el('p', 'Desconto: -' + data.formatBRL(v.discountCents))); }
    box.appendChild(el('p', 'Total: ' + data.formatBRL(v.totalCents), 'total'));
    box.appendChild(el('p', 'Voucher simulado, apenas para demonstracao.', 'muted'));
    container.appendChild(box);
  }

  // Passenger list (name + document), boarding point and voucher issue.
  // handlers.onIssue(form) returns { voucher } or { error }.
  function renderCheckout(container, state, handlers) {
    container.textContent = '';
    var need = booking.requiredTravelers(state);
    if (!need) { container.hidden = true; return; }
    container.hidden = false;
    container.appendChild(el('h2', 'Finalizar reserva'));
    var form = el('form', undefined, 'checkout-form');
    form.setAttribute('aria-label', 'Dados dos viajantes');
    form.noValidate = true;
    var rows = [];
    for (var i = 0; i < need; i++) {
      var fs = el('fieldset', undefined, 'traveler');
      fs.appendChild(el('legend', 'Viajante ' + (i + 1)));
      var nl = el('label', 'Nome completo ');
      var nin = el('input'); nin.type = 'text'; nin.autocomplete = 'off';
      nl.appendChild(nin); fs.appendChild(nl);
      var nerr = el('p', undefined, 'field-error'); nerr.setAttribute('role', 'alert'); fs.appendChild(nerr);
      var dl = el('label', 'Documento (CPF ou passaporte) ');
      var din = el('input'); din.type = 'text'; din.autocomplete = 'off';
      dl.appendChild(din); fs.appendChild(dl);
      var derr = el('p', undefined, 'field-error'); derr.setAttribute('role', 'alert'); fs.appendChild(derr);
      form.appendChild(fs);
      rows.push({ name: nin, doc: din, nameErr: nerr, docErr: derr });
    }
    var bl = el('label', 'Local de embarque ');
    var bsel = el('select');
    var ph = el('option', 'Selecione...'); ph.value = ''; bsel.appendChild(ph);
    booking.BOARDINGS.forEach(function (b) { var o = el('option', b.name); o.value = b.id; bsel.appendChild(o); });
    bl.appendChild(bsel); form.appendChild(bl);
    var berr = el('p', undefined, 'field-error'); berr.setAttribute('role', 'alert'); form.appendChild(berr);
    var ferr = el('p', undefined, 'field-error'); ferr.setAttribute('role', 'alert'); form.appendChild(ferr);
    var btn = el('button', 'Emitir voucher', 'issue'); btn.type = 'submit';
    form.appendChild(btn);
    form.addEventListener('submit', function (ev) {
      if (ev && ev.preventDefault) { ev.preventDefault(); }
      var res = handlers.onIssue({
        travelers: rows.map(function (r) { return { name: r.name.value, document: r.doc.value }; }),
        boarding: bsel.value
      });
      if (res.voucher) { return; }
      var e = res.error;
      ferr.textContent = e.formError;
      berr.textContent = e.boardingError;
      rows.forEach(function (r, idx) {
        var er = e.errors[idx] || {};
        r.nameErr.textContent = er.name || '';
        r.docErr.textContent = er.document || '';
      });
    });
    container.appendChild(form);
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
    var quoteBox = document.getElementById('quote');
    var qstate = quote.load();

    var checkoutBox = document.getElementById('checkout');
    var highlightsBox = document.getElementById('highlights');
    var checkoutOpen = false;
    var couponError = false;
    function commit(next) {
      couponError = false;
      qstate = next;
      quote.save(qstate);
      drawQuote();
      drawCheckout();
    }
    function drawCheckout() {
      if (!checkoutBox) { return; }
      if (!checkoutOpen) { checkoutBox.textContent = ''; checkoutBox.hidden = true; return; }
      renderCheckout(checkoutBox, qstate, {
        onIssue: function (form) {
          var res = booking.issueVoucher(qstate, form);
          if (res.voucher) {
            checkoutOpen = false;
            qstate = quote.emptyState();
            quote.save(qstate);
            drawQuote();
            renderVoucher(checkoutBox, res.voucher);
          }
          return res;
        }
      });
    }
    function drawQuote() {
      if (!quoteBox) { return; }
      renderQuote(quoteBox, qstate, {
        onUpdate: function (id, dur, patch) { commit(quote.updateItem(qstate, id, dur, patch)); },
        onRemove: function (id, dur) { commit(quote.removeItem(qstate, id, dur)); },
        onCheckout: checkoutBox ? function () { checkoutOpen = true; drawCheckout(); } : null,
        onCoupon: function (code) {
          var res = quote.applyCoupon(qstate, code);
          if (res.error) { couponError = true; drawQuote(); } else { commit(res.state); }
        }
      }, { couponError: couponError });
    }

    function route() {
      var r = parseHash(currentHash());
      if (filters) { filters.hidden = r.name !== 'list'; }
      if (highlightsBox) {
        if (r.name === 'list' && !r.query && !r.category && !r.duration) { renderHighlights(highlightsBox, new Date().getMonth()); highlightsBox.hidden = false; }
        else { highlightsBox.textContent = ''; highlightsBox.hidden = true; }
      }
      if (r.name === 'detail') {
        r.backHash = lastListHash;
        if (quoteBox) { r.onAddQuote = function (item) { commit(quote.addItem(qstate, item)); }; }
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
    drawQuote();
    route();
  }

  var api = { parseHash: parseHash, buildHash: buildHash, renderList: renderList, renderDetail: renderDetail, renderQuote: renderQuote, renderHighlights: renderHighlights, renderCheckout: renderCheckout, renderVoucher: renderVoucher, init: init };
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
