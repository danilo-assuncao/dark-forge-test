/* Shopping cart state persisted in localStorage. Exposed as window.DanCart;
   loaded after products.js and before script.js. Items are { id, size, qty };
   a line is identified by product id plus size. An optional discount coupon is
   persisted next to the items. */
(function () {
  'use strict';

  var STORAGE_KEY = 'dan-cart';
  var COUPON_KEY = 'dan-coupon';
  var MAX_QTY = 99;

  // Simulated coupons. percent: value is a percentage; fixed: valueCents off.
  // minCents is the minimum subtotal required for the discount to apply.
  var COUPONS = {
    DAN10: { type: 'percent', value: 10, minCents: 0, label: '10% off your order' },
    DAN50: { type: 'fixed', valueCents: 5000, minCents: 25000, label: 'R$ 50,00 off orders from R$ 250,00' }
  };

  var items = [];
  var couponCode = null;
  var listeners = [];

  function storage() {
    try {
      return window.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function readKey(key) {
    var store = storage();
    try {
      return store ? store.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function writeKey(key, value) {
    var store = storage();
    if (store) {
      try {
        store.setItem(key, value);
      } catch (e) {
        /* storage full or blocked: keep the in-memory cart */
      }
    }
  }

  function clampQty(qty) {
    qty = Math.floor(Number(qty));
    if (!isFinite(qty) || qty < 1) {
      return 0;
    }
    return Math.min(qty, MAX_QTY);
  }

  function findProduct(id) {
    return window.DanProducts ? window.DanProducts.find(id) : null;
  }

  function validSize(product, size) {
    return !!product && Array.isArray(product.sizes) && typeof size === 'string' && product.sizes.indexOf(size) !== -1;
  }

  function indexOf(id, size) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id && items[i].size === size) {
        return i;
      }
    }
    return -1;
  }

  function load() {
    items = [];
    couponCode = null;
    var rawCoupon = readKey(COUPON_KEY);
    if (typeof rawCoupon === 'string' && Object.prototype.hasOwnProperty.call(COUPONS, rawCoupon)) {
      couponCode = rawCoupon;
    }
    var raw = readKey(STORAGE_KEY);
    if (!raw) {
      return;
    }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!Array.isArray(parsed)) {
      return;
    }
    for (var i = 0; i < parsed.length; i++) {
      var entry = parsed[i];
      if (!entry || typeof entry.id !== 'string') {
        continue;
      }
      var product = findProduct(entry.id);
      if (!validSize(product, entry.size)) {
        continue;
      }
      var qty = clampQty(entry.qty);
      if (qty > 0 && indexOf(entry.id, entry.size) === -1) {
        items.push({ id: entry.id, size: entry.size, qty: qty });
      }
    }
  }

  function save() {
    writeKey(STORAGE_KEY, JSON.stringify(items));
    writeKey(COUPON_KEY, couponCode || '');
  }

  function changed() {
    save();
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  }

  // add(id, qty, size): the size must be one the product offers.
  function add(id, qty, size) {
    var amount = clampQty(qty === undefined ? 1 : qty);
    var product = findProduct(id);
    if (!amount || !validSize(product, size)) {
      return false;
    }
    var idx = indexOf(id, size);
    if (idx === -1) {
      items.push({ id: id, size: size, qty: amount });
    } else if (items[idx].qty >= MAX_QTY) {
      return false; // already at the cap: nothing changed
    } else {
      items[idx].qty = Math.min(items[idx].qty + amount, MAX_QTY);
    }
    changed();
    return true;
  }

  // Setting a quantity below 1 removes the line.
  function setQty(id, size, qty) {
    var idx = indexOf(id, size);
    if (idx === -1) {
      return false;
    }
    var amount = clampQty(qty);
    if (amount === 0) {
      items.splice(idx, 1);
    } else {
      items[idx].qty = amount;
    }
    changed();
    return true;
  }

  function remove(id, size) {
    var idx = indexOf(id, size);
    if (idx === -1) {
      return false;
    }
    items.splice(idx, 1);
    changed();
    return true;
  }

  function clear() {
    items = [];
    couponCode = null;
    changed();
  }

  // Lines with the product resolved: [{ id, size, qty, product, subtotalCents }].
  function lines() {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var product = findProduct(items[i].id);
      out.push({
        id: items[i].id,
        size: items[i].size,
        qty: items[i].qty,
        product: product,
        subtotalCents: product.priceCents * items[i].qty
      });
    }
    return out;
  }

  function subtotalCents() {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += findProduct(items[i].id).priceCents * items[i].qty;
    }
    return total;
  }

  function discountCents() {
    var coupon = couponCode ? COUPONS[couponCode] : null;
    var subtotal = subtotalCents();
    if (!coupon || subtotal === 0 || subtotal < coupon.minCents) {
      return 0;
    }
    var discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.valueCents;
    return Math.min(discount, subtotal);
  }

  // Total payable: subtotal minus the coupon discount.
  function totalCents() {
    return subtotalCents() - discountCents();
  }

  // Returns { ok, message }. Codes are case-insensitive; surrounding spaces are ignored.
  function applyCoupon(code) {
    var normalized = String(code || '').trim().toUpperCase();
    if (!normalized) {
      return { ok: false, message: 'Enter a coupon code.' };
    }
    if (!Object.prototype.hasOwnProperty.call(COUPONS, normalized)) {
      return { ok: false, message: 'This coupon is not valid.' };
    }
    var coupon = COUPONS[normalized];
    if (subtotalCents() < coupon.minCents) {
      return { ok: false, message: 'This coupon requires a subtotal of at least R$ ' +
        (coupon.minCents / 100).toFixed(2).replace('.', ',') + '.' };
    }
    couponCode = normalized;
    changed();
    return { ok: true, message: 'Coupon ' + normalized + ' applied.' };
  }

  function removeCoupon() {
    if (!couponCode) {
      return false;
    }
    couponCode = null;
    changed();
    return true;
  }

  // The applied coupon as { code, label }, or null.
  function coupon() {
    return couponCode ? { code: couponCode, label: COUPONS[couponCode].label } : null;
  }

  function count() {
    var n = 0;
    for (var i = 0; i < items.length; i++) {
      n += items[i].qty;
    }
    return n;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function reload() {
    load();
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  }

  load();

  window.DanCart = {
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    lines: lines,
    subtotalCents: subtotalCents,
    discountCents: discountCents,
    totalCents: totalCents,
    applyCoupon: applyCoupon,
    removeCoupon: removeCoupon,
    coupon: coupon,
    count: count,
    onChange: onChange,
    reload: reload,
    MAX_QTY: MAX_QTY
  };
})();
