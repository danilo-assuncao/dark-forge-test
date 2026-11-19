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
    var grid = el('ul', 'product-grid');
    var products = window.DanProducts ? window.DanProducts.all() : [];
    for (var i = 0; i < products.length; i++) {
      grid.appendChild(productCard(products[i]));
    }
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
    container.appendChild(nutritionTable(product));
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
    return { title: 'Cart \u2013 Dan', node: container };
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
    '/cart': cartView
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
