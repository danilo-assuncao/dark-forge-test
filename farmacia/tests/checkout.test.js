const { describe, it } = require('node:test');
const assert = require('node:assert');
const { finalizePharmacyOrder } = require('../checkout.js');

describe('Checkout Module', () => {
  const referenceDateIso = '2023-10-10T10:00:00.000Z';
  const validPrescription = {
    patientName: 'John Doe',
    crmNumber: '12345',
    uf: 'SP',
    issuedAtIso: '2023-10-01T10:00:00.000Z'
  };

  it('should process a valid order without prescription needed', () => {
    const payload = {
      items: [{ id: 'p1', qty: 1 }],
      shippingMode: 'expresso',
      referenceDateIso
    };
    const result = finalizePharmacyOrder(payload);
    
    assert.match(result.protocol, /^FAR-[A-Z0-9]{4}$/);
    assert.strictEqual(result.pricing.finalPrice, 22.5);
    assert.strictEqual(result.shippingPrice, 9.9);
    assert.strictEqual(result.total, 32.4);
    assert.strictEqual(result.status, 'CONFIRMED');
  });

  it('should give free shipping for net subtotal >= 110', () => {
    const payload = {
      items: [{ id: 'p3', qty: 5 }], // Tylenol: 28. 5*28=140. 15% discount=21. Net=119. 119 >= 110.
      shippingMode: 'expresso',
      referenceDateIso
    };
    const result = finalizePharmacyOrder(payload);
    
    assert.strictEqual(result.shippingPrice, 0);
    assert.strictEqual(result.total, 119);
  });

  it('should give free shipping for store pickup', () => {
    const payload = {
      items: [{ id: 'p1', qty: 1 }],
      shippingMode: 'retirada',
      referenceDateIso
    };
    const result = finalizePharmacyOrder(payload);
    
    assert.strictEqual(result.shippingPrice, 0);
    assert.strictEqual(result.total, 22.5);
  });

  it('should block checkout if red stripe item has no valid prescription', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }], // Roacutan, red stripe
      shippingMode: 'expresso',
      referenceDateIso
    };
    
    assert.throws(() => {
      finalizePharmacyOrder(payload);
    }, /Prescription is required/);
  });

  it('should process order if red stripe item has valid prescription', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }], // Roacutan 250.00
      shippingMode: 'expresso',
      prescription: validPrescription,
      referenceDateIso
    };
    
    const result = finalizePharmacyOrder(payload);
    assert.strictEqual(result.pricing.finalPrice, 250.00);
    assert.strictEqual(result.shippingPrice, 0); // 250 >= 110
    assert.strictEqual(result.total, 250.00);
    assert.strictEqual(result.status, 'CONFIRMED');
  });
});
