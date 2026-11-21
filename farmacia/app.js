const inventory = [
    { id: 1, name: 'Dipirona Sódica', activePrinciple: 'Dipirona', price: 10.00, stripe: 'none', isGeneric: true },
    { id: 2, name: 'Novalgina', activePrinciple: 'Dipirona', price: 15.00, stripe: 'none', isGeneric: false, genericId: 1 },
    { id: 3, name: 'Amoxicilina', activePrinciple: 'Amoxicilina', price: 25.00, stripe: 'red', isGeneric: true },
    { id: 4, name: 'Amoxil', activePrinciple: 'Amoxicilina', price: 40.00, stripe: 'red', isGeneric: false, genericId: 3 },
    { id: 5, name: 'Paracetamol', activePrinciple: 'Paracetamol', price: 8.00, stripe: 'none', isGeneric: true },
    { id: 6, name: 'Tylenol', activePrinciple: 'Paracetamol', price: 12.00, stripe: 'none', isGeneric: false, genericId: 5 }
];

let currentCart = null;
let pendingOriginal = null;
let currentGenericSuggestion = null;
let isSubscription = false;
let appliedCoupon = false;

const dom = {
    searchSection: document.getElementById('search-section'),
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

// Pure function to calculate total in integer cents
function calculateTotal(price, isSub, hasCoupon) {
    let cents = Math.round(price * 100);
    if (isSub) {
        cents = Math.round(cents * 0.9);
    }
    if (hasCoupon) {
        cents = Math.round(cents * 0.9);
    }
    return cents / 100;
}

// Pure function to get a cheaper generic alternative
function getGenericAlternative(med) {
    if (!med.isGeneric && med.genericId) {
        const generic = inventory.find(m => m.id === med.genericId);
        if (generic && generic.price < med.price) {
            return generic;
        }
    }
    return null;
}

function searchMedicines() {
    const query = dom.searchInput.value.trim().toLowerCase();
    dom.resultsList.innerHTML = '';
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
    dom.cartSection.classList.add('hidden');
    
    const generic = getGenericAlternative(med);
    if (generic) {
        pendingOriginal = med;
        currentGenericSuggestion = generic;
        showGenericSuggestion(med, generic);
        return;
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
    pendingOriginal = null;
    currentGenericSuggestion = null;
    
    // Clear prior state
    if (dom.crmInput) dom.crmInput.value = '';
    
    dom.genericSuggestionSection.classList.add('hidden');
    dom.searchSection.classList.add('hidden'); // Hide search section as soon as an item enters the cart
    dom.cartSection.classList.remove('hidden');
    
    dom.cartItem.textContent = `${med.name} - R$ ${formatPrice(med.price)}`;
    
    if (med.stripe === 'red') {
        dom.prescriptionSection.classList.remove('hidden');
    } else {
        dom.prescriptionSection.classList.add('hidden');
    }
    
    // Re-evaluate coupon if already applied
    appliedCoupon = (dom.couponInput.value.trim().toUpperCase() === 'DANFARMA10');
    
    updateTotal();
}

function updateTotal() {
    if (!currentCart) return;
    const total = calculateTotal(currentCart.price, isSubscription, appliedCoupon);
    dom.totalPrice.textContent = formatPrice(total);
}

function applyCoupon() {
    // Note: in a real app with backend, coupon validation must be done server-side.
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
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return 'FAR-' + crypto.randomUUID().split('-')[0].toUpperCase();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return 'FAR-' + arr[0].toString(16).toUpperCase();
    }
    return 'FAR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function checkout() {
    dom.errorMessage.textContent = '';
    
    if (!currentCart) return;
    
    if (currentCart.stripe === 'red') {
        // Note: Real prescription control and verification must be done server-side.
        const crm = dom.crmInput.value.trim();
        const crmRegex = /^\d{4,7}-?[A-Z]{2}$/i;
        if (!crm || !crmRegex.test(crm)) {
            dom.errorMessage.textContent = 'Por favor, informe um CRM válido (Ex: 123456-SP) para medicamentos de tarja vermelha.';
            return;
        }
    }
    
    // Process order
    // SECURITY NOTE: In a real system, the CRM must be verified against a registry,
    // and total price + coupon must be re-validated and computed on the server side.
    const receiptId = generateReceiptId();
    
    dom.cartSection.classList.add('hidden');
    dom.searchSection.classList.add('hidden');
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
    pendingOriginal = null;
    currentGenericSuggestion = null;
    isSubscription = false;
    appliedCoupon = false;
    
    dom.searchInput.value = '';
    dom.crmInput.value = '';
    dom.couponInput.value = '';
    dom.couponMessage.textContent = '';
    dom.couponMessage.className = '';
    dom.errorMessage.textContent = '';
    dom.totalPrice.textContent = '0,00';
    if (dom.purchaseTypeRadios.length > 0) {
        dom.purchaseTypeRadios[0].checked = true;
    }
    
    dom.cartSection.classList.add('hidden');
    dom.genericSuggestionSection.classList.add('hidden');
    dom.prescriptionSection.classList.add('hidden');
    dom.receiptSection.classList.add('hidden');
    dom.searchSection.classList.remove('hidden');
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
        if (pendingOriginal) {
            addToCart(pendingOriginal);
        }
    });

    dom.purchaseTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            isSubscription = e.target.value === 'assinatura';
            updateTotal();
        });
    });

    dom.applyCouponBtn.addEventListener('click', applyCoupon);
    dom.couponInput.addEventListener('input', () => {
        appliedCoupon = false;
        dom.couponMessage.textContent = '';
        dom.couponMessage.className = '';
        updateTotal();
    });
    dom.checkoutBtn.addEventListener('click', checkout);
    dom.newOrderBtn.addEventListener('click', resetApp);
}

// Export functions for testing if using Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        inventory,
        searchMedicines,
        selectMedicine,
        showGenericSuggestion,
        getGenericAlternative,
        calculateTotal,
        addToCart,
        checkout,
        applyCoupon,
        resetApp,
        dom,
        get currentCart() { return currentCart; },
        get appliedCoupon() { return appliedCoupon; }
    };
}