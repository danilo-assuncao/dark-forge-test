/* Shopping cart state persisted in localStorage. Exposed as window.DanCart;
   loaded after products.js and before script.js. Items are { id, qty }. */
(function () {
  'use strict';

  var STORAGE_KEY = 'dan-cart';
  var MAX_QTY = 99;
  var items = [];
  var listeners = [];

  function storage() {
    try {
      return window.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function clampQty(qty) {
    qty = Math.floor(Number(qty));
    if (!isFinite(qty) || qty < 1) {
      return 0;
    }
    return Math.min(qty, MAX_QTY);
  }

  function load() {
    items = [];
    var store = storage();
    var raw = null;
    try {
      raw = store ? store.getItem(STORAGE_KEY) : null;
    } catch (e) {
      raw = null;
    }
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
      if (!entry || typeof entry.id !== 'string' || !findProduct(entry.id)) {
        continue;
      }
      var qty = clampQty(entry.qty);
      if (qty > 0 && indexOf(entry.id) === -1) {
        items.push({ id: entry.id, qty: qty });
      }
    }
  }

  function save() {
    var store = storage();
    if (store) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        /* storage full or blocked: keep the in-memory cart */
      }
    }
  }

  function findProduct(id) {
    return window.DanProducts ? window.DanProducts.find(id) : null;
  }

  function indexOf(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        return i;
      }
    }
    return -1;
  }

  function changed() {
    save();
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  }

  function add(id, qty) {
    var amount = clampQty(qty === undefined ? 1 : qty);
    if (!amount || !findProduct(id)) {
      return false;
    }
    var idx = indexOf(id);
    if (idx === -1) {
      items.push({ id: id, qty: amount });
    } else if (items[idx].qty >= MAX_QTY) {
      return false; // already at the cap: nothing changed
    } else {
      items[idx].qty = Math.min(items[idx].qty + amount, MAX_QTY);
    }
    changed();
    return true;
  }

  // Setting a quantity below 1 removes the item.
  function setQty(id, qty) {
    var idx = indexOf(id);
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

  function remove(id) {
    var idx = indexOf(id);
    if (idx === -1) {
      return false;
    }
    items.splice(idx, 1);
    changed();
    return true;
  }

  function clear() {
    items = [];
    changed();
  }

  // Lines with the product resolved: [{ id, qty, product, subtotalCents }].
  function lines() {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var product = findProduct(items[i].id);
      out.push({
        id: items[i].id,
        qty: items[i].qty,
        product: product,
        subtotalCents: product.priceCents * items[i].qty
      });
    }
    return out;
  }

  function totalCents() {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += findProduct(items[i].id).priceCents * items[i].qty;
    }
    return total;
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
    totalCents: totalCents,
    count: count,
    onChange: onChange,
    reload: reload,
    MAX_QTY: MAX_QTY
  };
})();
