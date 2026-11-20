(function (root) {
  'use strict';

  // Catalog metadata layered on top of DanEvents (city + per-sector lots).
  var META = {
    'rock-festival': {
      city: 'São Paulo',
      extraSectors: [{ id: 'vip', name: 'VIP', priceCents: 25000 }],
      lots: {
        pista: [[1, 15000 - 3000, 100, 100], [2, 15000, 200, 120], [3, 15000 + 4000, 300, 0]],
        vip: [[1, 25000, 50, 50], [2, 25000 + 5000, 80, 10]],
        camarote: [[1, 40000, 30, 30], [2, 40000 + 8000, 30, 12]]
      }
    },
    'teatro-comedia': {
      city: 'Rio de Janeiro',
      extraSectors: [],
      lots: {
        plateia: [[1, 8000 - 1000, 60, 60], [2, 8000, 100, 40]],
        mezanino: [[1, 5000, 40, 40], [2, 5000 + 1000, 40, 0]]
      }
    },
    'show-pop': {
      city: 'Belo Horizonte',
      extraSectors: [{ id: 'vip', name: 'VIP', priceCents: 20000 }],
      lots: {
        'pista-premium': [[1, 30000, 80, 80], [2, 30000 + 5000, 80, 30]],
        pista: [[1, 12000 - 2000, 150, 150], [2, 12000, 200, 90], [3, 12000 + 3000, 200, 0]],
        vip: [[1, 20000, 40, 40], [2, 20000 + 4000, 40, 5]]
      }
    }
  };

  var LOT_STATUS = { available: 'Disponível', last: 'Últimas unidades', soldout: 'Esgotado' };

  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function lotStatus(remaining, total) {
    if (remaining <= 0) return 'soldout';
    return remaining <= Math.max(1, Math.ceil(total * 0.1)) ? 'last' : 'available';
  }

  function isValidCPF(cpf) {
    var strCPF = String(cpf).replace(/[^\d]/g, '');
    if (strCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(strCPF)) return false;
    var soma = 0, resto;
    for (var i = 1; i <= 9; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(strCPF.substring(9, 10))) return false;
    soma = 0;
    for (var i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(strCPF.substring(10, 11))) return false;
    return true;
  }

  function buildLots(rows) {
    return (rows || []).map(function (r) {
      var remaining = Math.max(0, r[3]);
      return {
        id: 'lote-' + r[0],
        name: 'Lote ' + r[0],
        priceCents: r[1],
        total: r[2],
        remaining: remaining,
        status: lotStatus(remaining, r[2])
      };
    });
  }

  function decorate(e) {
    var meta = META[e.id] || { city: '', extraSectors: [], lots: {} };
    var sectors = e.sectors.concat(meta.extraSectors).map(function (s) {
      return { id: s.id, name: s.name, priceCents: s.priceCents, lots: buildLots(meta.lots[s.id]) };
    });
    return {
      id: e.id, name: e.name, type: e.type, category: e.type,
      description: e.description, city: meta.city, sectors: sectors
    };
  }

  function catalog() {
    var api = root.DanEvents;
    return api ? api.all().map(decorate) : [];
  }

  function unique(list, key) {
    var seen = {};
    return list.map(function (e) { return e[key]; }).filter(function (v) {
      if (!v || seen[v]) return false;
      seen[v] = true;
      return true;
    }).sort();
  }

  // filters: { q, category, city }; empty string means "all".
  function filterEvents(events, filters) {
    var f = filters || {};
    var q = normalize(f.q);
    return events.filter(function (e) {
      if (f.category && e.category !== f.category) return false;
      if (f.city && e.city !== f.city) return false;
      if (!q) return true;
      return normalize(e.name + ' ' + e.description + ' ' + e.city + ' ' + e.category).indexOf(q) !== -1;
    });
  }

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (err) { return ''; }
  }

  // Routes: #/  (list, optional ?q=&category=&city=)  and  #/evento/<id>?setor=<id>&lote=<id>
  function parseHash(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var qs = '';
    var i = h.indexOf('?');
    if (i !== -1) { qs = h.slice(i + 1); h = h.slice(0, i); }
    var params = {};
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf('=');
      var k = safeDecode(eq === -1 ? pair : pair.slice(0, eq));
      params[k] = eq === -1 ? '' : safeDecode(pair.slice(eq + 1).replace(/\+/g, ' '));
    });
    var parts = h.split('/').filter(Boolean);
    if (parts[0] === 'sacola') return { name: 'cart', params: params };
    if (parts[0] === 'checkout') return { name: 'checkout', params: params };
    if (parts[0] === 'voucher') return { name: 'voucher', params: params };
    if (parts[0] === 'evento' && parts[1]) {
      return { name: 'event', id: safeDecode(parts[1]), params: params };
    }
    return { name: 'list', params: params };
  }

  function buildHash(route) {
    var p = route.params || {};
    var qs = Object.keys(p).filter(function (k) { return p[k]; }).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
    var base = route.name === 'event' ? '#/evento/' + encodeURIComponent(route.id) 
      : route.name === 'cart' ? '#/sacola' 
      : route.name === 'checkout' ? '#/checkout'
      : route.name === 'voucher' ? '#/voucher'
      : '#/';
    return qs ? base + '?' + qs : base;
  }

  // Resolves which sector/lot are selected for an event + URL params.
  // Unknown sector falls back to the first; unknown or sold-out lot is unselected.
  function resolveSelection(event, params) {
    var p = params || {};
    var sector = event.sectors.filter(function (s) { return s.id === p.setor; })[0] || event.sectors[0] || null;
    var lot = sector ? sector.lots.filter(function (l) {
      return l.id === p.lote && l.status !== 'soldout';
    })[0] || null : null;
    return { sector: sector, lot: lot };
  }

  function formatPrice(cents) {
    var v = (cents / 100).toFixed(2).replace('.', ',');
    return 'R$ ' + v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var api = {
    catalog: catalog, filterEvents: filterEvents, parseHash: parseHash,
    buildHash: buildHash, resolveSelection: resolveSelection, formatPrice: formatPrice, lotStatus: lotStatus,
    LOT_STATUS: LOT_STATUS, isValidCPF: isValidCPF
  };
  root.DanSectors = api;

  // ---- DOM rendering (skipped when there is no document, e.g. in tests) ----
  var doc = root.document;
  if (!doc || !doc.getElementById) return;

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function option(value, label, selected) {
    var o = el('option', null, label);
    o.value = value;
    o.selected = !!selected;
    return o;
  }

  function field(labelText, control) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field__label', labelText));
    wrap.appendChild(control);
    return wrap;
  }

  function renderList(app, route, events) {
    var p = route.params;
    app.textContent = '';
    app.appendChild(el('h1', 'page-title', 'Eventos'));

    var found = filterEvents(events, p);
    var isShowcase = !p.q && !p.category && !p.city && found.length > 0;

    if (isShowcase) {
      var sEv = found[0];
      var showcase = el('section', 'showcase');
      showcase.appendChild(el('h2', 'showcase__title', 'Em Destaque'));
      var fCard = el('div', 'event-card event-card--featured');
      var fA = el('a', 'event-card__link', sEv.name);
      fA.href = buildHash({ name: 'event', id: sEv.id });
      fCard.appendChild(fA);
      fCard.appendChild(el('p', 'event-card__meta', (sEv.category || '') + ' · ' + (sEv.city || '')));
      fCard.appendChild(el('p', null, sEv.description || ''));
      showcase.appendChild(fCard);
      app.appendChild(showcase);
    }

    var form = el('form', 'filters');
    form.setAttribute('role', 'search');
    var q = el('input'); q.type = 'search'; q.name = 'q'; q.value = p.q || '';
    q.placeholder = 'Buscar evento, cidade…';
    var cat = el('select'); cat.name = 'category';
    cat.appendChild(option('', 'Todas', !p.category));
    unique(events, 'category').forEach(function (c) { cat.appendChild(option(c, c, p.category === c)); });
    var city = el('select'); city.name = 'city';
    city.appendChild(option('', 'Todas', !p.city));
    unique(events, 'city').forEach(function (c) { city.appendChild(option(c, c, p.city === c)); });
    form.appendChild(field('Busca', q));
    form.appendChild(field('Categoria', cat));
    form.appendChild(field('Cidade', city));
    form.addEventListener('submit', function (ev) { ev.preventDefault(); });
    function apply() {
      root.location.hash = buildHash({ name: 'list', params: { q: q.value.trim(), category: cat.value, city: city.value } });
    }
    q.addEventListener('change', apply);
    cat.addEventListener('change', apply);
    city.addEventListener('change', apply);
    app.appendChild(form);

    var found = filterEvents(events, p);
    var status = el('p', 'results-count', found.length + (found.length === 1 ? ' evento encontrado' : ' eventos encontrados'));
    status.setAttribute('role', 'status');
    app.appendChild(status);
    var ul = el('ul', 'event-list');
    found.forEach(function (e, index) {
      if (isShowcase && index === 0) return;
      var li = el('li', 'event-card');
      var a = el('a', 'event-card__link', e.name);
      a.href = buildHash({ name: 'event', id: e.id });
      li.appendChild(a);
      li.appendChild(el('p', 'event-card__meta', (e.category || '') + ' · ' + (e.city || '')));
      li.appendChild(el('p', null, e.description || ''));
      ul.appendChild(li);
    });
    app.appendChild(ul);
    if (!found.length) app.appendChild(el('p', 'empty', 'Nenhum evento corresponde aos filtros.'));
  }

  function renderEvent(app, route, events) {
    var e = events.filter(function (x) { return x.id === route.id; })[0];
    app.textContent = '';
    var back = el('a', 'back', '← Todos os eventos');
    back.href = '#/';
    app.appendChild(back);
    if (!e) {
      app.appendChild(el('h1', 'page-title', 'Evento não encontrado'));
      return;
    }
    app.appendChild(el('h1', 'page-title', e.name));
    app.appendChild(el('p', 'event-card__meta', e.category + ' · ' + e.city));
    app.appendChild(el('p', null, e.description));

    var sel = resolveSelection(e, route.params);
    var sector = sel.sector;
    var lot = sel.lot;
    if (!sector) {
      app.appendChild(el('p', 'empty', 'Sem setores disponíveis.'));
      return;
    }

    function go(setor, lote) {
      root.location.hash = buildHash({ name: 'event', id: e.id, params: { setor: setor, lote: lote } });
    }

    var sectorSel = el('select'); sectorSel.name = 'setor';
    e.sectors.forEach(function (s) { sectorSel.appendChild(option(s.id, s.name, s.id === sector.id)); });
    sectorSel.addEventListener('change', function () { go(sectorSel.value, ''); });
    app.appendChild(field('Setor', sectorSel));

    app.appendChild(el('h2', null, 'Lotes – ' + sector.name));
    var ul = el('ul', 'lots');
    sector.lots.forEach(function (l) {
      var li = el('li', 'lot lot--' + l.status);
      var btn = el('button', 'lot__btn', l.name + ' · ' + formatPrice(l.priceCents));
      btn.type = 'button';
      btn.setAttribute('data-lot', l.id);
      btn.disabled = l.status === 'soldout';
      btn.setAttribute('aria-pressed', lot && lot.id === l.id ? 'true' : 'false');
      btn.addEventListener('click', function () { go(sector.id, l.id); });
      li.appendChild(btn);
      li.appendChild(el('span', 'lot__status',
        LOT_STATUS[l.status] + (l.status === 'soldout' ? '' : ' (' + l.remaining + ')')));
      ul.appendChild(li);
    });
    app.appendChild(ul);

    var sum = el('p', 'selection');
    sum.setAttribute('role', 'status');
    sum.textContent = lot && lot.status !== 'soldout'
      ? 'Selecionado: ' + sector.name + ' – ' + lot.name + ' – ' + formatPrice(lot.priceCents)
      : 'Escolha um lote disponível.';
    app.appendChild(sum);

    var cart = root.DanCart;
    if (cart && lot) {
      var buy = el('form', 'buy');
      var typeSel = el('select'); typeSel.name = 'tipo';
      typeSel.appendChild(option('inteira', 'Inteira – ' + formatPrice(lot.priceCents), true));
      typeSel.appendChild(option('meia', 'Meia (50%) – ' + formatPrice(cart.unitPrice(lot.priceCents, 'meia')), false));
      var qty = el('input'); qty.type = 'number'; qty.name = 'qtd'; qty.min = '1'; qty.max = String(cart.MAX_QTY); qty.value = '1';
      var add = el('button', null, 'Adicionar à sacola'); add.type = 'submit';
      buy.appendChild(field('Tipo', typeSel));
      buy.appendChild(field('Quantidade', qty));
      buy.appendChild(add);
      app.appendChild(el('p', null, 'Taxa de serviço de 10% sobre o subtotal após descontos. Cupom DANSHOW10: 10% de desconto nos ingressos.'));
      var msg = el('p', 'coupon-msg'); msg.setAttribute('role', 'status');
      buy.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = Number(qty.value);
        if (!(Number.isInteger(n) && n >= 1 && n <= cart.MAX_QTY)) { msg.textContent = 'Quantidade deve ser de 1 a ' + cart.MAX_QTY + '.'; return; }
        var previous = cart.load();
        var st = cart.addItem(previous, {
          eventId: e.id, eventName: e.name, sectorId: sector.id, sectorName: sector.name,
          lotId: lot.id, lotName: lot.name, type: typeSel.value, qty: n, unitCents: lot.priceCents
        });
        var added = cart.totals(st).tickets - cart.totals(previous).tickets;
        if (!added) {
          var isLimit = previous.items.some(function (i) { return i.eventId === e.id && i.sectorId === sector.id && i.lotId === lot.id && i.type === typeSel.value && i.qty >= cart.MAX_QTY; });
          msg.textContent = isLimit ? 'Limite de ' + cart.MAX_QTY + ' ingressos por evento, setor, lote e tipo atingido.' : 'Erro ao adicionar à sacola. Verifique os dados.';
          return;
        }
        if (!cart.save(st)) { msg.textContent = 'Não foi possível salvar a sacola. Verifique o armazenamento do navegador e tente novamente.'; return; }
        updateCartCount();
        msg.textContent = added < n
          ? 'Adicionados ' + added + ' de ' + n + ' ingressos solicitados. Limite de ' + cart.MAX_QTY + ' por evento, setor, lote e tipo.'
          : 'Adicionado à sacola.';
      });
      app.appendChild(buy);
      app.appendChild(msg);
    }
  }

  function updateCartCount() {
    var n = doc.getElementById('cart-count');
    if (n && root.DanCart) n.textContent = String(root.DanCart.totals(root.DanCart.load()).tickets);
  }

  function revalidateCartItems(stateItems, events, cart) {
    var revalidated = [];
    var changed = false;
    stateItems.forEach(function (i) {
      var ev = events.filter(function (x) { return x.id === i.eventId; })[0];
      if (!ev) { changed = true; return; }
      var sel = resolveSelection(ev, { setor: i.sectorId, lote: i.lotId });
      if (!sel.sector || sel.sector.id !== i.sectorId || !sel.lot || sel.lot.id !== i.lotId || sel.lot.status === 'soldout') { changed = true; return; }
      
      var validQty = Math.max(1, Math.min(i.qty || 1, cart.MAX_QTY, sel.lot.remaining));
      if (i.qty !== validQty) {
        i.qty = validQty;
        changed = true;
      }
      
      if (i.unitCents !== sel.lot.priceCents || i.sectorName !== sel.sector.name || i.lotName !== sel.lot.name || i.eventName !== ev.name) { 
        i.unitCents = sel.lot.priceCents; 
        i.sectorName = sel.sector.name;
        i.lotName = sel.lot.name;
        i.eventName = ev.name;
        changed = true; 
      }
      revalidated.push(i);
    });
    return { items: revalidated, changed: changed };
  }

  function renderCart(app) {
    var cart = root.DanCart;
    app.textContent = '';
    var back = el('a', 'back', '← Todos os eventos');
    back.href = '#/';
    app.appendChild(back);
    app.appendChild(el('h1', 'page-title', 'Sacola'));
    if (!cart) return;
    var state = cart.load();
    var events = catalog();
    var rev = revalidateCartItems(state.items, events, cart);
    if (rev.changed) {
      state.items = rev.items;
      cart.save(state);
    }

    var saveMessage = el('p', 'coupon-msg');
    saveMessage.setAttribute('role', 'status');
    app.appendChild(saveMessage);
    function commit(next) {
      if (!cart.save(next)) {
        saveMessage.textContent = 'Não foi possível salvar a sacola. Tente novamente.';
        return false;
      }
      render();
      return true;
    }
    if (!state.items.length) {
      app.appendChild(el('p', 'empty', 'Sua sacola está vazia.'));
      return;
    }
    var ul = el('ul', 'cart-lines');
    state.items.forEach(function (i, idx) {
      var li = el('li', 'cart-line');
      li.appendChild(el('span', null, i.eventName + ' – ' + i.sectorName + ' – ' + i.lotName + ' · ' +
        (i.type === 'meia' ? 'Meia' : 'Inteira') + ' · ' + formatPrice(cart.unitPrice(i.unitCents, i.type))));
      var q = el('input'); q.type = 'number'; q.min = '1'; q.max = String(cart.MAX_QTY); q.value = String(i.qty);
      q.name = 'qtd-' + idx;
      q.setAttribute('aria-label', 'Quantidade');
      q.addEventListener('change', function () {
        var n = Number(q.value);
        if (!Number.isInteger(n) || n < 1 || n > cart.MAX_QTY) {
          q.value = String(i.qty);
          saveMessage.textContent = 'Quantidade deve ser de 1 a ' + cart.MAX_QTY + '.';
          return;
        }
        if (!commit(cart.setQty(state, idx, n))) q.value = String(i.qty);
      });
      var rm = el('button', null, 'Remover'); rm.type = 'button';
      rm.addEventListener('click', function () { commit(cart.removeItem(state, idx)); });
      li.appendChild(q); li.appendChild(rm);
      ul.appendChild(li);
    });
    app.appendChild(ul);

    var cf = el('form', 'buy');
    var code = el('input'); code.type = 'text'; code.name = 'cupom'; code.value = state.coupon;
    cf.appendChild(field('Cupom', code));
    var apply = el('button', null, 'Aplicar'); apply.type = 'submit';
    cf.appendChild(apply);
    var cmsg = el('p', 'coupon-msg'); cmsg.setAttribute('role', 'status');
    cf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var r = cart.applyCoupon(state, code.value);
      if (!r.ok) { cmsg.textContent = 'Cupom inválido.'; cmsg.className = 'coupon-msg coupon-msg--error'; return; }
      commit(r.state);
    });
    app.appendChild(cf);
    app.appendChild(cmsg);

    var t = cart.totals(state);
    var dl = el('dl', 'cart-summary');
    function row(k, v, cls) { dl.appendChild(el('dt', cls, k)); dl.appendChild(el('dd', cls, v)); }
    row('Subtotal', formatPrice(t.subtotalCents));
    if (t.discountCents) row('Cupom ' + state.coupon + ' (10%)', '− ' + formatPrice(t.discountCents));
    row('Taxa de serviço após descontos (' + Math.round(cart.SERVICE_FEE_RATE * 100) + '%)', formatPrice(t.serviceFeeCents));
    row('Total', formatPrice(t.totalCents), 'total');
    app.appendChild(dl);

    var checkoutAct = el('div', 'checkout-actions');
    var checkoutBtn = el('a', 'btn-checkout', 'Finalizar Compra');
    checkoutBtn.href = '#/checkout';
    checkoutAct.appendChild(checkoutBtn);
    app.appendChild(checkoutAct);
  }

  function renderCheckout(app, events) {
    var cart = root.DanCart;
    app.textContent = '';
    var back = el('a', 'back', '← Voltar para sacola');
    back.href = '#/sacola';
    app.appendChild(back);
    app.appendChild(el('h1', 'page-title', 'Checkout'));

    if (!cart) return;
    var state = cart.load();
    var rev = revalidateCartItems(state.items, events, cart);
    if (rev.changed) {
      state.items = rev.items;
      cart.save(state);
    }

    if (!state.items.length) {
      app.appendChild(el('p', 'empty', 'Sua sacola está vazia.'));
      return;
    }

    var form = el('form', 'checkout-form');
    var inputs = [];
    state.items.forEach(function (i, idx) {
      for (var q = 0; q < i.qty; q++) {
        var fs = el('fieldset', 'checkout-fieldset');
        var leg = el('legend', null, i.eventName + ' – ' + i.sectorName + ' – ' + i.lotName + ' (' + (i.type === 'meia' ? 'Meia' : 'Inteira') + ') - Ingresso ' + (q + 1));
        fs.appendChild(leg);
        
        var nameInput = el('input'); nameInput.type = 'text'; nameInput.name = 'nome-' + idx + '-' + q; nameInput.required = true;
        fs.appendChild(field('Nome', nameInput));
        
        var cpfInput = el('input'); cpfInput.type = 'text'; cpfInput.name = 'cpf-' + idx + '-' + q; cpfInput.required = true;
        fs.appendChild(field('CPF', cpfInput));
        
        inputs.push({ item: i, nameInput: nameInput, cpfInput: cpfInput });
        form.appendChild(fs);
      }
    });

    var errContainer = el('div', 'checkout-errors');
    form.appendChild(errContainer);

    var submit = el('button', null, 'Emitir Voucher'); submit.type = 'submit';
    form.appendChild(submit);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      errContainer.textContent = '';
      var hasError = false;
      var holders = [];
      
      inputs.forEach(function(entry) {
        var n = entry.nameInput.value.trim();
        var c = entry.cpfInput.value.trim();
        if (!n || !c) {
          hasError = true;
          var msgEmpty = el('p', 'coupon-msg coupon-msg--error', 'Preencha todos os campos do ingresso: ' + entry.item.eventName);
          errContainer.appendChild(msgEmpty);
        } else if (!isValidCPF(c)) {
          hasError = true;
          var msg = el('p', 'coupon-msg coupon-msg--error', 'CPF inválido: ' + c);
          errContainer.appendChild(msg);
        }
        var maskedCPF = c.replace(/[^\d]/g, '');
        if (maskedCPF.length === 11) {
          maskedCPF = '***.' + maskedCPF.substring(3, 6) + '.' + maskedCPF.substring(6, 9) + '-**';
        }
        holders.push({ eventName: entry.item.eventName, sectorName: entry.item.sectorName, type: entry.item.type, name: n, cpf: maskedCPF });
      });

      if (hasError) return;
      
      var currentState = cart.load();
      var preSubmitRev = revalidateCartItems(currentState.items, events, cart);
      if (preSubmitRev.changed) {
        cart.save({ items: preSubmitRev.items, coupon: currentState.coupon });
        errContainer.appendChild(el('p', 'coupon-msg coupon-msg--error', 'Alguns itens da sua sacola mudaram (preço ou disponibilidade). Verifique e tente novamente.'));
        return;
      }

      var orderId = 'TKT-';
      if (root.crypto && root.crypto.getRandomValues) {
        var arr = new Uint16Array(2);
        root.crypto.getRandomValues(arr);
        orderId += arr[0].toString(16).padStart(4, '0').toUpperCase() + '-' + arr[1].toString(16).padStart(4, '0').toUpperCase();
      } else {
        orderId += Math.floor(Math.random() * 10000).toString().padStart(4, '0') + '-' + Date.now().toString().slice(-4);
      }
      
      var order = { orderId: orderId, holders: holders };
      try {
        root.sessionStorage.setItem('dan-tickets-order', JSON.stringify(order));
        if (cart.save(cart.emptyState())) {
          root.location.hash = '#/voucher';
        } else {
          errContainer.appendChild(el('p', 'coupon-msg coupon-msg--error', 'Não foi possível limpar a sacola. Verifique o armazenamento.'));
        }
      } catch (e) {
        errContainer.appendChild(el('p', 'coupon-msg coupon-msg--error', 'Não foi possível salvar o pedido. Verifique o armazenamento.'));
      }
    });

    app.appendChild(form);
  }

  function renderVoucher(app) {
    app.textContent = '';
    app.appendChild(el('h1', 'page-title', 'Comprovante (Demonstração)'));
    
    var order = null;
    try {
      var saved = root.sessionStorage.getItem('dan-tickets-order');
      if (saved) {
        order = JSON.parse(saved);
        root.sessionStorage.removeItem('dan-tickets-order');
      }
    } catch(e) {}

    if (!order) {
      app.appendChild(el('p', null, 'Nenhum pedido recente encontrado.'));
      var backEmpty = el('a', 'back', '← Voltar para Home');
      backEmpty.href = '#/';
      app.appendChild(backEmpty);
      return;
    }

    app.appendChild(el('p', null, 'Seu pedido foi confirmado!'));
    app.appendChild(el('p', 'voucher-code', 'Código: ' + order.orderId));
    
    var hUl = el('ul', 'voucher-holders');
    order.holders.forEach(function(h) {
      var itemType = h.type === 'meia' ? 'Meia' : 'Inteira';
      hUl.appendChild(el('li', null, h.eventName + ' - ' + h.sectorName + ' (' + itemType + ') - ' + h.name + ' (' + h.cpf + ')'));
    });
    app.appendChild(hUl);

    var back = el('a', 'back', '← Voltar para Home');
    back.href = '#/';
    app.appendChild(back);
  }

  function render() {
    var app = doc.getElementById('app');
    if (!app) return;
    var route = parseHash(root.location.hash);
    var events = catalog();
    var active = doc.activeElement;
    var focusKey = active && app.contains(active) ? (active.name || active.getAttribute('data-lot') || '') : '';
    var focusIsLot = !!(active && active.getAttribute && active.getAttribute('data-lot'));
    if (route.name === 'cart') renderCart(app);
    else if (route.name === 'checkout') renderCheckout(app, events);
    else if (route.name === 'voucher') renderVoucher(app);
    else if (route.name === 'event') renderEvent(app, route, events);
    else renderList(app, route, events);
    updateCartCount();
    if (focusKey) {
      var target = focusIsLot ? app.querySelector('[data-lot="' + focusKey + '"]') : app.querySelector('[name="' + focusKey + '"]');
      if (target && !target.disabled) target.focus();
    }
  }

  root.addEventListener('hashchange', render);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', render);
  else render();
})(typeof window !== 'undefined' ? window : globalThis);
