const inventory = [
    { id: 1, name: 'Dipirona Sódica', activePrinciple: 'Dipirona', price: 10.00, stripe: 'none', isGeneric: true },
    { id: 2, name: 'Novalgina', activePrinciple: 'Dipirona', price: 15.00, stripe: 'none', isGeneric: false, genericId: 1 },
    { id: 3, name: 'Amoxicilina', activePrinciple: 'Amoxicilina', price: 25.00, stripe: 'red', isGeneric: true },
    { id: 4, name: 'Amoxil', activePrinciple: 'Amoxicilina', price: 40.00, stripe: 'red', isGeneric: false, genericId: 3 },
    { id: 5, name: 'Paracetamol', activePrinciple: 'Paracetamol', price: 8.00, stripe: 'none', isGeneric: true },
    { id: 6, name: 'Tylenol', activePrinciple: 'Paracetamol', price: 12.00, stripe: 'none', isGeneric: false, genericId: 5 }
];

let currentCart = null;
let currentGenericSuggestion = null;
let isSubscription = false;
let appliedCoupon = false;

const dom = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    resultsList: document.getElementById('results-list'),
    genericSuggestionSection: document.getElementById('generic-suggestion-section'),
    genericDetails: document.getElementById('generic-details'),
    addGenericBtn: document.getElementById('add-generic-btn'),
    keepOriginalBtn: document.getElementById('keep-original-btn'),
    cartSection: document.getElementById('cart-section'),
    cartItem: document.getElementById('cart-item'),
    prescriptionSection: document.getElementById('prescription-section'),
    crmInput: document.getElementById('crm-input'),
    purchaseTypeRadios: document.getElementsByName('purchase-type'),
    couponInput: document.getElementById('coupon-input'),
    applyCouponBtn: document.getElementById('apply-coupon-btn'),
    couponMessage: document.getElementById('coupon-message'),
    totalPrice: document.getElementById('total-price'),
    checkoutBtn: document.getElementById('checkout-btn'),
    errorMessage: document.getElementById('error-message'),
    receiptSection: document.getElementById('receipt-section'),
    receiptId: document.getElementById('receipt-id'),
    receiptItem: document.getElementById('receipt-item'),
    receiptType: document.getElementById('receipt-type'),
    receiptTotal: document.getElementById('receipt-total'),
    receiptCrm: document.getElementById('receipt-crm'),
    receiptCrmValue: document.getElementById('receipt-crm-value'),
    newOrderBtn: document.getElementById('new-order-btn')
};

function formatPrice(price) {
    return price.toFixed(2).replace('.', ',');
}

function searchMedicines() {
    const query = dom.searchInput.value.trim().toLowerCase();
    dom.resultsList.innerHTML = ''; // safe, we're clearing
    if (!query) return;

    const results = inventory.filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.activePrinciple.toLowerCase().includes(query)
    );

    results.forEach(med => {
        const li = document.createElement('li');
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'medicine-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'medicine-name';
        nameSpan.textContent = `${med.name} (${med.activePrinciple})`;
        infoDiv.appendChild(nameSpan);
        
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `R$ ${formatPrice(med.price)}`;
        infoDiv.appendChild(priceSpan);
        
        if (med.stripe === 'red') {
            const stripeBadge = document.createElement('div');
            stripeBadge.className = 'stripe-badge stripe-red';
            stripeBadge.textContent = 'Tarja Vermelha - Exige Receita';
            infoDiv.appendChild(stripeBadge);
        }

        const selectBtn = document.createElement('button');
        selectBtn.textContent = 'Selecionar';
        selectBtn.className = 'btn-primary';
        selectBtn.onclick = () => selectMedicine(med);

        li.appendChild(infoDiv);
        li.appendChild(selectBtn);
        dom.resultsList.appendChild(li);
    });
}

function selectMedicine(med) {
    dom.resultsList.innerHTML = '';
    
    // Check for generic alternative
    if (!med.isGeneric && med.genericId) {
        const generic = inventory.find(m => m.id === med.genericId);
        if (generic && generic.price < med.price) {
            currentGenericSuggestion = generic;
            currentCart = med;
            showGenericSuggestion(med, generic);
            return;
        }
    }
    
    addToCart(med);
}

function showGenericSuggestion(original, generic) {
    dom.genericSuggestionSection.classList.remove('hidden');
    
    const detailsText = `Você selecionou ${original.name} por R$ ${formatPrice(original.price)}. ` +
                        `Temos o genérico ${generic.name} por R$ ${formatPrice(generic.price)}. ` +
                        `Deseja economizar R$ ${formatPrice(original.price - generic.price)}?`;
                        
    dom.genericDetails.textContent = detailsText;
}

