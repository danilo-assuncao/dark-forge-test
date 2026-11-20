/* Dan Books SPA: wires catalog display, recommender and shopping bag. */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var C = isNode ? require('./books.js') : root.DanBooksCatalog;
  var R = isNode ? require('./recommender.js') : root.DanBooksRecommender;
  var S = isNode ? require('./shelf.js') : root.DanBooksShelf;

  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function initDom(doc) {
    var $ = function (id) { return doc.getElementById(id); };
    
    // Wire genres filter
    C.GENRES.forEach(function (g) {
      var o1 = doc.createElement('option'); o1.value = g.id; o1.textContent = g.name;
      $('f-genre').appendChild(o1);
      var o2 = doc.createElement('option'); o2.value = g.id; o2.textContent = g.name;
      $('r-genre').appendChild(o2);
    });

    function renderCatalog() {
      var genre = $('f-genre').value;
      var books = C.booksByGenre(genre);
      var ul = $('catalog-list');
      clear(ul);
      books.forEach(function (b) {
        var li = el('li', null, 'card');
        li.appendChild(el('h3', b.title));
        li.appendChild(el('p', b.author, 'muted'));
        var meta = C.metaFor(b.id);
        li.appendChild(el('p', meta.pages + ' págs · ' + meta.readingTime, 'muted'));
        
        var form = el('form', null, 'add-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var format = sel.value;
          if (format) {
            S.add(b.id, format, 1);
            openCart();
          }
        });
        
        var sel = el('select');
        b.formats.forEach(function (fid) {
          var f = C.findFormat(fid);
          var price = C.priceFor(b.id, fid);
          if (f && price !== null) {
            var opt = el('option', f.name + ' - ' + C.formatBRL(price));
            opt.value = fid;
            sel.appendChild(opt);
          }
        });
        
        var btn = el('button', 'Adicionar');
        btn.type = 'submit';
        
        form.appendChild(sel);
        form.appendChild(btn);
        
        var actions = el('div', null, 'card-actions');
        actions.appendChild(form);
        li.appendChild(actions);
        ul.appendChild(li);
      });
    }

    $('filters').addEventListener('change', renderCatalog);

    $('recommender-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var genre = $('r-genre').value || undefined;
      var mins = Number($('r-minutes').value);
      var err = $('recommender-error');
      var box = $('recommender-result');
      
      if (!mins || isNaN(mins) || mins <= 0) {
        err.textContent = 'Informe os minutos diários de leitura válidos.';
        box.hidden = true;
        return;
      }
      err.textContent = '';
      
      var rec = R.recommendBox({ genre: genre, minutesPerDay: mins });
      if (!rec) {
        err.textContent = 'Não foi possível gerar recomendação para este perfil.';
        box.hidden = true;
        return;
      }
      
      $('plan-name').textContent = rec.plan.name;
      $('plan-price').textContent = C.formatBRL(rec.plan.price) + ' / mês';
      $('plan-capacity').textContent = rec.booksPerMonthCapacity;
      
      var ul = $('plan-titles');
      clear(ul);
      rec.titles.forEach(function (t) {
        ul.appendChild(el('li', t.book.title + ' (' + t.days + ' dias)'));
      });
      box.hidden = false;
    });

    function openCart() {
      $('cart-drawer').hidden = false;
      $('cart-toggle').setAttribute('aria-expanded', 'true');
    }

    function closeCart() {
      $('cart-drawer').hidden = true;
      $('cart-toggle').setAttribute('aria-expanded', 'false');
    }

    $('cart-toggle').addEventListener('click', function() {
      if ($('cart-drawer').hidden) openCart();
      else closeCart();
    });
    $('cart-close').addEventListener('click', closeCart);

    function renderCart() {
      var totals = S.totals();
      $('cart-count').textContent = totals.count;
      var empty = totals.count === 0;
      $('cart-empty').hidden = !empty;
      $('cart-summary').hidden = empty;
      var ul = $('cart-items');
      clear(ul);
      
      if (empty) {
        return;
      }
      $('checkout-msg').hidden = true;
      $('coupon-error').hidden = true;

      var items = S.items();
      items.forEach(function (it) {
        var b = C.findBook(it.id);
        var f = C.findFormat(it.format);
        if (!b || !f) return;
        
        var li = el('li', null, 'cart-item');
        var head = el('div', null, 'cart-item-head');
        head.appendChild(el('span', b.title));
        var price = C.priceFor(it.id, it.format);
        head.appendChild(el('span', C.formatBRL(price * it.qty)));
        li.appendChild(head);
        
        li.appendChild(el('div', f.name, 'cart-item-meta'));
        
        var actions = el('div', null, 'cart-item-actions');
        
        var form = el('form', null, 'qty-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          S.setQty(it.id, it.format, inp.value);
        });
        var inp = el('input');
        inp.type = 'number';
        inp.min = 1;
        inp.max = 99;
        inp.value = it.qty;
        var btn = el('button', 'Atualizar');
        btn.type = 'submit';
        btn.className = 'secondary';
        form.appendChild(inp);
        form.appendChild(btn);
        
        var rem = el('button', 'Remover', 'secondary');
        rem.type = 'button';
        rem.addEventListener('click', function () { S.remove(it.id, it.format); });
        
        actions.appendChild(form);
        actions.appendChild(rem);
        li.appendChild(actions);
        ul.appendChild(li);
      });

      $('t-subtotal').textContent = C.formatBRL(totals.subtotalCents);
      
      if (totals.coupon) {
        var cinfo = S.coupons[totals.coupon];
        $('t-discount').textContent = '-' + C.formatBRL(totals.discountCents) + ' (' + cinfo.value + '%)';
        $('t-discount-row').hidden = false;
        $('c-remove').hidden = false;
      } else {
        $('t-discount-row').hidden = true;
        $('c-remove').hidden = true;
      }

      var hasPhysical = totals.lines.some(function(l) { return l.format !== 'ebook'; });
      if (!hasPhysical && totals.giftWrap) { S.setGiftWrap(false); return; }
      $('c-gift').disabled = !hasPhysical;
      $('c-gift').checked = totals.giftWrap;
      $('gift-price').textContent = C.formatBRL(totals.giftWrapCents > 0 ? totals.giftWrapCents : 890);
      
      if (totals.giftWrap && hasPhysical) {
        $('t-gift').textContent = C.formatBRL(totals.giftWrapCents);
        $('t-gift-row').hidden = false;
      } else {
        $('t-gift-row').hidden = true;
      }

      $('t-total').textContent = C.formatBRL(totals.totalCents);
    }

    $('coupon-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = ($('c-code').value || '').trim();
      var err = $('coupon-error');
      if (!code) {
        err.textContent = 'Informe um código de cupom.';
        err.hidden = false;
        return;
      }
      if (!S.applyCoupon(code)) {
        err.textContent = 'Cupom inválido.';
        err.hidden = false;
      } else {
        err.hidden = true;
        err.textContent = '';
      }
    });

    $('c-remove').addEventListener('click', function () {
      S.removeCoupon();
      $('c-code').value = '';
    });

    $('c-gift').addEventListener('change', function () {
      S.setGiftWrap(this.checked);
    });

    $('checkout-btn').addEventListener('click', function () {
      var totals = S.totals();
      if (totals.count === 0) return;
      var msg = $('checkout-msg');
      msg.textContent = 'Pedido finalizado no valor de ' + C.formatBRL(totals.totalCents) + '.';
      msg.className = 'ok';
      msg.hidden = false;
      S.clear();
      $('c-code').value = '';
    });

    S.subscribe(renderCart);
    renderCatalog();
    renderCart();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initDom(document); });
    else initDom(document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
