'use strict';

if (typeof window !== 'undefined') {
  const { filterMenu, MENU } = require('./menu.js');
  const { EXTRAS, DONENESS_OPTIONS, customizeDish } = require('./customizer.js');
  const { submitRestaurantOrder } = require('./order.js');

  const vitrineItemsContainer = document.getElementById('vitrine-items');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const cartItemsContainer = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkout-btn');
  const receiptContainer = document.getElementById('receipt');
  const receiptContent = document.getElementById('receipt-content');

  let cart = [];

  function renderVitrine(dishes) {
    vitrineItemsContainer.textContent = ''; 
    
    if (dishes.length === 0) {
      vitrineItemsContainer.textContent = 'Nenhum prato encontrado com esses filtros.';
      return;
    }

    for (const dish of dishes) {
      const card = document.createElement('div');
      card.classList.add('dish-card');
      card.dataset.id = dish.id;

      const title = document.createElement('h3');
      title.textContent = `${dish.name} - R$ ${dish.priceBrl.toFixed(2)}`;
      
      const details = document.createElement('p');
      details.textContent = `Categoria: ${dish.category} | Tempo: ${dish.prepMinutes}min`;
      
      const tags = document.createElement('p');
      tags.textContent = `Tags: ${dish.dietaryTags.join(', ')} | Alérgenos: ${dish.allergens.join(', ')}`;

      const configDiv = document.createElement('div');
      
      const qtyLabel = document.createElement('label');
      qtyLabel.textContent = 'Qtd: ';
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.max = '20';
      qtyInput.value = '1';
      qtyInput.className = 'qty-input';
      
      const donenessLabel = document.createElement('label');
      donenessLabel.textContent = ' Ponto: ';
      const donenessSelect = document.createElement('select');
      donenessSelect.className = 'doneness-select';
      for (const opt of DONENESS_OPTIONS) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === 'ao-ponto') option.selected = true;
        donenessSelect.appendChild(option);
      }

      const extrasLabel = document.createElement('label');
      extrasLabel.textContent = ' Extras: ';
      const extrasSelect = document.createElement('select');
      extrasSelect.className = 'extras-select';
      extrasSelect.multiple = true;
      for (const [extName, extPrice] of Object.entries(EXTRAS)) {
        const option = document.createElement('option');
        option.value = extName;
        option.textContent = `${extName} (+R$ ${extPrice.toFixed(2)})`;
        extrasSelect.appendChild(option);
      }
      
      const notesLabel = document.createElement('label');
      notesLabel.textContent = ' Obs: ';
      const notesInput = document.createElement('input');
      notesInput.type = 'text';
      notesInput.className = 'notes-input';

      const addBtn = document.createElement('button');
      addBtn.textContent = 'Adicionar à Sacola';
      addBtn.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value, 10);
        const doneness = donenessSelect.value;
        const extras = Array.from(extrasSelect.selectedOptions).map(o => o.value);
        const notes = notesInput.value;
        
        try {
          customizeDish({ dishId: dish.id, qty, doneness, extras, notes });
          cart.push({ dishId: dish.id, qty, doneness, extras, notes });
          renderCart();
        } catch (e) {
          alert('Erro ao adicionar: ' + e.message);
        }
      });

      configDiv.appendChild(qtyLabel);
      configDiv.appendChild(qtyInput);
      configDiv.appendChild(donenessLabel);
      configDiv.appendChild(donenessSelect);
      configDiv.appendChild(document.createElement('br'));
      configDiv.appendChild(extrasLabel);
      configDiv.appendChild(extrasSelect);
      configDiv.appendChild(document.createElement('br'));
      configDiv.appendChild(notesLabel);
      configDiv.appendChild(notesInput);
      configDiv.appendChild(document.createElement('br'));
      configDiv.appendChild(addBtn);

      card.appendChild(title);
      card.appendChild(details);
      card.appendChild(tags);
      card.appendChild(configDiv);
      
      vitrineItemsContainer.appendChild(card);
    }
  }

  function renderCart() {
    cartItemsContainer.textContent = '';
    if (cart.length === 0) {
      cartItemsContainer.textContent = 'Sacola vazia';
      return;
    }
    
    for (const [idx, item] of cart.entries()) {
      const li = document.createElement('li');
      li.classList.add('cart-item');
      
      try {
        const details = customizeDish(item);
        let text = `${details.qty}x ${details.name} (${details.doneness}) - R$ ${details.totalBrl.toFixed(2)}`;
        if (details.extras.length > 0) {
          text += ` | Extras: ${details.extras.join(', ')}`;
        }
        if (details.notes) {
          text += ` | Obs: ${details.notes}`;
        }
        li.textContent = text;
      } catch (e) {
        li.textContent = `Item inválido: ${e.message}`;
      }

      const rmBtn = document.createElement('button');
      rmBtn.textContent = 'Remover';
      rmBtn.className = 'remove-btn';
      rmBtn.style.marginLeft = '1rem';
      rmBtn.addEventListener('click', () => {
        cart.splice(idx, 1);
        renderCart();
      });
      li.appendChild(rmBtn);
      
      cartItemsContainer.appendChild(li);
    }
  }

  applyFiltersBtn.addEventListener('click', () => {
    const category = document.getElementById('category-filter').value || undefined;
    const requiredTag = document.getElementById('dietary-filter').value || undefined;
    
    const excludeAllergens = [];
    document.querySelectorAll('#allergen-filters input[type="checkbox"]:checked').forEach(cb => {
      excludeAllergens.push(cb.value);
    });

    const filtered = filterMenu({ category, requiredTag, excludeAllergens });
    renderVitrine(filtered);
  });

  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
      alert('A sacola está vazia.');
      return;
    }
    
    const distStr = document.getElementById('distance-input').value;
    const distanceKm = parseFloat(distStr);
    if (isNaN(distanceKm)) {
      alert('Erro ao finalizar pedido: Distância inválida');
      return;
    }
    
    const tipPct = parseInt(document.getElementById('tip-input').value, 10);
    const couponCode = document.getElementById('coupon-input').value.trim();
    const customerName = document.getElementById('name-input').value;
    const address = document.getElementById('address-input').value;

    try {
      const result = submitRestaurantOrder({
        lineItems: cart,
        distanceKm,
        tipPct,
        couponCode,
        customerName,
        address
      });
      
      showReceipt(result);
      
      // Clear cart
      cart = [];
      renderCart();
    } catch (e) {
      alert('Erro ao finalizar pedido: ' + e.message);
    }
  });

  function showReceipt(order) {
    receiptContainer.style.display = 'block';
    receiptContent.textContent = '';
    
    const header = document.createElement('h3');
    header.textContent = `Pedido: ${order.protocol}`;
    receiptContent.appendChild(header);
    
    const customerInfo = document.createElement('p');
    customerInfo.textContent = `Cliente: ${order.customerName} | Entrega: ${order.address}`;
    receiptContent.appendChild(customerInfo);
    
    const itemsList = document.createElement('ul');
    itemsList.className = 'receipt-items';
    for (const item of order.items) {
      const li = document.createElement('li');
      li.textContent = `${item.qty}x ${item.name} - R$ ${item.totalBrl.toFixed(2)}`;
      itemsList.appendChild(li);
    }
    receiptContent.appendChild(itemsList);
    
    const totalsDiv = document.createElement('div');
    totalsDiv.className = 'receipt-totals';
    
    const subtotalP = document.createElement('p');
    subtotalP.textContent = `Subtotal: R$ ${order.totals.itemsSubtotalBrl.toFixed(2)}`;
    totalsDiv.appendChild(subtotalP);
    
    const discountP = document.createElement('p');
    discountP.textContent = `Desconto: R$ ${order.totals.discountBrl.toFixed(2)}`;
    totalsDiv.appendChild(discountP);
    
    const netP = document.createElement('p');
    netP.textContent = `Subtotal Líquido: R$ ${order.totals.netSubtotalBrl.toFixed(2)}`;
    totalsDiv.appendChild(netP);
    
    const deliveryP = document.createElement('p');
    deliveryP.textContent = `Taxa de Entrega: R$ ${order.totals.deliveryFeeBrl.toFixed(2)}`;
    totalsDiv.appendChild(deliveryP);
    
    const tipP = document.createElement('p');
    tipP.textContent = `Gorjeta: R$ ${order.totals.tipBrl.toFixed(2)}`;
    totalsDiv.appendChild(tipP);
    
    const totalH = document.createElement('h4');
    totalH.textContent = `Total: R$ ${order.totals.totalBrl.toFixed(2)}`;
    totalsDiv.appendChild(totalH);
    
    const timeP = document.createElement('p');
    timeP.textContent = `Tempo estimado: ${order.estimatedMinutes} minutos`;
    totalsDiv.appendChild(timeP);
    
    receiptContent.appendChild(totalsDiv);
  }

  // Initial load
  renderVitrine(MENU);
  renderCart();
}

if (typeof module !== 'undefined') {
  module.exports = {};
}
