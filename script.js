(function () {
  'use strict';

  var ROW_COUNT = 6;
  var WORDS_PER_HALF = 12;
  var WORD_TEXT = 'Dan';

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

  // ----- Views: each returns { title, node } -----

  function homeView() {
    var home = el('div', 'home');
    home.appendChild(el('h1', 'visually-hidden', 'Dan'));
    home.appendChild(buildMarquee());
    home.appendChild(el('button', 'action-button', 'Dan')).type = 'button';
    return { title: 'Dan', node: home };
  }

  function contentView(title, paragraph) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', title));
    container.appendChild(el('p', null, paragraph));
    return container;
  }

  function aboutView() {
    return {
      title: 'About \u2013 Dan',
      node: contentView('About', 'Dan is a small single-page app with client-side routing.')
    };
  }

  function notFoundView() {
    var container = contentView('Page not found (404)', 'The page you are looking for does not exist.');
    var link = el('a', 'text-link', 'Back to home');
    link.href = '#/';
    container.appendChild(link);
    return { title: '404 \u2013 Dan', node: container };
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
    link.appendChild(el('span', 'product-price', formatPrice(product.priceCents)));
    item.appendChild(link);
    return item;
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
        var button = el('button', 'filter-button', category === null ? 'All' : category);
        button.type = 'button';
        button.addEventListener('click', function () {
          show(category);
        });
        buttons.push({ category: category, node: button });
        filter.appendChild(button);
      });
      container.appendChild(filter);
    }
    show(null);
    container.appendChild(grid);
    return { title: 'Catalog \u2013 Dan', node: container };
  }

  function nutritionTable(product) {
    var section = el('section', 'nutrition');
    section.appendChild(el('h2', 'nutrition-title', 'Nutrition facts'));
    var nutrition = product.nutrition;
    if (!nutrition || !nutrition.rows || !nutrition.rows.length) {
      section.appendChild(el('p', null, 'Nutrition information not available.'));
      return section;
    }
    var table = el('table', 'nutrition-table');
    table.appendChild(el('caption', null, 'Per serving: ' + nutrition.serving));
    var head = el('thead');
    var headRow = el('tr');
    var th1 = el('th', null, 'Nutrient');
    th1.setAttribute('scope', 'col');
    var th2 = el('th', null, 'Amount');
    th2.setAttribute('scope', 'col');
    headRow.appendChild(th1);
    headRow.appendChild(th2);
    head.appendChild(headRow);
    table.appendChild(head);
    var body = el('tbody');
    for (var i = 0; i < nutrition.rows.length; i++) {
      var row = el('tr');
      var label = el('th', null, nutrition.rows[i].label);
      label.setAttribute('scope', 'row');
      row.appendChild(label);
      row.appendChild(el('td', null, nutrition.rows[i].amount));
      body.appendChild(row);
    }
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function productView(product) {
    var container = el('div', 'container');
    container.appendChild(el('h1', 'page-title', product.name));
    container.appendChild(productImage(product));
    container.appendChild(el('p', 'product-price', formatPrice(product.priceCents)));
    container.appendChild(el('p', null, product.description));
    // Nutrition facts only apply to supplements.
    if (!product.category || product.category === 'Supplements') {
      container.appendChild(nutritionTable(product));
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
      if (window.DanCart.add(product.id, 1)) {
        status.textContent = 'Added to cart.';
      } else {
        status.textContent = 'Maximum quantity reached.';
      }
    });
    container.appendChild(add);
    container.appendChild(status);
    var back = el('a', 'text-link', 'Back to catalog');
    back.href = '#/catalog';
    container.appendChild(back);
    return { title: product.name + ' \u2013 Dan', node: container };
  }

  // ----- Cart -----

  function qtyButton(label, ariaLabel, onClick) {
    var button = el('button', 'qty-button', label);
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', onClick);
    return button;
  }

  function cartLine(line) {
    var cart = window.DanCart;
    var item = el('li', 'cart-item');
    var name = el('a', 'cart-name', line.product.name);
    name.href = '#/produto/' + encodeURIComponent(line.id);
    item.appendChild(name);
    item.appendChild(el('span', 'cart-unit', formatPrice(line.product.priceCents)));

    var qty = el('span', 'cart-qty');
    qty.appendChild(qtyButton('\u2212', 'Decrease quantity of ' + line.product.name, function () {
      cart.setQty(line.id, line.qty - 1);
    }));
    var value = el('span', 'cart-qty-value', String(line.qty));
    value.setAttribute('aria-label', 'Quantity: ' + line.qty);
    qty.appendChild(value);
    var plus = qtyButton('+', 'Increase quantity of ' + line.product.name, function () {
      cart.setQty(line.id, line.qty + 1);
    });
    if (line.qty >= cart.MAX_QTY) {
      plus.setAttribute('disabled', 'disabled');
    }
    qty.appendChild(plus);
    item.appendChild(qty);

    item.appendChild(el('span', 'cart-subtotal', formatPrice(line.subtotalCents)));
    var remove = el('button', 'text-button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + line.product.name + ' from cart');
    remove.addEventListener('click', function () {
      cart.remove(line.id);
    });
    item.appendChild(remove);
    return item;
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
      return { title: 'Cart \u2013 Dan', node: container };
    }
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      list.appendChild(cartLine(lines[i]));
    }
    container.appendChild(list);
    container.appendChild(el('p', 'cart-total', 'Total: ' + formatPrice(cart.totalCents())));
    var clear = el('button', 'text-button', 'Clear cart');
    clear.type = 'button';
    clear.addEventListener('click', function () {
      cart.clear();
    });
    container.appendChild(clear);
    var checkout = el('a', 'action-button checkout-link', 'Checkout');
    checkout.href = '#/checkout';
    container.appendChild(checkout);
    return { title: 'Cart \u2013 Dan', node: container };
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

  function orderSummary(lines, total) {
    var section = el('section', 'order-summary');
    section.appendChild(el('h2', 'order-summary-title', 'Order summary'));
    var list = el('ul', 'cart-list');
    for (var i = 0; i < lines.length; i++) {
      var item = el('li', 'cart-item');
      item.appendChild(el('span', 'cart-name', lines[i].qty + ' \u00d7 ' + lines[i].product.name));
      item.appendChild(el('span', 'cart-subtotal', formatPrice(lines[i].subtotalCents)));
      list.appendChild(item);
    }
    section.appendChild(list);
    section.appendChild(el('p', 'cart-total', 'Total: ' + formatPrice(total)));
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
    return { title: 'Order confirmed \u2013 Dan', node: container, heading: heading };
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
      return { title: 'Checkout \u2013 Dan', node: container };
    }
    var total = cart.totalCents();
    var count = cart.count();
    container.appendChild(orderSummary(lines, total));

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
        document.title = fresh.title;
        host.focus();
        return;
      }
      var orderId = '#' + Date.now().toString(36).toUpperCase();
      var done = confirmationView(String(inputs.name.value).trim(), orderId, total);
      cart.clear();
      var app = document.getElementById('app');
      app.textContent = '';
      app.appendChild(done.node);
      document.title = done.title;
      app.focus();
    });
    container.appendChild(form);
    return { title: 'Checkout \u2013 Dan', node: container };
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

  function render() {
    var app = document.getElementById('app');
    if (!app) {
      return;
    }
    var path = currentPath();
    var view = resolveView(path);

    app.textContent = '';
    app.appendChild(view.node);
    document.title = view.title;

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
