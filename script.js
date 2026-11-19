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

  var BRAND = 'Dan Wear';

  // Meta description per route (SEO); the views below attach theirs.
  var DESCRIPTIONS = {
    home: 'Dan Wear is a simulated clothing store: tees, pants and jackets in sizes PP to GG.',
    about: 'About Dan Wear, a simulated online clothing store built as a small single-page app.',
    catalog: 'Browse every Dan Wear piece, filter by category and pick your size.',
    cart: 'Review the pieces in your Dan Wear cart, adjust quantities and apply a coupon.',
    checkout: 'Enter your details to place a simulated Dan Wear order.',
    confirmed: 'Your simulated Dan Wear order was received.',
    product: 'Details, sizes, measurements and price for this Dan Wear piece.',
    notFound: 'The page you are looking for does not exist.'
  };

  // ----- Views: each returns { title, description, node } -----

  function featuredProducts() {
    var all = window.DanProducts ? window.DanProducts.all() : [];
    return all.slice(0, 4);
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
    hero.appendChild(el('p', 'hero-tagline', 'Everyday clothing, cut for comfort. Sizes PP to GG.'));
    var cta = el('a', 'action-button hero-cta', 'Shop the collection');
    cta.href = '#/catalog';
    hero.appendChild(cta);
    stage.appendChild(hero);
    home.appendChild(stage);

    var categories = window.DanProducts && window.DanProducts.categories ? window.DanProducts.categories() : [];
    if (categories.length) {
      var nav = el('nav', 'home-categories container');
      nav.setAttribute('aria-label', 'Shop by category');
      categories.forEach(function (category) {
        var link = el('a', 'category-link', category);
        link.href = '#/catalog?category=' + encodeURIComponent(category);
        nav.appendChild(link);
      });
      home.appendChild(nav);
    }

    var featured = featuredProducts();
    if (featured.length) {
      var showcase = el('section', 'showcase container');
      showcase.setAttribute('aria-labelledby', 'showcase-title');
      var showcaseTitle = el('h2', 'showcase-title', 'New in');
      showcaseTitle.id = 'showcase-title';
      showcase.appendChild(showcaseTitle);
      var grid = el('ul', 'product-grid');
      featured.forEach(function (product) {
        grid.appendChild(productCard(product));
      });
      showcase.appendChild(grid);
      home.appendChild(showcase);
    }
    return { title: BRAND + ' \u2013 Clothing store', description: DESCRIPTIONS.home, node: home };
  }

  function contentView(title, paragraph) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', title));
    container.appendChild(el('p', null, paragraph));
    return container;
  }

  function aboutView() {
    return {
      title: 'About \u2013 ' + BRAND,
      description: DESCRIPTIONS.about,
      node: contentView('About', 'Dan Wear is a simulated online clothing store: nothing is sold and no payment is taken.')
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
    if (product.sizes && product.sizes.length) {
      link.appendChild(el('span', 'product-sizes', 'Tamanhos: ' + product.sizes.join(', ')));
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
    container.appendChild(el('h1', 'page-title', 'Catalog'));
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
      filter.setAttribute('aria-label', 'Filter by category');
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
    return { title: 'Catalog \u2013 ' + BRAND, description: DESCRIPTIONS.catalog, node: container };
  }

  function measurementsTable(product) {
    var section = el('section', 'measurements');
    section.appendChild(el('h2', 'measurements-title', 'Size guide'));
    var data = product.measurements;
    if (!data || !data.rows || !data.rows.length || !data.columns) {
      section.appendChild(el('p', null, 'This piece has no size chart: one size fits all.'));
      return section;
    }
    var table = el('table', 'measurements-table');
    table.appendChild(el('caption', null, 'Body measurements in ' + data.unit));
    var head = el('thead');
    var headRow = el('tr');
    var corner = el('th', null, 'Size');
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
    section.appendChild(el('h2', 'specs-title', 'Specifications'));
    if (!product.specs || !product.specs.length) {
      section.appendChild(el('p', null, 'Specifications not available.'));
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

  function productView(product) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', product.name));
    container.appendChild(productImage(product));
    container.appendChild(el('p', 'product-price', formatPrice(product.priceCents)));
    container.appendChild(el('p', null, product.description));
    container.appendChild(specsSection(product));
    var guide = null;
    if (product.sizes && product.sizes.length) {
      guide = measurementsTable(product);
      container.appendChild(guide);
    }

    // Size picker: nothing is preselected, so the shopper must choose.
    var selected = null;
    var sizeButtons = [];
    var picker = el('div', 'size-picker');
    var sizeLegend = el('p', 'size-label', 'Size');
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
        summary.textContent = 'Selected size: ' + size;
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
    var summary = el('p', 'size-selected', 'No size selected');
    function markGuideRow(size) {
      var rows = guide && guide.children[1] && guide.children[1].children ? guide.children[1].children : [];
      for (var r = 0; r < rows.length; r++) {
        rows[r].className = rows[r].getAttribute('data-size') === size ? 'is-selected' : '';
      }
    }
    if (sizeButtons.length) {
      container.appendChild(sizeLegend);
      container.appendChild(picker);
      container.appendChild(summary);
    }

    var add = el('button', 'action-button add-to-cart', 'Add to cart');
    add.type = 'button';
    var status = el('p', 'cart-status');
    status.setAttribute('role', 'status');
    add.addEventListener('click', function () {
      if (!window.DanCart) {
        return;
      }
      // Clear first so repeated messages are announced again.
      status.textContent = '';
      status.className = 'cart-status';
      if (!selected) {
        status.textContent = 'Select a size first.';
        status.className = 'cart-status is-error';
        picker.className = 'size-picker needs-size';
        if (sizeButtons.length) {
          sizeButtons[0].node.focus();
        }
      } else if (window.DanCart.add(product.id, 1, selected)) {
        status.textContent = 'Added size ' + selected + ' to cart.';
        status.className = 'cart-status is-success';
      } else {
        status.textContent = 'Maximum quantity reached.';
        status.className = 'cart-status is-error';
      }
    });
    container.appendChild(add);
    container.appendChild(status);
    var back = el('a', 'text-link', 'Back to catalog');
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
    return line.product.name + ' (size ' + line.size + ')';
  }

  function cartLine(line) {
    var cart = window.DanCart;
    var item = el('li', 'cart-item');
    var name = el('a', 'cart-name', line.product.name);
    name.href = '#/produto/' + encodeURIComponent(line.id);
    item.appendChild(name);
    item.appendChild(el('span', 'cart-size', 'Size: ' + line.size));
    item.appendChild(el('span', 'cart-unit', formatPrice(line.product.priceCents)));

    var qty = el('span', 'cart-qty');
    qty.appendChild(qtyButton('\u2212', 'Decrease quantity of ' + lineLabel(line), function () {
      cart.setQty(line.id, line.size, line.qty - 1);
    }));
    var value = el('span', 'cart-qty-value', String(line.qty));
    value.setAttribute('aria-label', 'Quantity: ' + line.qty);
    qty.appendChild(value);
    var plus = qtyButton('+', 'Increase quantity of ' + lineLabel(line), function () {
      cart.setQty(line.id, line.size, line.qty + 1);
    });
    if (line.qty >= cart.MAX_QTY) {
      plus.setAttribute('disabled', 'disabled');
    }
    qty.appendChild(plus);
    item.appendChild(qty);

    item.appendChild(el('span', 'cart-subtotal', formatPrice(line.subtotalCents)));
    var remove = el('button', 'text-button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + lineLabel(line) + ' from cart');
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
    if (discount > 0) {
      block.appendChild(el('p', 'cart-subtotal-line', 'Subtotal: ' + formatPrice(cart.subtotalCents())));
      var coupon = cart.coupon();
      block.appendChild(el('p', 'cart-discount', 'Coupon ' + (coupon ? coupon.code : '') + ': \u2212' + formatPrice(discount)));
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
        ? 'Coupon ' + applied.code + ' applied: ' + applied.label + '.'
        : 'Coupon ' + applied.code + ' is saved but does not apply to the current subtotal (' + applied.label + ').';
      box.appendChild(el('p', 'coupon-applied', text));
      var drop = el('button', 'text-button', 'Remove coupon');
      drop.type = 'button';
      drop.addEventListener('click', function () {
        cart.removeCoupon();
      });
      box.appendChild(drop);
      return box;
    }
    var form = el('form', 'coupon-form');
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('aria-label', 'Coupon');
    var label = el('label', null, 'Coupon code');
    label.setAttribute('for', 'coupon-code');
    var input = el('input', 'form-input');
    input.id = 'coupon-code';
    input.name = 'coupon';
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    var submit = el('button', 'action-button coupon-apply', 'Apply coupon');
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
    container.appendChild(el('h1', 'page-title', 'Cart'));
    var cart = window.DanCart;
    var lines = cart ? cart.lines() : [];
    if (!lines.length) {
      container.appendChild(el('p', 'cart-empty', 'Your cart is empty.'));
      var shop = el('a', 'text-link', 'Browse the catalog');
      shop.href = '#/catalog';
      container.appendChild(shop);
      return { title: 'Cart \u2013 ' + BRAND, description: DESCRIPTIONS.cart, node: container };
    }
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      list.appendChild(cartLine(lines[i]));
    }
    container.appendChild(list);
    container.appendChild(couponBox(cart));
    container.appendChild(totalsBlock(cart));
    var clear = el('button', 'text-button', 'Clear cart');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      cart.clear();
    });
    container.appendChild(clear);
    var checkout = el('a', 'action-button checkout-link', 'Checkout');
    checkout.href = '#/checkout';
    container.appendChild(checkout);
    return { title: 'Cart \u2013 ' + BRAND, description: DESCRIPTIONS.cart, node: container };
  }

  // ----- Checkout (simulated: no payment, nothing is sent anywhere) -----

  var CHECKOUT_FIELDS = [
    { name: 'name', label: 'Full name', type: 'text', autocomplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
    { name: 'phone', label: 'Phone (with area code)', type: 'tel', autocomplete: 'tel' },
    { name: 'cep', label: 'Postal code (CEP)', type: 'text', autocomplete: 'postal-code' },
    { name: 'address', label: 'Street address and number', type: 'text', autocomplete: 'street-address' },
    { name: 'city', label: 'City', type: 'text', autocomplete: 'address-level2' }
  ];

  // Returns an error message, or '' when the value is valid.
  function validateField(name, raw) {
    var value = String(raw || '').trim();
    if (!value) {
      return 'This field is required.';
    }
    var digits = value.replace(/\D/g, '');
    if (name === 'name' && (value.length < 3 || value.indexOf(' ') === -1)) {
      return 'Enter your first and last name.';
    }
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'Enter a valid email, like name@example.com.';
    }
    if (name === 'phone' && (!/^[\d\s()+-]+$/.test(value) || digits.length < 10 || digits.length > 11)) {
      return 'Enter a phone with area code, 10 or 11 digits.';
    }
    if (name === 'cep' && (!/^\d{5}-?\d{3}$/.test(value))) {
      return 'Enter a CEP with 8 digits, like 01310-100.';
    }
    if (name === 'address' && value.length < 5) {
      return 'Enter your street address.';
    }
    if (name === 'city' && value.length < 2) {
      return 'Enter your city.';
    }
    return '';
  }

  function orderSummary(cart, lines) {
    var section = el('section', 'order-summary');
    section.appendChild(el('h2', 'order-summary-title', 'Order summary'));
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      var item = el('li', 'cart-item');
      item.appendChild(el('span', 'cart-name', lines[i].qty + ' \u00d7 ' + lineLabel(lines[i])));
      item.appendChild(el('span', 'cart-subtotal', formatPrice(lines[i].subtotalCents)));
      list.appendChild(item);
    }
    section.appendChild(list);
    section.appendChild(totalsBlock(cart));
    return section;
  }

  function confirmationView(customerName, orderId, total) {
    var container = el('div', 'container');
    var heading = el('h1', 'page-title', 'Order confirmed');
    container.appendChild(heading);
    container.appendChild(el('p', 'order-confirmation', 'Thank you, ' + customerName + '! Your order ' +
      orderId + ' totaling ' + formatPrice(total) + ' was received.'));
    container.appendChild(el('p', null, 'This is a simulation: no payment was made.'));
    var link = el('a', 'text-link', 'Back to catalog');
    link.href = '#/catalog';
    container.appendChild(link);
    return { title: 'Order confirmed \u2013 ' + BRAND, description: DESCRIPTIONS.confirmed, node: container, heading: heading };
  }

  function checkoutView(notice) {
    var cart = window.DanCart;
    var lines = cart ? cart.lines() : [];
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', 'Checkout'));
    if (notice) {
      var alert = el('p', 'checkout-notice', notice);
      alert.setAttribute('role', 'status');
      container.appendChild(alert);
    }
    if (!lines.length) {
      container.appendChild(el('p', 'cart-empty', 'Your cart is empty.'));
      var shop = el('a', 'text-link', 'Browse the catalog');
      shop.href = '#/catalog';
      container.appendChild(shop);
      return { title: 'Checkout \u2013 ' + BRAND, description: DESCRIPTIONS.checkout, node: container };
    }
    var total = cart.totalCents();
    var count = cart.count();
    container.appendChild(orderSummary(cart, lines));

    var form = el('form', 'checkout-form');
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('aria-label', 'Customer details');
    var inputs = {};
    var errors = {};
    for (var i = 0; i < CHECKOUT_FIELDS.length; i++) {
      var field = CHECKOUT_FIELDS[i];
      var row = el('div', 'form-field');
      var label = el('label', null, field.label);
      label.setAttribute('for', 'checkout-' + field.name);
      var input = el('input', 'form-input');
      input.id = 'checkout-' + field.name;
      input.name = field.name;
      input.type = field.type;
      input.setAttribute('autocomplete', field.autocomplete);
      input.setAttribute('aria-required', 'true');
      input.setAttribute('aria-describedby', 'checkout-' + field.name + '-error');
      var error = el('p', 'form-error');
      error.id = 'checkout-' + field.name + '-error';
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(error);
      form.appendChild(row);
      inputs[field.name] = input;
      errors[field.name] = error;
    }
    var submit = el('button', 'action-button checkout-submit', 'Place order');
    submit.type = 'submit';
    form.appendChild(submit);

    form.addEventListener('submit', function (event) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      var firstInvalid = null;
      for (var j = 0; j < CHECKOUT_FIELDS.length; j++) {
        var name = CHECKOUT_FIELDS[j].name;
        var message = validateField(name, inputs[name].value);
        errors[name].textContent = message;
        if (message) {
          inputs[name].setAttribute('aria-invalid', 'true');
          if (!firstInvalid) {
            firstInvalid = inputs[name];
          }
        } else {
          inputs[name].removeAttribute('aria-invalid');
        }
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      // The cart may have changed (another tab, reload) since this view was
      // rendered: never confirm against a stale snapshot.
      if (cart.totalCents() !== total || cart.count() !== count) {
        var fresh = checkoutView('Your cart changed. Review the updated summary and place the order again.');
        var host = document.getElementById('app');
        host.textContent = '';
        host.appendChild(fresh.node);
        applyMeta(fresh);
        host.focus();
        return;
      }
      var orderId = '#' + Date.now().toString(36).toUpperCase();
      var done = confirmationView(String(inputs.name.value).trim(), orderId, total);
      cart.clear();
      var app = document.getElementById('app');
      app.textContent = '';
      app.appendChild(done.node);
      applyMeta(done);
      app.focus();
    });
    container.appendChild(form);
    return { title: 'Checkout \u2013 ' + BRAND, description: DESCRIPTIONS.checkout, node: container };
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
