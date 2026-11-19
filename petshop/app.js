/* Dan Pets SPA: hash routing, category/species filter, text search and item
   detail with a mandatory size (porte) selector. Pure helpers are exported via
   module.exports for Node tests; the DOM layer only runs in a browser. */
(function (root) {
  'use strict';

  var C = root.DanPetsCatalog || (typeof require === 'function' ? require('./catalog.js') : null);
  var K = root.DanPetsCart || (typeof require === 'function' ? require('./cart.js') : null);

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
    if (path === '/agendar' || path === '/agendar/') return { view: 'booking', service: query.service || null };
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

  // ---- Booking (banho e tosa): pet profile, slots, CEP delivery, protocol ----
  var BOOKING_KEY = 'dan-pets-bookings';
  var SPECIES = [{ id: 'cao', name: 'Cao' }, { id: 'gato', name: 'Gato' }];
  var NOTES_MAX = 300;
  var DELIVERY_MODES = [
    { id: 'loja', name: 'Levo e busco na loja' },
    { id: 'entrega', name: 'Entrega (busca e devolve)' },
    { id: 'taxi', name: 'Taxi-dog (ida e volta)' },
  ];

  // Showcase of promotional prices on the Home (percent off the catalog price).
  var PROMOS = [
    { itemId: 'banho-e-tosa', percent: 15 },
    { itemId: 'banho-simples', percent: 10 },
    { itemId: 'racao-caes-adultos', percent: 5 },
  ];

  function promoPrice(cents, percent) {
    return Math.round(cents * (100 - percent) / 100);
  }

  function cleanCep(cep) { return String(cep == null ? '' : cep).replace(/\D/g, ''); }

  // Simulated delivery quote by CEP region (first digit). Returns null for an
  // invalid CEP. fee is in cents; taxi-dog is a round trip (2x the base fee).
  function deliveryQuote(cep, modeId) {
    var d = cleanCep(cep);
    if (!/^\d{8}$/.test(d) || /^0{8}$/.test(d)) return null;
    var zone = d[0] <= '1' ? { id: 'local', base: 800, days: 1 }
      : d[0] <= '5' ? { id: 'regional', base: 1800, days: 2 }
      : { id: 'distante', base: 3500, days: 3 };
    var fee = modeId === 'entrega' ? zone.base : modeId === 'taxi' ? zone.base * 2 : 0;
    return { cep: d.slice(0, 5) + '-' + d.slice(5), zone: zone.id, mode: modeId, fee: fee, days: zone.days };
  }

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (dt.getUTCFullYear() !== +m[1] || dt.getUTCMonth() !== +m[2] - 1 || dt.getUTCDate() !== +m[3]) return null;
    return dt;
  }

  // Mon-Fri 09-17h, Sat 09-12h, Sun closed. Some slots are "taken" (simulated).
  function availableSlots(dateStr) {
    var dt = parseDate(dateStr);
    if (!dt) return [];
    var dow = dt.getUTCDay();
    if (dow === 0) return [];
    var last = dow === 6 ? 12 : 17;
    var out = [];
    for (var h = 9; h <= last; h++) {
      if ((dt.getUTCDate() + h) % 5 === 0) continue;
      out.push((h < 10 ? '0' : '') + h + ':00');
    }
    return out;
  }

  function bookingServices() {
    return C.ITEMS.filter(function (i) { return i.service; });
  }

  function nextProtocol(rng, taken) {
    var r = typeof rng === 'function' ? rng : Math.random;
    for (var i = 0; i < 200; i++) {
      var n = Math.min(9999, Math.floor(r() * 10000));
      var p = 'PET-' + ('000' + n).slice(-4);
      if (!taken || taken.indexOf(p) === -1) return p;
    }
    return null;
  }

  // input: { petName, species, size, notes, serviceId, date, time, mode, cep }
  // -> { ok, errors } or { ok, booking } with price breakdown and protocol.
  function validateBooking(input) {
    var errors = {};
    var inp = input || {};
    var name = String(inp.petName == null ? '' : inp.petName).trim();
    if (!name) errors.petName = 'Informe o nome do pet.';
    if (!SPECIES.some(function (s) { return s.id === inp.species; })) errors.species = 'Escolha a especie.';
    if (!findSize(inp.size)) errors.size = 'Escolha o porte.';
    if (String(inp.notes == null ? '' : inp.notes).length > NOTES_MAX) errors.notes = 'Observacoes: no maximo ' + NOTES_MAX + ' caracteres.';
    var svc = findItem(inp.serviceId);
    if (!svc || !svc.service) errors.serviceId = 'Escolha o servico.';
    else if (findSize(inp.size) && svc.sizes.indexOf(inp.size) === -1) errors.size = 'Servico indisponivel para este porte.';
    if (!parseDate(inp.date)) errors.date = 'Escolha a data.';
    else if (availableSlots(inp.date).indexOf(inp.time) === -1) errors.time = 'Escolha um horario disponivel.';
    if (!DELIVERY_MODES.some(function (m) { return m.id === inp.mode; })) errors.mode = 'Escolha a forma de atendimento.';
    else if (inp.mode !== 'loja' && !deliveryQuote(inp.cep, inp.mode)) errors.cep = 'CEP invalido (8 digitos).';
    return errors;
  }

  function createBooking(input, storage, rng) {
    var errors = validateBooking(input);
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var list = loadBookings(storage);
    var protocol = nextProtocol(rng, list.map(function (b) { return b.protocol; }));
    if (!protocol) return { ok: false, errors: { protocol: 'Nao foi possivel gerar o protocolo.' } };
    var svc = findItem(input.serviceId);
    var promo = PROMOS.filter(function (p) { return p.itemId === svc.id; })[0];
    var base = C.priceFor(svc, input.size);
    var servicePrice = promo ? promoPrice(base, promo.percent) : base;
    var quote = input.mode === 'loja' ? null : deliveryQuote(input.cep, input.mode);
    var fee = quote ? quote.fee : 0;
    var booking = {
      protocol: protocol,
      pet: { name: String(input.petName).trim(), species: input.species, size: input.size, notes: String(input.notes || '').trim() },
      serviceId: svc.id, date: input.date, time: input.time, mode: input.mode,
      cep: quote ? quote.cep : null, deliveryDays: quote ? quote.days : 0,
      servicePrice: servicePrice, deliveryFee: fee, total: servicePrice + fee,
    };
    list.push(booking);
    if (storage) { try { storage.setItem(BOOKING_KEY, JSON.stringify(list)); } catch (e) { /* ignore quota */ } }
    return { ok: true, booking: booking };
  }

  function loadBookings(storage) {
    try {
      var v = JSON.parse(storage && storage.getItem(BOOKING_KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  var api = {
    SPECIES: SPECIES, DELIVERY_MODES: DELIVERY_MODES, PROMOS: PROMOS, BOOKING_KEY: BOOKING_KEY,
    promoPrice: promoPrice, deliveryQuote: deliveryQuote, availableSlots: availableSlots,
    nextProtocol: nextProtocol, validateBooking: validateBooking, createBooking: createBooking,
    loadBookings: loadBookings, bookingServices: bookingServices,
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
  var cartEl = $('cart');
  var bookingView = $('booking-view');
  var focusSize = null;
  var storage = null;
  try { storage = root.localStorage || null; } catch (e) { storage = null; }
  var cart = K.createCart(storage);
  var mode = 'avulsa';

  function renderCart(focusId) {
    if (!cartEl) return;
    var t = cart.totals();
    clear(cartEl);
    var toFocus = null;
    cartEl.appendChild(el('h2', null, 'Sacola (' + t.count + ')'));
    if (!t.lines.length) {
      cartEl.appendChild(el('p', 'muted', 'Sua sacola esta vazia.'));
      return;
    }
    var ul = el('ul', 'cart-lines');
    t.lines.forEach(function (l) {
      var li = el('li');
      var s = findSize(l.size);
      li.appendChild(el('span', null, l.name + ' - ' + s.name + ' x' + l.qty + ' (' +
        (l.mode === 'assinatura' ? 'assinatura mensal' : 'avulsa') + '): ' + C.formatBRL(l.total)));
      [['-', 'Diminuir', function () { cart.setQty(l.itemId, l.size, l.qty - 1); }],
       ['+', 'Aumentar', function () { cart.setQty(l.itemId, l.size, l.qty + 1); }],
       [l.mode === 'assinatura' ? 'Avulsa' : 'Assinar', 'Alterar modalidade', function () {
         cart.setMode(l.itemId, l.size, l.mode === 'assinatura' ? 'avulsa' : 'assinatura');
       }],
       ['Remover', 'Remover ' + l.name, function () { cart.remove(l.itemId, l.size); }]
      ].forEach(function (a) {
        var b = el('button', null, a[0]);
        b.type = 'button';
        b.setAttribute('aria-label', a[1] + ' - ' + l.name + ' ' + s.name);
        var bid = l.itemId + '|' + l.size + '|' + a[1];
        b.dataset.fid = bid;
        if (focusId === bid) toFocus = b;
        b.addEventListener('click', function () { a[2](); renderCart(bid); });
        li.appendChild(b);
      });
      ul.appendChild(li);
    });
    cartEl.appendChild(ul);
    var coupon = el('div', 'coupon');
    var input = el('input');
    input.type = 'text';
    input.value = t.coupon || '';
    input.setAttribute('aria-label', 'Cupom');
    var apply = el('button', null, 'Aplicar cupom');
    apply.type = 'button';
    var cmsg = el('p', 'muted');
    cmsg.setAttribute('role', 'status');
    input.dataset.fid = 'coupon-input';
    apply.dataset.fid = 'coupon-apply';
    if (focusId === 'coupon-input') toFocus = input;
    if (focusId === 'coupon-apply') toFocus = apply;
    apply.addEventListener('click', function () {
      if (cart.applyCoupon(input.value)) renderCart('coupon-apply');
      else cmsg.textContent = 'Cupom invalido.';
    });
    coupon.appendChild(input);
    coupon.appendChild(apply);
    if (t.coupon) {
      var rm = el('button', null, 'Remover cupom');
      rm.type = 'button';
      rm.dataset.fid = 'coupon-remove';
      rm.addEventListener('click', function () { cart.removeCoupon(); renderCart('coupon-input'); });
      coupon.appendChild(rm);
    }
    cartEl.appendChild(coupon);
    cartEl.appendChild(cmsg);
    cartEl.appendChild(el('p', null, 'Subtotal: ' + C.formatBRL(t.subtotal)));
    if (t.subscriptionDiscount) cartEl.appendChild(el('p', null, 'Desconto assinatura (5%): -' + C.formatBRL(t.subscriptionDiscount)));
    if (t.couponDiscount) cartEl.appendChild(el('p', null, 'Cupom ' + t.coupon + ' (10%): -' + C.formatBRL(t.couponDiscount)));
    cartEl.appendChild(el('p', 'price', 'Total: ' + C.formatBRL(t.total)));
    // Rebuilding the subtree destroys the focused node: restore focus.
    if (!toFocus && focusId) {
      toFocus = cartEl.children[0];
      if (toFocus) toFocus.tabIndex = -1;
    }
    if (toFocus && toFocus.focus) toFocus.focus();
  }

  function renderList(route) {
    var cat = route.cat && C.CATEGORIES.some(function (c) { return c.id === route.cat; }) ? route.cat : null;
    listView.hidden = false;
    detailView.hidden = true;
    if (bookingView) bookingView.hidden = true;
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
    if (bookingView) bookingView.hidden = true;
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
    detailView.appendChild(el('h3', null, 'Modalidade'));
    var modes = el('div', 'modes');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Modalidade');
    [['avulsa', 'Compra avulsa'], ['assinatura', 'Assinatura mensal (5% off)']].forEach(function (m) {
      var mb = el('button', null, m[1]);
      mb.type = 'button';
      mb.setAttribute('aria-pressed', String(mode === m[0]));
      mb.addEventListener('click', function () {
        mode = m[0];
        Array.prototype.forEach.call(modes.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        mb.setAttribute('aria-pressed', 'true');
      });
      modes.appendChild(mb);
    });
    detailView.appendChild(modes);
    var cta = el('button', 'cta', item.service ? 'Agendar' : 'Escolher');
    cta.type = 'button';
    cta.disabled = !size;
    var msg = el('p', 'muted');
    msg.setAttribute('role', 'status');
    cta.addEventListener('click', function () {
      cart.add(item.id, size, mode, 1);
      renderCart();
      msg.textContent = item.name + ' - porte ' + findSize(size).name + ' adicionado a sacola (' +
        (mode === 'assinatura' ? 'assinatura mensal' : 'avulsa') + '). A modalidade vale para todas as unidades deste item e porte.';
    });
    detailView.appendChild(cta);
    detailView.appendChild(msg);
    if (item.service) {
      var book = el('a', 'back', 'Agendar horario com ficha do pet');
      book.href = '#/agendar?service=' + encodeURIComponent(item.id);
      detailView.appendChild(book);
    }
  }

  function renderPromos() {
    var box = $('promos');
    if (!box) return;
    clear(box);
    box.appendChild(el('h2', null, 'Promocoes da semana'));
    var g = el('div', 'grid');
    PROMOS.forEach(function (p) {
      var it = findItem(p.itemId);
      if (!it) return;
      var sid = it.sizes[0];
      var base = C.priceFor(it, sid);
      var card = el('article', 'card promo');
      card.appendChild(el('span', 'badge', p.percent + '% OFF'));
      var h3 = el('h3');
      var a = el('a', null, it.name);
      a.href = it.service ? '#/agendar?service=' + encodeURIComponent(it.id) : detailHash(it.id, sid);
      h3.appendChild(a);
      card.appendChild(h3);
      card.appendChild(el('p', 'muted', 'Porte ' + findSize(sid).name + ' - de ' + C.formatBRL(base)));
      card.appendChild(el('p', 'price', 'por ' + C.formatBRL(promoPrice(base, p.percent))));
      g.appendChild(card);
    });
    box.appendChild(g);
  }

  function renderBooking(route) {
    listView.hidden = true;
    detailView.hidden = true;
    bookingView.hidden = false;
    clear(bookingView);
    var back = el('a', 'back', '← Voltar a loja');
    back.href = '#/';
    bookingView.appendChild(back);
    bookingView.appendChild(el('h2', null, 'Agendar banho e tosa'));
    var svcs = bookingServices();
    var st = {
      petName: '', species: 'cao', size: 'mini', notes: '',
      serviceId: findItem(route.service) && findItem(route.service).service ? route.service : svcs[0].id,
      date: '', time: '', mode: 'loja', cep: '',
    };
    var form = el('form', 'booking');
    form.noValidate = true;
    var summary = el('div', 'summary');
    summary.setAttribute('aria-live', 'polite');
    var slotsBox = el('div', 'slots');
    slotsBox.setAttribute('role', 'group');
    slotsBox.setAttribute('aria-label', 'Horarios disponiveis');
    var cepField;
    var errEls = {};

    function field(key, label, control) {
      var wrap = el('label', 'field');
      wrap.appendChild(el('span', null, label));
      wrap.appendChild(control);
      var er = el('small', 'error');
      er.setAttribute('role', 'alert');
      errEls[key] = er;
      wrap.appendChild(er);
      form.appendChild(wrap);
      return wrap;
    }
    function select(opts, key) {
      var s = el('select');
      s.dataset.field = key;
      opts.forEach(function (o) {
        var op = el('option', null, o[1]);
        op.value = o[0];
        s.appendChild(op);
      });
      s.value = st[key];
      s.addEventListener('change', function () { st[key] = s.value; refresh(); });
      return s;
    }

    form.appendChild(el('h3', null, 'Ficha do pet'));
    var nameIn = el('input');
    nameIn.type = 'text';
    nameIn.dataset.field = 'petName';
    nameIn.addEventListener('input', function () { st.petName = nameIn.value; });
    field('petName', 'Nome do pet', nameIn);
    field('species', 'Especie', select(SPECIES.map(function (s) { return [s.id, s.name]; }), 'species'));
    field('size', 'Porte', select(C.SIZES.map(function (s) { return [s.id, s.name + ' (' + s.weightRange + ')']; }), 'size'));
    var notesIn = el('textarea');
    notesIn.dataset.field = 'notes';
    notesIn.maxLength = NOTES_MAX;
    notesIn.addEventListener('input', function () { st.notes = notesIn.value; });
    field('notes', 'Observacoes (alergias, comportamento...)', notesIn);

    form.appendChild(el('h3', null, 'Servico e horario'));
    field('serviceId', 'Servico', select(svcs.map(function (s) { return [s.id, s.name]; }), 'serviceId'));
    var dateIn = el('input');
    dateIn.type = 'date';
    dateIn.dataset.field = 'date';
    var d0 = new Date();
    d0.setDate(d0.getDate() + 1);
    dateIn.min = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
    dateIn.addEventListener('change', function () { st.date = dateIn.value; st.time = ''; renderSlots(); refresh(); });
    field('date', 'Data', dateIn);
    form.appendChild(slotsBox);
    var timeErr = el('small', 'error');
    timeErr.setAttribute('role', 'alert');
    errEls.time = timeErr;
    form.appendChild(timeErr);

    form.appendChild(el('h3', null, 'Atendimento'));
    field('mode', 'Forma de atendimento', select(DELIVERY_MODES.map(function (m) { return [m.id, m.name]; }), 'mode'));
    var cepIn = el('input');
    cepIn.type = 'text';
    cepIn.inputMode = 'numeric';
    cepIn.placeholder = '00000-000';
    cepIn.dataset.field = 'cep';
    cepIn.addEventListener('input', function () { st.cep = cepIn.value; refresh(); });
    cepField = field('cep', 'CEP', cepIn);

    function renderSlots() {
      clear(slotsBox);
      if (!st.date) { slotsBox.appendChild(el('p', 'muted', 'Escolha uma data para ver os horarios.')); return; }
      var slots = availableSlots(st.date);
      if (!slots.length) { slotsBox.appendChild(el('p', 'muted', 'Sem horarios nesta data (domingo ou lotado).')); return; }
      slots.forEach(function (t) {
        var b = el('button', null, t);
        b.type = 'button';
        b.dataset.time = t;
        b.setAttribute('aria-pressed', String(st.time === t));
        b.addEventListener('click', function () {
          st.time = t;
          Array.prototype.forEach.call(slotsBox.children, function (x) { x.setAttribute('aria-pressed', String(x.dataset.time === t)); });
          refresh();
        });
        slotsBox.appendChild(b);
      });
    }

    function refresh() {
      cepField.hidden = st.mode === 'loja';
      clear(summary);
      var svc = findItem(st.serviceId);
      var promo = PROMOS.filter(function (p) { return p.itemId === st.serviceId; })[0];
      var base = svc && svc.sizes.indexOf(st.size) !== -1 ? C.priceFor(svc, st.size) : null;
      if (base == null) { summary.appendChild(el('p', 'muted', 'Servico indisponivel para este porte.')); return; }
      var sp = promo ? promoPrice(base, promo.percent) : base;
      summary.appendChild(el('p', null, 'Servico: ' + C.formatBRL(sp) + (promo ? ' (' + promo.percent + '% OFF)' : '')));
      var fee = 0;
      if (st.mode !== 'loja') {
        var q = deliveryQuote(st.cep, st.mode);
        if (q) {
          fee = q.fee;
          summary.appendChild(el('p', null, (st.mode === 'taxi' ? 'Taxi-dog' : 'Entrega') + ' para ' + q.cep + ' (regiao ' + q.zone +
            ', ate ' + q.days + (q.days > 1 ? ' dias' : ' dia') + '): ' + C.formatBRL(q.fee)));
        } else {
          summary.appendChild(el('p', 'muted', 'Informe um CEP valido para calcular a entrega (simulado).'));
        }
      }
      summary.appendChild(el('p', 'price', 'Total: ' + C.formatBRL(sp + fee)));
    }

    var submit = el('button', 'cta', 'Confirmar agendamento');
    submit.type = 'submit';
    form.appendChild(summary);
    form.appendChild(submit);
    var result = el('div', 'result');
    result.setAttribute('role', 'status');
    form.addEventListener('submit', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      var r = createBooking(st, storage);
      Object.keys(errEls).forEach(function (k) { errEls[k].textContent = (r.errors && r.errors[k]) || ''; });
      clear(result);
      if (!r.ok) {
        result.appendChild(el('p', 'error', 'Revise os campos destacados.'));
        return;
      }
      var b = r.booking;
      result.appendChild(el('h3', null, 'Agendamento confirmado'));
      result.appendChild(el('p', 'protocol', 'Protocolo: ' + b.protocol));
      result.appendChild(el('p', null, b.pet.name + ' - ' + findItem(b.serviceId).name + ' em ' + b.date + ' as ' + b.time + '. Total: ' + C.formatBRL(b.total) + '.'));
      submit.disabled = true;
    });
    renderSlots();
    refresh();
    bookingView.appendChild(form);
    bookingView.appendChild(result);
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
    if (route.view === 'booking' && bookingView) renderBooking(route);
    else if (route.view === 'detail') renderDetail(route);
    else renderList(route.view === 'list' ? route : { cat: null, q: '' });
  }

  renderStatic();
  renderPromos();
  renderCart();
  // Another tab changed the cart: reload from storage and re-render.
  root.addEventListener('storage', function (e) {
    if (e && e.key && e.key !== K.STORAGE_KEY) return;
    cart.reload();
    renderCart();
  });
  root.addEventListener('hashchange', render);
  render();
})(typeof window !== 'undefined' ? window : this);
