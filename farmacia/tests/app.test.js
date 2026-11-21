const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');

// Simple DOM Mock
class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        const classes = new Set();
        this.classList = {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c)
        };
        this.value = '';
        this.textContent = '';
        this._innerHTML = '';
        this.className = '';
        this.children = [];
        this.listeners = {};
    }
    
    get innerHTML() {
        return this._innerHTML;
    }
    
    set innerHTML(val) {
        this._innerHTML = val;
        if (val === '') {
            this.children = [];
        }
    }

    addEventListener(event, fn) {
        this.listeners[event] = fn;
    }
    appendChild(child) {
        this.children.push(child);
    }
}

// Prepare Global DOM
const elements = {};
global.document = {
    getElementById: (id) => {
        if (!elements[id]) elements[id] = new MockElement('div');
        return elements[id];
    },
    getElementsByName: (name) => {
        if (!elements[name]) {
            const radio1 = new MockElement('input');
            radio1.value = 'avulsa';
            radio1.checked = true;
            const radio2 = new MockElement('input');
            radio2.value = 'assinatura';
            elements[name] = [radio1, radio2];
        }
        return elements[name];
    },
    createElement: (tag) => new MockElement(tag)
};
global.window = {};

const app = require('../app.js');

describe('Dan Farma App Tests', () => {
    
    beforeEach(() => {
        app.resetApp();
        app.dom.genericSuggestionSection.classList.add('hidden');
        app.dom.cartSection.classList.add('hidden');
        app.dom.prescriptionSection.classList.add('hidden');
        app.dom.receiptSection.classList.add('hidden');
        app.dom.receiptCrm.classList.add('hidden');
        app.dom.searchSection.classList.remove('hidden');
    });

    test('Inventory has items', () => {
        assert.ok(app.inventory.length > 0);
    });

    test('getGenericAlternative returns generic if available', () => {
        const brand = app.inventory.find(m => m.name === 'Amoxil');
        const generic = app.getGenericAlternative(brand);
        assert.ok(generic);
        assert.strictEqual(generic.name, 'Amoxicilina');
        assert.ok(generic.price < brand.price);
    });

    test('getGenericAlternative returns null if no generic', () => {
        const genericMed = app.inventory.find(m => m.name === 'Amoxicilina');
        const result = app.getGenericAlternative(genericMed);
        assert.strictEqual(result, null);
    });
    
    test('getGenericAlternative returns null if generic not cheaper', () => {
        const brand = { id: 99, name: 'BrandX', price: 10.00, isGeneric: false, genericId: 1 };
        const generic = app.getGenericAlternative(brand);
        assert.strictEqual(generic, null);
    });
    
    test('getGenericAlternative returns null if genericId has no match', () => {
        const brand = { id: 99, name: 'BrandX', price: 50.00, isGeneric: false, genericId: 999 };
        const generic = app.getGenericAlternative(brand);
        assert.strictEqual(generic, null);
    });

    test('calculateTotal without discounts', () => {
        const total = app.calculateTotal(100.00, false, false);
        assert.strictEqual(total, 100.00);
    });

    test('calculateTotal with subscription discount (10%)', () => {
        const total = app.calculateTotal(100.00, true, false);
        assert.strictEqual(total, 90.00);
    });

    test('calculateTotal with coupon discount (10%)', () => {
        const total = app.calculateTotal(100.00, false, true);
        assert.strictEqual(total, 90.00);
    });

    test('calculateTotal with subscription and coupon discount uses integer cents correctly', () => {
        const total = app.calculateTotal(15.00, true, true);
        assert.strictEqual(total, 12.15);
        
        const total2 = app.calculateTotal(25.00, true, true);
        assert.strictEqual(total2, 20.25);
        
        const total3 = app.calculateTotal(9.99, true, true);
        // 999 * 0.9 = 899.1 -> 899. 899 * 0.9 = 809.1 -> 809 cents -> 8.09
        assert.strictEqual(total3, 8.09);
        
        const total4 = app.calculateTotal(0.05, true, true);
        // 5 * 0.9 = 4.5 -> 5. 5 * 0.9 = 4.5 -> 5 cents -> 0.05
        assert.strictEqual(total4, 0.05);
    });

    test('searchMedicines filters correctly and handles boundaries', () => {
        // Empty query
        app.dom.searchInput.value = '   ';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 0);

        // Name match
        app.dom.searchInput.value = 'dipirona';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 2);
        assert.ok(app.dom.resultsList.children[0].children[0].children[0].textContent.includes('Dipirona Sódica'));
        
        // Active principle match, uppercase
        app.dom.searchInput.value = 'AMOX';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 2); 
        
        // No match
        app.dom.searchInput.value = 'unknown';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 0); 
    });

    test('applyCoupon validates DANFARMA10 and updates appliedCoupon', () => {
        app.addToCart(app.inventory[0]); 
        
        app.dom.couponInput.value = 'danfarma10'; 
        app.applyCoupon();
        assert.strictEqual(app.appliedCoupon, true);
        assert.strictEqual(app.dom.couponMessage.textContent, 'Cupom aplicado com sucesso! (10% de desconto)');
        
        app.dom.couponInput.value = 'INVALID';
        app.applyCoupon();
        assert.strictEqual(app.appliedCoupon, false);
        assert.strictEqual(app.dom.couponMessage.textContent, 'Cupom inválido.');
        
        // Changing input resets coupon state
        if (app.dom.couponInput.listeners['input']) {
            app.dom.couponInput.listeners['input']();
            assert.strictEqual(app.appliedCoupon, false);
            assert.strictEqual(app.dom.couponMessage.textContent, '');
        }
        
        // addToCart re-evaluates coupon text without applyCoupon
        app.dom.couponInput.value = 'DANFARMA10';
        app.addToCart(app.inventory[0]);
        assert.strictEqual(app.appliedCoupon, true);
        assert.strictEqual(app.dom.totalPrice.textContent, '9,00');
    });

    test('checkout blocks order if red-stripe and CRM is empty or invalid', () => {
        const amoxil = app.inventory.find(m => m.stripe === 'red');
        app.addToCart(amoxil);
        
        app.dom.crmInput.value = '';
        app.checkout();
        assert.ok(app.dom.errorMessage.textContent.includes('CRM válido'));
        assert.ok(app.dom.receiptSection.classList.contains('hidden')); 
        
        app.dom.crmInput.value = 'x';
        app.checkout();
        assert.ok(app.dom.errorMessage.textContent.includes('CRM válido'));
    });

    test('checkout succeeds for red-stripe if CRM is valid (table driven boundaries)', () => {
        const amoxil = app.inventory.find(m => m.stripe === 'red');
        
        const validCRMs = ['1234-SP', '1234567SP', '123456-sp', '  1234-SP  '];
        for (const crm of validCRMs) {
            app.resetApp();
            app.addToCart(amoxil);
            app.dom.crmInput.value = crm;
            app.checkout();
            assert.strictEqual(app.dom.errorMessage.textContent, '');
            assert.ok(!app.dom.receiptSection.classList.contains('hidden'));
        }
        
        const invalidCRMs = ['123-SP', '12345678-SP', '123456-S', '123456-SPX', '  ', ''];
        for (const crm of invalidCRMs) {
            app.resetApp();
            app.addToCart(amoxil);
            app.dom.crmInput.value = crm;
            app.checkout();
            assert.ok(app.dom.errorMessage.textContent.includes('CRM válido'));
            assert.ok(app.dom.receiptSection.classList.contains('hidden'));
        }
    });

    test('checkout succeeds for non-red-stripe without CRM', () => {
        const dipirona = app.inventory.find(m => m.stripe === 'none');
        app.addToCart(dipirona);
        
        app.dom.crmInput.value = '';
        app.checkout();
        assert.strictEqual(app.dom.errorMessage.textContent, '');
        assert.ok(app.dom.receiptSection.classList.contains('hidden') === false);
        assert.ok(app.dom.receiptCrm.classList.contains('hidden') === true);
    });

    test('subscription flow and end-to-end checkout formats correctly', () => {
        const dipirona = app.inventory.find(m => m.stripe === 'none' && m.price === 10);
        app.addToCart(dipirona);
        
        // apply coupon
        app.dom.couponInput.value = 'DANFARMA10';
        app.applyCoupon();
        
        // activate subscription
        app.dom.purchaseTypeRadios[1].value = 'assinatura';
        if (app.dom.purchaseTypeRadios[1].listeners['change']) {
            app.dom.purchaseTypeRadios[1].listeners['change']({ target: app.dom.purchaseTypeRadios[1] });
        }
        
        assert.strictEqual(app.dom.totalPrice.textContent, '8,10');
        
        app.checkout();
        assert.ok(!app.dom.receiptSection.classList.contains('hidden'));
        assert.strictEqual(app.dom.receiptType.textContent, 'Assinatura Contínua');
        assert.strictEqual(app.dom.receiptTotal.textContent, '8,10');
        assert.ok(app.dom.receiptId.textContent.startsWith('FAR-'));
    });

    test('generic suggestion flow works correctly', () => {
        const novalgina = app.inventory.find(m => m.name === 'Novalgina'); // Brand, price 15
        app.selectMedicine(novalgina);
        assert.ok(!app.dom.genericSuggestionSection.classList.contains('hidden'));
        assert.ok(app.dom.cartSection.classList.contains('hidden'));
        assert.ok(app.dom.genericDetails.textContent.includes('Novalgina'));
        
        const dipironaGeneric = app.inventory.find(m => m.id === novalgina.genericId);
        
        app.addToCart(dipironaGeneric);
        assert.ok(app.dom.genericSuggestionSection.classList.contains('hidden'));
        assert.ok(!app.dom.cartSection.classList.contains('hidden'));
        assert.strictEqual(app.currentCart.id, dipironaGeneric.id);
    });

    test('resetApp restores all UI sections and fields', () => {
        app.addToCart(app.inventory[0]);
        app.dom.couponMessage.className = 'success-text';
        
        app.resetApp();
        
        assert.strictEqual(app.currentCart, null);
        assert.strictEqual(app.appliedCoupon, false);
        assert.strictEqual(app.dom.totalPrice.textContent, '0,00');
        assert.strictEqual(app.dom.couponMessage.className, '');
        assert.ok(app.dom.cartSection.classList.contains('hidden'));
        assert.ok(app.dom.prescriptionSection.classList.contains('hidden'));
        assert.ok(app.dom.genericSuggestionSection.classList.contains('hidden'));
        assert.ok(!app.dom.searchSection.classList.contains('hidden'));
    });
});