(function () {
  'use strict';

  var ROW_COUNT = 6;
  var WORDS_PER_HALF = 12;
  var WORD_TEXT = 'DAN';

  function createWord() {
    var span = document.createElement('span');
    span.className = 'word';
    span.textContent = WORD_TEXT;
    return span;
  }

  function createHalf() {
    var half = document.createElement('div');
    half.className = 'half';
    for (var i = 0; i < WORDS_PER_HALF; i++) {
      half.appendChild(createWord());
    }
    return half;
  }

  function createRow() {
    var row = document.createElement('div');
    row.className = 'row';

    var track = document.createElement('div');
    track.className = 'track';

    // Two identical halves: animating -50% loops seamlessly.
    track.appendChild(createHalf());
    track.appendChild(createHalf());

    row.appendChild(track);
    return row;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function buildMarquee() {
    var marquee = el('div', 'marquee');
    marquee.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < ROW_COUNT; i++) {
      marquee.appendChild(createRow());
    }
    return marquee;
  }

  var BRAND = 'Dan Food';

  // Meta description per route (SEO); the views below attach theirs.
  var DESCRIPTIONS = {
    home: 'Dan Food: combos do dia, pratos executivos, massas, burgers e sobremesas com delivery por CEP ou retirada no balcao.',
    about: 'Sobre o Dan Food, um restaurante simulado construido como uma pequena aplicacao de pagina unica.',
    catalog: 'Explore o cardapio do Dan Food e filtre por categoria culinaria.',
    cart: 'Revise os pratos da sua sacola Dan Food e ajuste quantidades ou aplique um cupom.',
    checkout: 'Feche seu pedido Dan Food com Delivery por CEP ou Retirada no Balcao.',
    confirmed: 'Seu pedido simulado do Dan Food foi confirmado.',
    product: 'Detalhes, porcoes, tempo de preparo e informacao nutricional deste prato Dan Food.',
    notFound: 'The page you are looking for does not exist.'
  };


  // ----- Views: each returns { title, description, node } -----

  function featuredProducts() {
    var all = window.DanProducts ? window.DanProducts.all() : [];
    return all.slice(0, 4);
  }

  // Combos of the day: each card lists its dishes and adds them to the bag together.
  function comboCard(combo) {
    var item = el('li', 'combo-item');
    var card = el('div', 'combo-card');
    card.appendChild(el('h3', 'product-name', combo.name));
    card.appendChild(el('p', 'combo-description', combo.description));
    var list = el('ul', 'combo-dishes');
    combo.dishes.forEach(function (dish) {
      var li = el('li');
      var link = el('a', 'text-link', dish.name + ' (' + dish.sizes[0] + ')');
      link.href = '#/produto/' + encodeURIComponent(dish.id);
      li.appendChild(link);
      list.appendChild(li);
    });
    card.appendChild(list);
    card.appendChild(el('p', 'product-price', formatPrice(combo.priceCents)));
    var status = el('p', 'cart-status combo-status');
    status.setAttribute('role', 'status');
    var add = el('button', 'action-button combo-add', 'Adicionar combo \u00e0 sacola');
    add.type = 'button';
    add.addEventListener('click', function () {
      status.textContent = '';
      var ok = !!window.DanCart;
      combo.dishes.forEach(function (dish) {
        if (ok && !window.DanCart.add(dish.id, 1, dish.sizes[0])) {
          ok = false;
        }
      });
      status.textContent = ok ? combo.name + ' adicionado \u00e0 sacola.' : 'Quantidade m\u00e1xima atingida.';
    });
    card.appendChild(add);
    card.appendChild(status);
    item.appendChild(card);
    return item;
  }

  function homeView() {
    var home = el('div', 'home');
    var stage = el('div', 'home-stage');
    stage.appendChild(buildMarquee());
    var hero = el('section', 'hero');
    hero.setAttribute('aria-labelledby', 'hero-title');
    var heading = el('h1', 'hero-title', BRAND);
    heading.id = 'hero-title';
    hero.appendChild(heading);
    hero.appendChild(el('p', 'hero-eyebrow', 'Cozinha Dan Food'));
    hero.appendChild(el('p', 'hero-tagline', 'Executivos, massas, burgers e sobremesas com delivery por CEP ou retirada no balc\u00e3o.'));
    var cta = el('a', 'action-button hero-cta', 'Ver o card\u00e1pio');
    cta.href = '#/catalog';
    hero.appendChild(cta);
    stage.appendChild(hero);
    home.appendChild(stage);

    var categories = window.DanProducts && window.DanProducts.categories ? window.DanProducts.categories() : [];
    if (categories.length) {
      var nav = el('nav', 'home-categories container');
      nav.setAttribute('aria-label', 'Navegar por categoria');
      categories.forEach(function (category) {
        var link = el('a', 'category-link', category);
        link.href = '#/catalog?category=' + encodeURIComponent(category);
        nav.appendChild(link);
      });
      home.appendChild(nav);
    }

    var combos = window.DanProducts && window.DanProducts.combos ? window.DanProducts.combos() : [];
    if (combos.length) {
      var deals = el('section', 'combos-showcase container');
      deals.setAttribute('aria-labelledby', 'combos-title');
      var dealsTitle = el('h2', 'showcase-title', 'Combos do dia');
      dealsTitle.id = 'combos-title';
      deals.appendChild(dealsTitle);
      deals.appendChild(el('p', 'revision-intro', 'Prato principal e acompanhamento escolhidos para hoje, na por\u00e7\u00e3o individual.'));
      var comboGrid = el('ul', 'revision-grid combo-grid');
      combos.forEach(function (combo) {
        comboGrid.appendChild(comboCard(combo));
      });
      deals.appendChild(comboGrid);
      home.appendChild(deals);
    }

    var featured = featuredProducts();
    if (featured.length) {
      var showcase = el('section', 'showcase container');
      showcase.setAttribute('aria-labelledby', 'showcase-title');
      var showcaseTitle = el('h2', 'showcase-title', 'Pratos populares');
      showcaseTitle.id = 'showcase-title';
      showcase.appendChild(showcaseTitle);
      var grid = el('ul', 'product-grid');
      featured.forEach(function (product) {
        grid.appendChild(productCard(product));
      });
      showcase.appendChild(grid);
      var all = el('a', 'text-link showcase-link', 'Ver o card\u00e1pio completo');
      all.href = '#/catalog';
      showcase.appendChild(all);
      home.appendChild(showcase);
    }
    return { title: BRAND + ' \u2013 Restaurante delivery', description: DESCRIPTIONS.home, node: home };
  }

  function contentView(title, paragraph) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', title));
    container.appendChild(el('p', null, paragraph));
    return container;
  }

  function aboutView() {
    return {
      title: 'Sobre \u2013 ' + BRAND,
      description: DESCRIPTIONS.about,
      node: contentView('Sobre', 'O Dan Food \u00e9 um restaurante simulado: nenhum prato \u00e9 preparado e nenhum pagamento \u00e9 cobrado.')
    };
  }

  function notFoundView() {
    var container = contentView('Page not found (404)', 'Sorry, we could not find that page. It may have moved, or the link may be wrong.');
    var link = el('a', 'text-link', 'Back to the home page');
    link.href = '#/';
    container.appendChild(link);
    return { title: '404 \u2013 ' + BRAND, description: DESCRIPTIONS.notFound, node: container };
  }

  // ----- Catalog -----

  function formatPrice(cents) {
    var reais = Math.floor(cents / 100);
    var rest = String(cents % 100);
    if (rest.length < 2) {
      rest = '0' + rest;
    }
    return 'R$ ' + String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + rest;
  }

  function productImage(product) {
    // Placeholder tile with the product initial; no image assets needed.
    var tile = el('div', 'product-image', product.name.charAt(0));
    tile.setAttribute('aria-hidden', 'true');
    return tile;
  }

  function productCard(product) {
    var item = el('li', 'product-item');
    var link = el('a', 'product-card');
    link.href = '#/produto/' + encodeURIComponent(product.id);
    link.appendChild(productImage(product));
    link.appendChild(el('span', 'product-name', product.name));
    if (product.category) {
      link.appendChild(el('span', 'product-category', product.category));
    }
    link.appendChild(el('span', 'product-price', formatPrice(product.priceCents)));
    if (product.boxTime) {
      link.appendChild(el('span', 'product-box-time', 'Tempo de preparo: ' + product.boxTime));
    }
    if (product.sizes && product.sizes.length) {
      link.appendChild(el('span', 'product-sizes', 'Por\u00e7\u00f5es: ' + product.sizes.join(', ')));
    }
    item.appendChild(link);
    return item;
  }

  // Reads ?category=Name from the hash (used by the home category links).
  function categoryFromHash() {
    var query = window.location.hash.split('?')[1] || '';
    var parts = query.split('&');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (pair[0] === 'category') {
        try {
          return decodeURIComponent(pair[1] || '');
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  function catalogView() {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', 'Card\u00e1pio'));
    var products = window.DanProducts ? window.DanProducts.all() : [];
    var categories = window.DanProducts && window.DanProducts.categories ? window.DanProducts.categories() : [];
    var grid = el('ul', 'product-grid');
    var buttons = [];

    function show(category) {
      grid.textContent = '';
      for (var i = 0; i < products.length; i++) {
        if (category === null || products[i].category === category) {
          grid.appendChild(productCard(products[i]));
        }
      }
      for (var b = 0; b < buttons.length; b++) {
        buttons[b].node.setAttribute('aria-pressed', buttons[b].category === category ? 'true' : 'false');
      }
    }

    if (categories.length) {
      var filter = el('div', 'category-filter');
      filter.setAttribute('role', 'group');
      filter.setAttribute('aria-label', 'Filtrar por categoria');
      var labels = [null].concat(categories);
      labels.forEach(function (category) {
        var button = el('button', 'filter-button', category === null ? 'Todas' : category);
        button.type = 'button';
        button.addEventListener('click', function () {
          show(category);
        });
        buttons.push({ category: category, node: button });
        filter.appendChild(button);
      });
      container.appendChild(filter);
    }
    var initial = categoryFromHash();
    show(categories.indexOf(initial) === -1 ? null : initial);
    container.appendChild(grid);
    return { title: 'Card\u00e1pio \u2013 ' + BRAND, description: DESCRIPTIONS.catalog, node: container };
  }

  function measurementsTable(product, rowNodes) {
    var section = el('section', 'measurements');
    section.appendChild(el('h2', 'measurements-title', 'Informa\u00e7\u00e3o nutricional'));
    var data = product.measurements;
    if (!data || !data.rows || !data.rows.length || !data.columns) {
      section.appendChild(el('p', null, 'Este prato n\u00e3o tem tabela nutricional.'));
      return section;
    }
    var table = el('table', 'measurements-table');
    table.appendChild(el('caption', null, (data.unit || 'Informa\u00e7\u00e3o nutricional')));
    var head = el('thead');
    var headRow = el('tr');
    var corner = el('th', null, 'Por\u00e7\u00e3o');
    corner.setAttribute('scope', 'col');
    headRow.appendChild(corner);
    data.columns.forEach(function (column) {
      var th = el('th', null, column);
      th.setAttribute('scope', 'col');
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    var body = el('tbody');
    data.rows.forEach(function (entry) {
      var row = el('tr');
      var label = el('th', null, entry.size);
      label.setAttribute('scope', 'row');
      row.setAttribute('data-size', entry.size);
      if (rowNodes) {
        rowNodes.push(row);
      }
      row.appendChild(label);
      entry.values.forEach(function (value) {
        row.appendChild(el('td', null, value));
      });
      body.appendChild(row);
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function specsSection(product) {
    var section = el('section', 'specs');
    section.appendChild(el('h2', 'specs-title', 'Detalhes do prato'));
    if (!product.specs || !product.specs.length) {
      section.appendChild(el('p', null, 'Detalhes indispon\u00edveis.'));
      return section;
    }
    var list = el('dl', 'specs-list');
    for (var i = 0; i < product.specs.length; i++) {
      list.appendChild(el('dt', null, product.specs[i].label));
      list.appendChild(el('dd', null, product.specs[i].value));
    }
    section.appendChild(list);
    return section;
  }

  // Technical checklist of the items reviewed plus the estimated bay time.
  function checklistSection(product) {
    var section = el('section', 'checklist');
    section.appendChild(el('h2', 'checklist-title', 'Ingredientes'));
    if (product.boxTime) {
      section.appendChild(el('p', 'bay-time', 'Tempo de preparo estimado: ' + product.boxTime));
    }
    if (!product.checklist || !product.checklist.length) {
      section.appendChild(el('p', null, 'Ingredientes indispon\u00edveis.'));
      return section;
    }
    var list = el('ul', 'checklist-items');
    for (var i = 0; i < product.checklist.length; i++) {
      list.appendChild(el('li', 'checklist-item', product.checklist[i]));
    }
    section.appendChild(list);
    return section;
  }

  function productView(product) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', product.name));
    container.appendChild(productImage(product));
    container.appendChild(el('p', 'product-price', formatPrice(product.priceCents)));
    container.appendChild(el('p', null, product.description));
    container.appendChild(specsSection(product));
    container.appendChild(checklistSection(product));
    var guideRows = [];
    if (product.sizes && product.sizes.length) {
      container.appendChild(measurementsTable(product, guideRows));
    }

    // Size picker: nothing is preselected, so the shopper must choose.
    var selected = null;
    var sizeButtons = [];
    var picker = el('div', 'size-picker');
    var sizeLegend = el('p', 'size-label', 'Por\u00e7\u00e3o');
    sizeLegend.id = 'size-label';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-labelledby', 'size-label');
    (product.sizes || []).forEach(function (size) {
      var button = el('button', 'size-button', size);
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        selected = size;
        picker.className = 'size-picker';
        picker.removeAttribute('aria-describedby');
        summary.textContent = 'Por\u00e7\u00e3o selecionada: ' + size;
        markGuideRow(size);
        for (var b = 0; b < sizeButtons.length; b++) {
          sizeButtons[b].node.setAttribute('aria-pressed', sizeButtons[b].size === size ? 'true' : 'false');
        }
        status.textContent = '';
        status.className = 'cart-status';
      });
      sizeButtons.push({ size: size, node: button });
      picker.appendChild(button);
    });
    var summary = el('p', 'size-selected', 'Nenhuma por\u00e7\u00e3o selecionada');
    // A single-portion dish needs no choice: it is preselected.
    if (sizeButtons.length === 1) {
      selected = sizeButtons[0].size;
      sizeButtons[0].node.setAttribute('aria-pressed', 'true');
      summary.textContent = 'Por\u00e7\u00e3o selecionada: ' + selected;
    }
    function markGuideRow(size) {
      for (var r = 0; r < guideRows.length; r++) {
        guideRows[r].className = guideRows[r].getAttribute('data-size') === size ? 'is-selected' : '';
      }
    }
    markGuideRow(selected);
    if (sizeButtons.length) {
      container.appendChild(sizeLegend);
      container.appendChild(picker);
      container.appendChild(summary);
    }

    var noteLabel = el('label', 'size-label', 'Observa\u00e7\u00f5es para a cozinha (opcional)');
    noteLabel.setAttribute('for', 'dish-note');
    var noteInput = el('input', 'form-input dish-note');
    noteInput.id = 'dish-note';
    noteInput.type = 'text';
    noteInput.maxLength = 140;
    noteInput.setAttribute('autocomplete', 'off');
    container.appendChild(noteLabel);
    container.appendChild(noteInput);

    var add = el('button', 'action-button add-to-cart', 'Adicionar \u00e0 sacola');
    add.type = 'button';
    var status = el('p', 'cart-status');
    status.id = 'cart-status';
    status.setAttribute('role', 'status');
    add.addEventListener('click', function () {
      if (!window.DanCart) {
        return;
      }
      // Clear first so repeated messages are announced again.
      status.textContent = '';
      status.className = 'cart-status';
      if (!selected) {
        status.textContent = 'Escolha uma por\u00e7\u00e3o primeiro.';
        status.className = 'cart-status is-error';
        picker.className = 'size-picker needs-size';
        picker.setAttribute('aria-describedby', 'cart-status');
        if (sizeButtons.length) {
          sizeButtons[0].node.focus();
        }
      } else if (window.DanCart.add(product.id, 1, selected, noteInput.value)) {
        status.textContent = 'Adicionado: ' + selected + ' na sacola.';
        status.className = 'cart-status is-success';
      } else {
        status.textContent = 'Quantidade m\u00e1xima atingida.';
        status.className = 'cart-status is-error';
      }
    });
    container.appendChild(add);
    container.appendChild(status);
    var back = el('a', 'text-link', 'Voltar ao card\u00e1pio');
    back.href = '#/catalog';
    container.appendChild(back);
    return { title: product.name + ' \u2013 ' + BRAND, description: product.name + ': ' + product.description, node: container };
  }

  // ----- Cart -----

  function qtyButton(label, ariaLabel, onClick) {
    var button = el('button', 'qty-button', label);
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', onClick);
    return button;
  }

  function lineLabel(line) {
    return line.product.name + ' (' + line.size + ')';
  }

  function cartLine(line) {
    var cart = window.DanCart;
    var item = el('li', 'cart-item');
    var name = el('a', 'cart-name', line.product.name);
    name.href = '#/produto/' + encodeURIComponent(line.id);
    item.appendChild(name);
    item.appendChild(el('span', 'cart-size', 'Por\u00e7\u00e3o: ' + line.size));
    item.appendChild(el('span', 'cart-unit', formatPrice(line.product.priceCents)));
    if (line.note) {
      item.appendChild(el('span', 'cart-note', 'Obs.: ' + line.note));
    }

    var qty = el('span', 'cart-qty');
    qty.appendChild(qtyButton('\u2212', 'Diminuir quantidade de ' + lineLabel(line), function () {
      cart.setQty(line.id, line.size, line.qty - 1);
    }));
    var value = el('span', 'cart-qty-value', String(line.qty));
    value.setAttribute('aria-label', 'Quantidade: ' + line.qty);
    qty.appendChild(value);
    var plus = qtyButton('+', 'Aumentar quantidade de ' + lineLabel(line), function () {
      cart.setQty(line.id, line.size, line.qty + 1);
    });
    if (line.qty >= cart.MAX_QTY) {
      plus.setAttribute('disabled', 'disabled');
    }
    qty.appendChild(plus);
    item.appendChild(qty);

    item.appendChild(el('span', 'cart-subtotal', formatPrice(line.subtotalCents)));
    var remove = el('button', 'text-button', 'Remover');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remover ' + lineLabel(line) + ' da sacola');
    remove.addEventListener('click', function () {
      cart.remove(line.id, line.size);
    });
    item.appendChild(remove);
    return item;
  }

  // Subtotal, discount and total lines shared by the cart and the checkout.
  function totalsBlock(cart) {
    var block = el('div', 'cart-totals');
    var discount = cart.discountCents();
    block.appendChild(el('p', 'cart-parts', 'Embalagem t\u00e9rmica: ' + formatPrice(cart.packagingCents())));
    block.appendChild(el('p', 'cart-labor', 'Alimentos: ' + formatPrice(cart.foodCents())));
    if (discount > 0) {
      block.appendChild(el('p', 'cart-subtotal-line', 'Subtotal: ' + formatPrice(cart.subtotalCents())));
      var coupon = cart.coupon();
      block.appendChild(el('p', 'cart-discount', 'Cupom ' + (coupon ? coupon.code : '') + ': \u2212' + formatPrice(discount)));
    }
    block.appendChild(el('p', 'cart-total', 'Total: ' + formatPrice(cart.totalCents())));
    return block;
  }

  function couponBox(cart) {
    var box = el('div', 'coupon-box');
    var applied = cart.coupon();
    var status = el('p', 'coupon-status');
    status.setAttribute('role', 'status');
    if (applied) {
      var text = cart.discountCents() > 0
        ? 'Cupom ' + applied.code + ' aplicado: ' + applied.label + '.'
        : 'Cupom ' + applied.code + ' salvo, mas n\u00e3o se aplica ao subtotal atual (' + applied.label + ').';
      box.appendChild(el('p', 'coupon-applied', text));
      var drop = el('button', 'text-button', 'Remover cupom');
      drop.type = 'button';
      drop.addEventListener('click', function () {
        cart.removeCoupon();
      });
      box.appendChild(drop);
      return box;
    }
    var form = el('form', 'coupon-form');
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('aria-label', 'Cupom');
    var label = el('label', null, 'C\u00f3digo do cupom');
    label.setAttribute('for', 'coupon-code');
    var input = el('input', 'form-input');
    input.id = 'coupon-code';
    input.name = 'coupon';
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    var submit = el('button', 'action-button coupon-apply', 'Aplicar cupom');
    submit.type = 'submit';
    form.addEventListener('submit', function (event) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      var result = cart.applyCoupon(input.value);
      if (!result.ok) {
        // On success the cart re-renders with the applied coupon instead.
        status.textContent = '';
        status.textContent = result.message;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }
    });
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(submit);
    box.appendChild(form);
    box.appendChild(status);
    return box;
  }

  function cartView() {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', 'Sacola'));
    var cart = window.DanCart;
    var lines = cart ? cart.lines() : [];
    if (!lines.length) {
      container.appendChild(el('p', 'cart-empty', 'Sua sacola est\u00e1 vazia.'));
      var shop = el('a', 'text-link', 'Ver o card\u00e1pio');
      shop.href = '#/catalog';
      container.appendChild(shop);
      return { title: 'Sacola \u2013 ' + BRAND, description: DESCRIPTIONS.cart, node: container };
    }
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      list.appendChild(cartLine(lines[i]));
    }
    container.appendChild(list);
    container.appendChild(couponBox(cart));
    container.appendChild(totalsBlock(cart));
    var clear = el('button', 'text-button', 'Esvaziar sacola');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      cart.clear();
    });
    container.appendChild(clear);
    var checkout = el('a', 'action-button checkout-link', 'Fechar pedido');
    checkout.href = '#/checkout';
    container.appendChild(checkout);
    return { title: 'Sacola \u2013 ' + BRAND, description: DESCRIPTIONS.cart, node: container };
  }

  // ----- Fechamento do pedido: Delivery por CEP ou Retirada no Balcao (simulado: nada e enviado) -----

  var MODES = [
    { value: 'delivery', label: 'Delivery por CEP' },
    { value: 'pickup', label: 'Retirada no Balcão' }
  ];

  function modeLabel(value) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].value === value) {
        return MODES[i].label;
      }
    }
    return null;
  }

  // Returns an error message, or '' when the value is valid.
  function validateName(raw) {
    var value = String(raw || '').trim();
    if (!value) {
      return 'Campo obrigatório.';
    }
    if (value.length < 3 || value.indexOf(' ') === -1) {
      return 'Informe nome e sobrenome.';
    }
    return '';
  }

  function validateCep(raw) {
    var value = String(raw || '').trim();
    if (!value) {
      return 'Campo obrigatório.';
    }
    if (!/^\d{5}-?\d{3}$/.test(value)) {
      return 'Informe um CEP com 8 dígitos, como 01310-100.';
    }
    return '';
  }

  function fulfillmentFor(mode, rawCep) {
    return window.DanCheckout ? window.DanCheckout.fulfillment(mode, rawCep) : null;
  }

  function trackingCode() {
    return window.DanCheckout ? window.DanCheckout.trackingCode() : 'DAN-0000';
  }

  function orderSummary(cart, lines) {
    var section = el('section', 'order-summary');
    section.appendChild(el('h2', 'order-summary-title', 'Resumo do pedido'));
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      var item = el('li', 'cart-item');
      item.appendChild(el('span', 'cart-name', lines[i].qty + ' × ' + lineLabel(lines[i])));
      item.appendChild(el('span', 'cart-subtotal', formatPrice(lines[i].subtotalCents)));
      if (lines[i].note) {
        item.appendChild(el('span', 'cart-note', 'Obs.: ' + lines[i].note));
      }
      list.appendChild(item);
    }
    section.appendChild(list);
    section.appendChild(totalsBlock(cart));
    return section;
  }

  // Delivery fee / ETA and grand total lines, refreshed as the mode or CEP changes.
  function shippingBlock() {
    var block = el('div', 'shipping-block');
    var shipping = el('p', 'shipping-line', '');
    var eta = el('p', 'eta-line', '');
    var grand = el('p', 'grand-total', '');
    block.appendChild(shipping);
    block.appendChild(eta);
    block.appendChild(grand);
    block.setAttribute('aria-live', 'polite');
    return { node: block, shipping: shipping, eta: eta, grand: grand };
  }

  function etaText(minutes) {
    return 'Tempo estimado: ' + minutes + ' min';
  }

  function confirmationView(order) {
    var container = el('div', 'container');
    var heading = el('h1', 'page-title', 'Pedido confirmado');
    container.appendChild(heading);
    container.appendChild(el('p', 'order-confirmation', 'Obrigado, ' + order.name + '! Seu pedido ' +
      order.code + ' foi confirmado, no valor de ' + formatPrice(order.total) + '.'));
    container.appendChild(el('p', 'order-protocol', 'Código de acompanhamento: ' + order.code));
    container.appendChild(el('p', 'order-mode', 'Modalidade: ' + order.modeLabel));
    if (order.mode === 'delivery') {
      container.appendChild(el('p', 'order-shipping', 'Delivery (' + order.region + '): ' + formatPrice(order.shippingCents)));
    } else {
      container.appendChild(el('p', 'order-shipping', 'Retirada no Balcão: grátis'));
    }
    container.appendChild(el('p', 'order-eta', etaText(order.minutes)));
    container.appendChild(el('p', null, 'Isto é uma simulação: nenhum prato será preparado e nenhum pagamento foi feito.'));
    var link = el('a', 'text-link', 'Voltar ao cardápio');
    link.href = '#/catalog';
    container.appendChild(link);
    return { title: 'Pedido confirmado – ' + BRAND, description: DESCRIPTIONS.confirmed, node: container, heading: heading };
  }

  function checkoutView(notice) {
    var cart = window.DanCart;
    var lines = cart ? cart.lines() : [];
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', 'Fechar pedido'));
    if (notice) {
      var alert = el('p', 'checkout-notice', notice);
      alert.setAttribute('role', 'status');
      container.appendChild(alert);
    }
    if (!lines.length) {
      container.appendChild(el('p', 'cart-empty', 'Sua sacola está vazia.'));
      var shop = el('a', 'text-link', 'Ver o cardápio');
      shop.href = '#/catalog';
      container.appendChild(shop);
      return { title: 'Fechar pedido – ' + BRAND, description: DESCRIPTIONS.checkout, node: container };
    }
    var total = cart.totalCents();
    var count = cart.count();
    container.appendChild(orderSummary(cart, lines));
    var ship = shippingBlock();
    container.appendChild(ship.node);

    var form = el('form', 'checkout-form');
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('aria-label', 'Dados do pedido');

    // Customer name
    var nameRow = el('div', 'form-field');
    var nameLabel = el('label', null, 'Nome do cliente');
    nameLabel.setAttribute('for', 'checkout-name');
    var nameInput = el('input', 'form-input');
    nameInput.id = 'checkout-name';
    nameInput.name = 'name';
    nameInput.type = 'text';
    nameInput.setAttribute('autocomplete', 'name');
    nameInput.setAttribute('aria-required', 'true');
    nameInput.setAttribute('aria-describedby', 'checkout-name-error');
    var nameError = el('p', 'form-error');
    nameError.id = 'checkout-name-error';
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameInput);
    nameRow.appendChild(nameError);
    form.appendChild(nameRow);

    // Fulfilment mode: delivery (default) or pickup
    var mode = 'delivery';
    var modeBox = el('fieldset', 'form-field mode-field');
    modeBox.appendChild(el('legend', null, 'Como você quer receber?'));
    var radios = {};
    MODES.forEach(function (m) {
      var label = el('label', 'mode-option');
      var radio = el('input', 'mode-radio');
      radio.type = 'radio';
      radio.name = 'mode';
      radio.value = m.value;
      radio.id = 'checkout-mode-' + m.value;
      radio.checked = m.value === mode;
      radio.addEventListener('change', function () {
        mode = m.value;
        refresh();
      });
      label.appendChild(radio);
      label.appendChild(el('span', null, ' ' + m.label));
      modeBox.appendChild(label);
      radios[m.value] = radio;
    });
    form.appendChild(modeBox);

    // CEP (delivery only)
    var cepRow = el('div', 'form-field cep-field');
    var cepLabel = el('label', null, 'CEP para delivery');
    cepLabel.setAttribute('for', 'checkout-cep');
    var cepInput = el('input', 'form-input');
    cepInput.id = 'checkout-cep';
    cepInput.name = 'cep';
    cepInput.type = 'text';
    cepInput.setAttribute('autocomplete', 'postal-code');
    cepInput.setAttribute('aria-required', 'true');
    cepInput.setAttribute('aria-describedby', 'checkout-cep-error');
    var cepError = el('p', 'form-error');
    cepError.id = 'checkout-cep-error';
    cepRow.appendChild(cepLabel);
    cepRow.appendChild(cepInput);
    cepRow.appendChild(cepError);
    form.appendChild(cepRow);

    function refresh() {
      var pickup = mode === 'pickup';
      cepRow.setAttribute('hidden', 'hidden');
      cepRow.hidden = true;
      if (!pickup) {
        cepRow.removeAttribute('hidden');
        cepRow.hidden = false;
      }
      var f = fulfillmentFor(mode, cepInput.value);
      if (pickup && f) {
        ship.shipping.textContent = 'Retirada no Balcão: grátis';
        ship.eta.textContent = etaText(f.minutes);
        ship.grand.textContent = 'Total do pedido: ' + formatPrice(total);
      } else if (f) {
        ship.shipping.textContent = 'Delivery para ' + f.region + ': ' + formatPrice(f.cents);
        ship.eta.textContent = etaText(f.minutes);
        ship.grand.textContent = 'Total com delivery: ' + formatPrice(total + f.cents);
      } else {
        ship.shipping.textContent = 'Delivery: informe o CEP';
        ship.eta.textContent = '';
        ship.grand.textContent = 'Total com delivery: ' + formatPrice(total) + ' + delivery';
      }
    }
    cepInput.addEventListener('input', refresh);
    cepInput.addEventListener('change', refresh);
    refresh();

    var submit = el('button', 'action-button checkout-submit', 'Confirmar pedido');
    submit.type = 'submit';
    form.appendChild(submit);

    form.addEventListener('submit', function (event) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      var firstInvalid = null;
      var nameMessage = validateName(nameInput.value);
      nameError.textContent = nameMessage;
      if (nameMessage) {
        nameInput.setAttribute('aria-invalid', 'true');
        firstInvalid = nameInput;
      } else {
        nameInput.removeAttribute('aria-invalid');
      }
      var cepMessage = mode === 'delivery' ? validateCep(cepInput.value) : '';
      cepError.textContent = cepMessage;
      if (cepMessage) {
        cepInput.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) {
          firstInvalid = cepInput;
        }
      } else {
        cepInput.removeAttribute('aria-invalid');
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      // The bag may have changed (another tab, reload) since this view was
      // rendered: never confirm against a stale snapshot.
      if (cart.totalCents() !== total || cart.count() !== count) {
        var fresh = checkoutView('Sua sacola mudou. Revise o resumo atualizado e confirme novamente.');
        var host = document.getElementById('app');
        host.textContent = '';
        host.appendChild(fresh.node);
        applyMeta(fresh);
        host.focus();
        return;
      }
      var f = fulfillmentFor(mode, cepInput.value);
      if (!f) {
        // Never confirm an order without its fulfilment fee (e.g. checkout.js missing).
        cepError.textContent = 'O cálculo de entrega está indisponível agora. Tente novamente mais tarde.';
        ship.shipping.textContent = cepError.textContent;
        cepInput.setAttribute('aria-invalid', 'true');
        cepInput.focus();
        return;
      }
      var done = confirmationView({
        name: String(nameInput.value).trim(),
        mode: f.mode,
        modeLabel: modeLabel(f.mode),
        region: f.region,
        shippingCents: f.cents,
        minutes: f.minutes,
        total: total + f.cents,
        code: trackingCode()
      });
      cart.clear();
      var app = document.getElementById('app');
      app.textContent = '';
      app.appendChild(done.node);
      applyMeta(done);
      app.focus();
    });
    container.appendChild(form);
    return { title: 'Fechar pedido – ' + BRAND, description: DESCRIPTIONS.checkout, node: container };
  }

  function updateCartCount() {
    var badge = document.getElementById('cart-count');
    if (badge && window.DanCart) {
      badge.textContent = String(window.DanCart.count());
    }
  }

  var ROUTES = {
    '/': homeView,
    '/about': aboutView,
    '/catalog': catalogView,
    '/cart': cartView,
    '/checkout': checkoutView
  };

  var PRODUCT_ROUTE = /^\/produto\/([^/]+)$/;

  // Returns { title, node, navPath }; navPath is the nav link to mark current
  // (null for the 404 view).
  function resolveView(path) {
    var view;
    if (Object.prototype.hasOwnProperty.call(ROUTES, path)) {
      view = ROUTES[path]();
      view.navPath = path;
      return view;
    }
    var match = PRODUCT_ROUTE.exec(path);
    if (match && window.DanProducts) {
      var id;
      try {
        id = decodeURIComponent(match[1]);
      } catch (e) {
        id = null;
      }
      var product = id === null ? null : window.DanProducts.find(id);
      if (product) {
        view = productView(product);
        view.navPath = '/catalog';
        return view;
      }
    }
    view = notFoundView();
    view.navPath = null;
    return view;
  }

  function currentPath() {
    var hash = window.location.hash.replace(/^#/, '');
    var path = hash.split('?')[0];
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    if (path.length > 1) {
      path = path.replace(/\/+$/, '') || '/';
    }
    return path;
  }

  var hasRendered = false;

  // Sets the document title and keeps the description, og:title and
  // og:description tags in sync with the current view. Missing tags are skipped.
  function setMeta(selector, value) {
    var meta = document.querySelector(selector);
    if (meta && value) {
      meta.setAttribute('content', value);
    }
  }

  function applyMeta(view) {
    document.title = view.title;
    setMeta('meta[name="description"]', view.description);
    setMeta('meta[property="og:title"]', view.title);
    setMeta('meta[property="og:description"]', view.description);
  }

  function render() {
    var app = document.getElementById('app');
    if (!app) {
      return;
    }
    var path = currentPath();
    var view = resolveView(path);

    app.textContent = '';
    app.appendChild(view.node);
    applyMeta(view);

    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var linkPath = links[i].getAttribute('href').replace(/^#/, '');
      if (linkPath === view.navPath) {
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }

    // Move focus to the new view on navigation (not on first load).
    if (hasRendered) {
      app.focus();
    }
    hasRendered = true;
    updateCartCount();
  }

  // Cart changes re-render the cart view in place (keeping focus on main) and
  // refresh the header counter everywhere else.
  function onCartChange() {
    updateCartCount();
    if (currentPath() === '/cart') {
      var app = document.getElementById('app');
      var view = cartView();
      app.textContent = '';
      app.appendChild(view.node);
      // The activated control was detached; keep keyboard users in the page.
      app.focus();
    }
  }

  // The skip link must not touch location.hash (that would route to a 404).
  function bindSkipLink() {
    var skip = document.querySelector('.skip-link');
    var app = document.getElementById('app');
    if (!skip || !app) {
      return;
    }
    skip.addEventListener('click', function (event) {
      event.preventDefault();
      app.focus();
    });
  }

  function start() {
    bindSkipLink();
    window.addEventListener('hashchange', render);
    if (window.DanCart) {
      window.DanCart.onChange(onCartChange);
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
