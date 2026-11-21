const { test, describe, afterEach } = require('node:test');
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
    
    afterEach(() => {
        app.resetApp();
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
    });

    test('searchMedicines filters correctly', () => {
        app.dom.searchInput.value = 'dipirona';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 2); 
        
        app.dom.searchInput.value = 'amox';
        app.searchMedicines();
        assert.strictEqual(app.dom.resultsList.children.length, 2); 
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

    test('checkout succeeds for red-stripe if CRM is valid', () => {
        const amoxil = app.inventory.find(m => m.stripe === 'red');
        app.addToCart(amoxil);
        
        app.dom.crmInput.value = '123456-SP';
        app.checkout();
        assert.strictEqual(app.dom.errorMessage.textContent, '');
        assert.ok(app.dom.receiptSection.classList.contains('hidden') === false);
        assert.strictEqual(app.dom.receiptCrmValue.textContent, '123456-SP');
        assert.ok(app.dom.receiptCrm.classList.contains('hidden') === false);
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
});