function addToCart(med) {
    currentCart = med;
    dom.genericSuggestionSection.classList.add('hidden');
    dom.cartSection.classList.remove('hidden');
    
    dom.cartItem.textContent = `${med.name} - R$ ${formatPrice(med.price)}`;
    
    if (med.stripe === 'red') {
        dom.prescriptionSection.classList.remove('hidden');
    } else {
        dom.prescriptionSection.classList.add('hidden');
    }
    
    updateTotal();
}

function updateTotal() {
    if (!currentCart) return;
    
    let total = currentCart.price;
    
    if (isSubscription) {
        total *= 0.9; // 10% discount
    }
    
    if (appliedCoupon) {
        total *= 0.9; // 10% discount
    }
    
    dom.totalPrice.textContent = formatPrice(total);
}

function applyCoupon() {
    const code = dom.couponInput.value.trim().toUpperCase();
    if (code === 'DANFARMA10') {
        appliedCoupon = true;
        dom.couponMessage.textContent = 'Cupom aplicado com sucesso! (10% de desconto)';
        dom.couponMessage.className = 'success-text';
        updateTotal();
    } else {
        appliedCoupon = false;
        dom.couponMessage.textContent = 'Cupom inválido.';
        dom.couponMessage.className = 'error-text';
        updateTotal();
    }
}

function generateReceiptId() {
    return 'FAR-' + Math.floor(1000 + Math.random() * 9000);
}

function checkout() {
    dom.errorMessage.textContent = '';
    
    if (!currentCart) return;
    
    if (currentCart.stripe === 'red') {
        const crm = dom.crmInput.value.trim();
        if (!crm) {
            dom.errorMessage.textContent = 'Por favor, informe o CRM do médico para medicamentos de tarja vermelha.';
            return;
        }
    }
    
    // Process order
    const receiptId = generateReceiptId();
    
    dom.cartSection.classList.add('hidden');
    dom.searchSection = document.getElementById('search-section').classList.add('hidden');
    dom.resultsList.innerHTML = '';
    
    dom.receiptSection.classList.remove('hidden');
    dom.receiptId.textContent = receiptId;
    dom.receiptItem.textContent = currentCart.name;
    dom.receiptType.textContent = isSubscription ? 'Assinatura Contínua' : 'Compra Avulsa';
    dom.receiptTotal.textContent = dom.totalPrice.textContent;
    
    if (currentCart.stripe === 'red') {
        dom.receiptCrm.classList.remove('hidden');
        dom.receiptCrmValue.textContent = dom.crmInput.value.trim();
    } else {
        dom.receiptCrm.classList.add('hidden');
    }
}

function resetApp() {
    currentCart = null;
    currentGenericSuggestion = null;
    isSubscription = false;
    appliedCoupon = false;
    
    dom.searchInput.value = '';
    dom.crmInput.value = '';
    dom.couponInput.value = '';
    dom.couponMessage.textContent = '';
    dom.errorMessage.textContent = '';
    dom.purchaseTypeRadios[0].checked = true;
    
    dom.receiptSection.classList.add('hidden');
    document.getElementById('search-section').classList.remove('hidden');
}

// Event Listeners
if (typeof window !== 'undefined' && dom.searchBtn) {
    dom.searchBtn.addEventListener('click', searchMedicines);

    dom.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMedicines();
    });

    dom.addGenericBtn.addEventListener('click', () => {
        if (currentGenericSuggestion) {
            addToCart(currentGenericSuggestion);
        }
    });

    dom.keepOriginalBtn.addEventListener('click', () => {
        if (currentCart) {
            addToCart(currentCart);
        }
    });

    dom.purchaseTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            isSubscription = e.target.value === 'assinatura';
            updateTotal();
        });
    });

    dom.applyCouponBtn.addEventListener('click', applyCoupon);
    dom.checkoutBtn.addEventListener('click', checkout);
    dom.newOrderBtn.addEventListener('click', resetApp);
}

// Export functions for testing if using Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        inventory,
        searchMedicines,
        getGenericAlternative: (med) => {
            if (!med.isGeneric && med.genericId) {
                return inventory.find(m => m.id === med.genericId) || null;
            }
            return null;
        },
        calculateTotal: (price, isSub, hasCoupon) => {
            let total = price;
            if (isSub) total *= 0.9;
            if (hasCoupon) total *= 0.9;
            return total;
        }
    };
}