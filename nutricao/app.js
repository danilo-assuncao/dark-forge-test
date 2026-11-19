/* Dan Nutri SPA: hash-routed views (home by goal, filterable catalog,
   calculator with quick add-to-cart, cart + checkout with CEP shipping and
   optional teleconsultation). Pure helpers are exported for Node tests; the
   DOM layer only starts when a browser document is present. All prices are
   display-only simulations. */
(function (root) {
  'use strict';

  function load(name, file) {
    if (root[name]) { return root[name]; }
    return typeof require === 'function' ? require(file) : null;
  }
  var catalog = load('DanNutriProducts', './products.js');
  var calc = load('DanNutriCalculator', './calculator.js');
  var shipping = load('DanNutriShipping', './shipping.js');

  function formatBRL(cents) {
    var n = Math.round(Number(cents) || 0);
    var sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    var reais = String(Math.floor(n / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return sign + 'R$ ' + reais + ',' + ('0' + (n % 100)).slice(-2);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fromPrice(p) {
    var min = Infinity;
    p.presentations.forEach(function (k) { if (p.priceCents[k] < min) { min = p.priceCents[k]; } });
    return min;
  }

  // Empty/undefined filter values mean "any".
  function filterProducts(f) {
    f = f || {};
    var q = String(f.query || '').trim().toLowerCase();
    return catalog.products.filter(function (p) {
      return (!f.category || p.category === f.category) &&
        (!f.goal || p.goals.indexOf(f.goal) !== -1) &&
        (!f.presentation || p.presentations.indexOf(f.presentation) !== -1) &&
        (!q || p.name.toLowerCase().indexOf(q) !== -1);
    });
  }

  function toNumber(v) {
    return String(v === undefined || v === null ? '' : v).trim() === '' ? NaN : Number(String(v).replace(',', '.'));
  }

  // Validates raw form strings and runs the calculator; never throws.
  function runCalculator(raw) {
    var profile = {
      weightKg: toNumber(raw.weightKg), heightCm: toNumber(raw.heightCm), age: toNumber(raw.age),
      sex: raw.sex, activity: raw.activity || 'sedentario'
    };
    try {
      return { ok: true, profile: profile, result: calc.calculate(profile, raw.goal) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // First (smallest) presentation, used for the one-click add from suggestions.
  function defaultPresentation(p) { return p.presentations[0]; }

  // Combines cart totals with a shipping quote and optional teleconsultation.
  // Returns { ok:false, error } when the CEP/method is not serviceable.
  function checkoutSummary(totals, opts) {
    opts = opts || {};
    var subtotal = totals.totalCents;
    var q = shipping.quote(opts.cep, opts.method || 'standard', subtotal);
    if (!q.ok) { return { ok: false, error: q.error }; }
    return {
      ok: true,
      shipping: q,
      teleconsult: !!opts.teleconsult,
      shippingCents: q.priceCents,
      totalCents: subtotal + q.priceCents
    };
  }

  var ERRORS = {
    'invalid-cep': 'CEP invalido. Informe 8 digitos.',
    'invalid-method': 'Metodo de envio invalido.',
    'express-unavailable': 'Envio expresso indisponivel para esta regiao.'
  };

  var api = {
    formatBRL: formatBRL, esc: esc, fromPrice: fromPrice, filterProducts: filterProducts,
    runCalculator: runCalculator, defaultPresentation: defaultPresentation,
    checkoutSummary: checkoutSummary, ERRORS: ERRORS
  };

  /* ---------------- DOM layer ---------------- */
  function start(doc) {
    var cart = root.DanNutriCart;
    var app = doc.getElementById('app');
    var state = { filters: {}, calc: { sex: 'M', activity: 'moderado', goal: 'Hipertrofia' }, cep: '', method: 'standard', teleconsult: false, slot: '0', order: null };

    function opt(list, sel, anyLabel) {
      return (anyLabel ? '<option value="">' + anyLabel + '</option>' : '') + list.map(function (v) {
        var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v;
        return '<option value="' + esc(val) + '"' + (val === sel ? ' selected' : '') + '>' + esc(lab) + '</option>';
      }).join('');
    }

    function productCard(p) {
      var sels = p.presentations.map(function (k) {
        return '<option value="' + esc(k) + '">' + esc(k) + ' - ' + formatBRL(p.priceCents[k]) + '</option>';
      }).join('');
      return '<article class="card"><h3>' + esc(p.name) + '</h3><p class="muted">' + esc(p.category) + ' · ' + esc(p.goals.join(', ')) + '</p>' +
        '<p class="muted">Dose ' + esc(p.dose) + ': ' + p.macros.kcal + ' kcal, ' + p.macros.proteinG + ' g proteina</p>' +
        '<p class="price">a partir de ' + formatBRL(fromPrice(p)) + '</p>' +
        '<label>Apresentacao<select data-pres="' + esc(p.id) + '">' + sels + '</select></label> ' +
        '<button class="btn" data-add="' + esc(p.id) + '">Adicionar a cesta</button></article>';
    }

    function viewHome() {
      return '<section class="hero"><h1>Nutricao pensada para o seu objetivo</h1><p>Escolha um objetivo e veja os produtos indicados.</p></section>' +
        '<h2>Comece pelo seu objetivo</h2><div class="grid">' + catalog.goals.map(function (g) {
          return '<a class="card" href="#/catalogo?goal=' + encodeURIComponent(g) + '"><h3>' + esc(g) + '</h3><p class="muted">' +
            catalog.byGoal(g).length + ' produtos indicados</p></a>';
        }).join('') + '</div><p><a class="btn secondary" href="#/calculadora">Calcular minhas metas</a></p>';
    }

    function viewCatalog() {
      var f = state.filters, list = filterProducts(f);
      return '<h1>Catalogo</h1><form class="filters" id="filters" aria-label="Filtros">' +
        '<label>Busca<input type="search" name="query" value="' + esc(f.query || '') + '"></label>' +
        '<label>Categoria<select name="category">' + opt(catalog.categories, f.category, 'Todas') + '</select></label>' +
        '<label>Objetivo<select name="goal">' + opt(catalog.goals, f.goal, 'Todos') + '</select></label>' +
        '<label>Apresentacao<select name="presentation">' + opt(catalog.presentations, f.presentation, 'Todas') + '</select></label></form>' +
        '<p class="muted" role="status">' + list.length + ' produto(s)</p><div class="grid">' +
        (list.length ? list.map(productCard).join('') : '<p>Nenhum produto encontrado.</p>') + '</div>';
    }

    function viewCalc() {
      var c = state.calc, out = '';
      if (c.run) {
        if (!c.run.ok) {
          out = '<p class="error" role="alert">' + esc(c.run.error) + '</p>';
        } else {
          var r = c.run.result;
          out = '<div class="result" role="status"><div class="stat"><strong>' + r.bmi + '</strong>IMC · ' + esc(r.bmiCategory) + '</div>' +
            '<div class="stat"><strong>' + r.bmr + '</strong>TMB (kcal)</div><div class="stat"><strong>' + r.tdee + '</strong>Gasto diario (kcal)</div>' +
            '<div class="stat"><strong>' + r.targets.kcal + '</strong>Meta kcal · ' + esc(r.targets.goal) + '</div>' +
            '<div class="stat"><strong>' + r.targets.proteinG + ' g</strong>Meta proteina</div></div>' +
            '<h2>Sugestoes para ' + esc(r.targets.goal) + '</h2><div class="grid">' + r.suggestions.map(function (p) {
              var pr = defaultPresentation(p);
              return '<article class="card"><h3>' + esc(p.name) + '</h3><p class="price">' + formatBRL(p.priceCents[pr]) + ' · ' + esc(pr) + '</p>' +
                '<button class="btn" data-quick="' + esc(p.id) + '">Adicionar rapido</button></article>';
            }).join('') + '</div>';
        }
      }
      return '<h1>Calculadora</h1><form class="form" id="calc">' +
        '<label>Peso (kg)<input name="weightKg" inputmode="decimal" value="' + esc(c.weightKg || '') + '"></label>' +
        '<label>Altura (cm)<input name="heightCm" inputmode="decimal" value="' + esc(c.heightCm || '') + '"></label>' +
        '<label>Idade<input name="age" inputmode="numeric" value="' + esc(c.age || '') + '"></label>' +
        '<label>Sexo<select name="sex">' + opt([['M', 'Masculino'], ['F', 'Feminino']], c.sex) + '</select></label>' +
        '<label>Atividade<select name="activity">' + opt(Object.keys(calc.activityLevels), c.activity) + '</select></label>' +
        '<label>Objetivo<select name="goal">' + opt(catalog.goals, c.goal) + '</select></label>' +
        '<button class="btn" type="submit">Calcular</button></form>' + out;
    }

    function viewCheckout() {
      if (state.order) {
        var o = state.order;
        return '<h1>Pedido confirmado</h1><div class="ok" role="status"><p>Protocolo <strong>' + esc(o.protocol) + '</strong></p><p>Total: ' + formatBRL(o.totalCents) +
          ' · entrega em ' + o.days + ' dia(s) uteis (' + esc(o.method) + ')</p>' +
          (o.slot ? '<p>Teleconsulta: ' + esc(o.slot.date) + ' as ' + esc(o.slot.time) + ' com ' + esc(o.slot.nutritionist) + '</p>' : '') +
          '</div><p><a class="btn secondary" href="#/catalogo">Continuar comprando</a></p>';
      }
      var t = cart.totals();
      if (!t.count) { return '<h1>Cesta</h1><p>Sua cesta esta vazia.</p><p><a class="btn" href="#/catalogo">Ver catalogo</a></p>'; }
      var rows = t.lines.map(function (l) {
        var p = catalog.find(l.id);
        return '<tr><td>' + esc(p.name) + ' (' + esc(l.presentation) + ')</td><td><input type="number" min="0" max="99" value="' + l.qty +
          '" aria-label="Quantidade de ' + esc(p.name) + '" data-qty="' + esc(l.id) + '|' + esc(l.presentation) + '"></td><td>' + formatBRL(l.lineCents) +
          '</td><td><button class="btn secondary" data-rm="' + esc(l.id) + '|' + esc(l.presentation) + '">Remover</button></td></tr>';
      }).join('');
      var sum = state.cep ? checkoutSummary(t, { cep: state.cep, method: state.method, teleconsult: state.teleconsult }) : null;
      var shipHtml = '';
      if (sum && !sum.ok) { shipHtml = '<p class="error" role="alert">' + esc(ERRORS[sum.error] || 'Erro no frete') + '</p>'; }
      else if (sum) { shipHtml = '<p>Frete (' + esc(sum.shipping.region) + '): ' + (sum.shippingCents ? formatBRL(sum.shippingCents) : 'Gratis') + ' · ' + sum.shipping.days + ' dia(s)</p>'; }
      var slots = shipping.teleconsultSlots(new Date(), 3);
      var slotSel = slots.map(function (s, i) {
        return [String(i), s.date + ' ' + s.time + ' - ' + s.nutritionist];
      });
      return '<h1>Cesta e checkout</h1><table><thead><tr><th>Produto</th><th>Qtd</th><th>Subtotal</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<form class="form" id="coupon"><label>Cupom<input name="code" value="' + esc(t.coupon || '') + '"></label><button class="btn secondary" type="submit">Aplicar</button></form>' +
        '<p>Subtotal: ' + formatBRL(t.subtotalCents) + (t.discountCents ? ' · Desconto: -' + formatBRL(t.discountCents) : '') + '</p>' +
        '<p class="muted">Combo: ' + t.proteinG + ' g de proteina · ' + t.kcal + ' kcal por dose</p>' +
        '<form id="checkout"><fieldset><legend>Entrega</legend><div class="form">' +
        '<label>CEP<input name="cep" inputmode="numeric" placeholder="00000-000" value="' + esc(state.cep) + '"></label>' +
        '<label>Envio<select name="method">' + opt([['standard', 'Padrao'], ['express', 'Expresso']], state.method) + '</select></label></div>' + shipHtml + '</fieldset>' +
        '<fieldset><legend>Teleconsulta (opcional)</legend><label><span><input type="checkbox" name="teleconsult"' + (state.teleconsult ? ' checked' : '') + '> Incluir teleconsulta com nutricionista</span></label>' +
        (state.teleconsult ? '<label>Horario<select name="slot">' + opt(slotSel, state.slot) + '</select></label>' : '') + '</fieldset>' +
        '<p class="price">Total: ' + formatBRL(sum && sum.ok ? sum.totalCents : t.totalCents) + '</p>' +
        '<button class="btn" type="submit">Finalizar pedido</button></form>';
    }

    function parseHash() {
      var h = (doc.location.hash || '#/').slice(1), qi = h.indexOf('?');
      var path = qi === -1 ? h : h.slice(0, qi), params = {};
      if (qi !== -1) {
        h.slice(qi + 1).split('&').forEach(function (kv) {
          var p = kv.split('=');
          if (p[0]) { params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }
        });
      }
      return { path: path, params: params };
    }

    function render() {
      var r = parseHash(), name = { '/catalogo': 'catalogo', '/calculadora': 'calculadora', '/checkout': 'checkout' }[r.path] || 'home';
      if (name === 'catalogo' && r.params.goal && !state.hashApplied) {
        state.filters = { goal: catalog.goals.indexOf(r.params.goal) !== -1 ? r.params.goal : '' };
      }
      state.hashApplied = false;
      app.innerHTML = { home: viewHome, catalogo: viewCatalog, calculadora: viewCalc, checkout: viewCheckout }[name]();
      Array.prototype.forEach.call(doc.querySelectorAll('[data-route]'), function (a) {
        if (a.getAttribute('data-route') === name) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
      });
    }

    function formData(form) {
      var o = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }
      });
      return o;
    }

    function addToCart(id, pres) { return cart.add(id, pres, 1); }

    app.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) { return; }
      var id = b.getAttribute('data-add');
      if (id) {
        var sel = app.querySelector('select[data-pres="' + id + '"]');
        addToCart(id, sel.value);
        b.textContent = 'Adicionado!';
      } else if ((id = b.getAttribute('data-quick'))) {
        addToCart(id, defaultPresentation(catalog.find(id)));
        b.textContent = 'Adicionado!';
      } else if ((id = b.getAttribute('data-rm'))) {
        cart.remove(id.split('|')[0], id.split('|')[1]);
        render();
      }
    });

    app.addEventListener('change', function (e) {
      var el = e.target;
      if (el.form && el.form.id === 'filters') {
        state.filters = formData(el.form);
        state.hashApplied = true;
        render();
        var again = app.querySelector('[name="' + el.name + '"]');
        if (again) { again.focus(); }
      } else if (el.hasAttribute('data-qty')) {
        var k = el.getAttribute('data-qty').split('|');
        cart.setQty(k[0], k[1], el.value);
        render();
      } else if (el.form && el.form.id === 'checkout') {
        var d = formData(el.form);
        state.cep = d.cep; state.method = d.method; state.teleconsult = !!d.teleconsult; state.slot = d.slot || state.slot;
        render();
      }
    });

    app.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, d = formData(form);
      if (form.id === 'calc') {
        state.calc = { weightKg: d.weightKg, heightCm: d.heightCm, age: d.age, sex: d.sex, activity: d.activity, goal: d.goal, run: runCalculator(d) };
        render();
      } else if (form.id === 'coupon') {
        if (d.code && !cart.applyCoupon(d.code)) { form.querySelector('input').setCustomValidity('Cupom invalido'); form.reportValidity(); form.querySelector('input').setCustomValidity(''); return; }
        if (!d.code) { cart.removeCoupon(); }
        render();
      } else if (form.id === 'checkout') {
        state.cep = d.cep; state.method = d.method; state.teleconsult = !!d.teleconsult; state.slot = d.slot || state.slot;
        var t = cart.totals(), sum = checkoutSummary(t, { cep: d.cep, method: d.method, teleconsult: !!d.teleconsult });
        if (!sum.ok) { render(); return; }
        var slot = d.teleconsult ? shipping.teleconsultSlots(new Date(), 3)[Number(d.slot) || 0] : null;
        state.order = { protocol: shipping.generateProtocol(), totalCents: sum.totalCents, days: sum.shipping.days, method: sum.shipping.method, slot: slot || null };
        cart.clear();
        render();
      }
    });

    cart.subscribe(function (t) { doc.getElementById('cart-count').textContent = String(t.count); });
    root.addEventListener('hashchange', function () { state.order = null; render(); });
    doc.getElementById('cart-count').textContent = String(cart.totals().count);
    render();
  }

  if (typeof document !== 'undefined' && root.DanNutriCart) {
    start(document);
  }
  root.DanNutriApp = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
