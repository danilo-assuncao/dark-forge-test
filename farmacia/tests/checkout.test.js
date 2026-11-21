const { describe, it } = require('node:test');
const assert = require('node:assert');
const { finalizePharmacyOrder } = require('../checkout.js');
const crypto = require('crypto');

describe('Checkout Module', () => {
  const referenceDateIso = '2023-10-10T10:00:00.000Z';
  const options = { referenceDateIso };
  const validPrescription = {
    patientName: 'John Doe',
    crmNumber: '12345',
    uf: 'SP',
    issuedAtIso: '2023-10-01T10:00:00.000Z'
  };
  const expiredPrescription = {
    patientName: 'John Doe',
    crmNumber: '12345',
    uf: 'SP',
    issuedAtIso: '2023-01-01T10:00:00.000Z' // well over 30 days before referenceDateIso
  };
  const malformedPrescription = {
    patientName: '',
    crmNumber: 'invalid'
  };

  it('should block invalid payload', () => {
    assert.throws(() => finalizePharmacyOrder(null, options), /Invalid payload/);
    assert.throws(() => finalizePharmacyOrder(undefined, options), /Invalid payload/);
    assert.throws(() => finalizePharmacyOrder("string", options), /Invalid payload/);
  });

  it('should block missing or invalid items', () => {
    assert.throws(() => finalizePharmacyOrder({ shippingMode: 'expresso' }, options), /Items are required/);
    assert.throws(() => finalizePharmacyOrder({ items: [], shippingMode: 'expresso' }, options), /Items are required/);
    assert.throws(() => finalizePharmacyOrder({ items: "not an array", shippingMode: 'expresso' }, options), /Items are required/);
  });

  it('should block invalid shippingMode', () => {
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'p1'}], shippingMode: 'xyz' }, options), /Invalid shippingMode/);
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'p1'}] }, options), /Invalid shippingMode/); // undefined
  });

  it('should block invalid items and quantities', () => {
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'invalid_id'}], shippingMode: 'expresso' }, options), /Unknown product/);
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'p1', qty: 0}], shippingMode: 'expresso' }, options), /Invalid quantity/);
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'p1', qty: 1.5}], shippingMode: 'expresso' }, options), /Invalid quantity/);
  });

  it('should block invalid purchaseMode', () => {
    assert.throws(() => finalizePharmacyOrder({ items: [{id: 'p1'}], shippingMode: 'expresso', purchaseMode: 'invalid' }, options), /Invalid purchaseMode/);
  });

  it('should process a valid order without prescription needed', () => {
    const payload = {
      items: [{ id: 'p1', qty: 1 }],
      shippingMode: 'expresso'
    };
    const result = finalizePharmacyOrder(payload, options);
    
    assert.match(result.protocol, /^FAR-[A-F0-9]{4}$/);
    assert.strictEqual(result.pricing.finalPrice, 22.5);
    assert.strictEqual(result.shippingPrice, 9.9);
    assert.strictEqual(result.total, 32.4); // 22.5 + 9.9 = 32.4
    assert.strictEqual(result.status, 'CONFIRMED');
  });

  it('should give free shipping for exact subtotal = 110.00', () => {
    const payload = {
      items: [
        { id: 'p11', qty: 2 }, // 2 * 50 = 100
        { id: 'p13', qty: 1 }  // 1 * 10 = 10
      ],
      shippingMode: 'expresso'
    };
    const result = finalizePharmacyOrder(payload, options);
    
    assert.strictEqual(result.pricing.finalPrice, 110.00);
    assert.strictEqual(result.shippingPrice, 0);
    assert.strictEqual(result.total, 110.00);
  });

  it('should charge shipping for subtotal just below 110', () => {
    const payload = {
      items: [
        { id: 'p11', qty: 2 }, // 2 * 50 = 100
        { id: 'p10', qty: 1 }  // 1 * 5 = 5 (needs prescription)
      ],
      shippingMode: 'expresso',
      prescription: validPrescription
    };
    const result = finalizePharmacyOrder(payload, options);
    
    assert.strictEqual(result.pricing.finalPrice, 105.00);
    assert.strictEqual(result.shippingPrice, 9.90);
    assert.strictEqual(result.total, 114.90); // 105 + 9.9 = 114.90
  });

  it('should give free shipping for net subtotal >= 110 using DANFARMA10', () => {
    const payload = {
      items: [
        { id: 'p11', qty: 3 } // 3 * 50 = 150 (line discount 15% -> 127.50). 
      ],
      shippingMode: 'expresso',
      couponCode: 'DANFARMA10',
      purchaseMode: 'avulsa'
    };
    // 150 * 0.85 = 127.50
    // 127.50 * 0.90 = 114.75
    const result = finalizePharmacyOrder(payload, options);
    
    assert.strictEqual(result.pricing.finalPrice, 114.75);
    assert.strictEqual(result.shippingPrice, 0);
    assert.strictEqual(result.total, 114.75);
  });

  it('should charge shipping when DANFARMA10 pushes finalPrice below 110', () => {
    const payload = {
      items: [
        { id: 'p11', qty: 2 }, // 100
        { id: 'p1', qty: 1 } // 22.50
      ], // total 122.50. 
      shippingMode: 'expresso',
      couponCode: 'DANFARMA10',
      purchaseMode: 'avulsa'
    };
    // 122.50 * 0.9 = 110.25 (wait, that's >= 110). Let's adjust.
    // 120.00 * 0.9 = 108.00.
    // 2 * p11 (100) + 2 * p13 (20) = 120.
    const modifiedPayload = {
      items: [
        { id: 'p11', qty: 2 },
        { id: 'p13', qty: 2 }
      ],
      shippingMode: 'expresso',
      couponCode: 'DANFARMA10'
    };
    const res = finalizePharmacyOrder(modifiedPayload, options);
    assert.strictEqual(res.pricing.finalPrice, 108.00);
    assert.strictEqual(res.shippingPrice, 9.90);
    assert.strictEqual(res.total, 117.90);
  });

  it('should apply assinatura discount and correctly handle shipping boundary', () => {
    // 125 * 0.88 = 110.00
    const payloadExact = {
      items: [
        { id: 'p11', qty: 2 }, // 100
        { id: 'p1', qty: 1 }, // 22.5
        { id: 'p10', qty: 1 } // 5 (needs rx) -> wait, p1 + p10 = 27.5. No, we want 25.
      ],
      shippingMode: 'expresso',
      purchaseMode: 'assinatura',
      prescription: validPrescription
    };
    // let's just use 1 * p11 (50) + 1 * p7 (65) = 115 * 0.88 = 101.20 (< 110)
    const payloadBelow = {
      items: [
        { id: 'p11', qty: 1 },
        { id: 'p7', qty: 1 } // 65 (needs rx)
      ],
      shippingMode: 'expresso',
      purchaseMode: 'assinatura',
      prescription: validPrescription
    };
    const resBelow = finalizePharmacyOrder(payloadBelow, options);
    assert.strictEqual(resBelow.pricing.finalPrice, 101.20);
    assert.strictEqual(resBelow.shippingPrice, 9.90);
    
    // exact 110? 125 * 0.88 = 110
    // 1 * p14 (100) + 1 * p13 (10) + 1 * p2 (15) = 125
    const payloadExact110 = {
      items: [
        { id: 'p14', qty: 1 },
        { id: 'p13', qty: 1 },
        { id: 'p2', qty: 1 }
      ],
      shippingMode: 'expresso',
      purchaseMode: 'assinatura',
      prescription: validPrescription
    };
    const resExact = finalizePharmacyOrder(payloadExact110, options);
    assert.strictEqual(resExact.pricing.finalPrice, 110.00);
    assert.strictEqual(resExact.shippingPrice, 0);
    assert.strictEqual(resExact.total, 110.00);
  });

  it('should give free shipping for store pickup regardless of subtotal', () => {
    const payload = {
      items: [{ id: 'p1', qty: 1 }],
      shippingMode: 'retirada'
    };
    const result = finalizePharmacyOrder(payload, options);
    
    assert.strictEqual(result.shippingPrice, 0);
    assert.strictEqual(result.total, 22.5);
  });

  it('should block checkout if red stripe item has no valid prescription', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }], // Roacutan, red stripe
      shippingMode: 'expresso'
    };
    
    assert.throws(() => {
      finalizePharmacyOrder(payload, options);
    }, /Prescription is required/);
  });
  
  it('should block checkout if prescription is expired', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }], // Roacutan
      shippingMode: 'expresso',
      prescription: expiredPrescription
    };
    
    assert.throws(() => {
      finalizePharmacyOrder(payload, options);
    }, /expired/);
  });

  it('should block checkout if prescription is malformed', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }],
      shippingMode: 'expresso',
      prescription: malformedPrescription
    };
    
    assert.throws(() => {
      finalizePharmacyOrder(payload, options);
    }, /Invalid patientName/);
  });
  
  it('should block mixed carts (OTC + red stripe) if prescription is invalid', () => {
    const payload = {
      items: [
        { id: 'p1', qty: 1 },
        { id: 'p5', qty: 1 }
      ],
      shippingMode: 'expresso'
    };
    
    assert.throws(() => {
      finalizePharmacyOrder(payload, options);
    }, /Prescription is required/);
  });

  it('should process order if red stripe item has valid prescription', () => {
    const payload = {
      items: [{ id: 'p5', qty: 1 }], // Roacutan 250.00
      shippingMode: 'expresso',
      prescription: validPrescription
    };
    
    const result = finalizePharmacyOrder(payload, options);
    assert.strictEqual(result.pricing.finalPrice, 250.00);
    assert.strictEqual(result.shippingPrice, 0); // 250 >= 110
    assert.strictEqual(result.total, 250.00);
    assert.strictEqual(result.status, 'CONFIRMED');
  });
});
describe('Protocol Generation Mocking', () => {
  const { mock } = require('node:test');
  it('should generate a 4-char hex protocol from crypto.randomBytes', () => {
    const crypto = require('crypto');
    // Mock randomBytes to return a predictable buffer
    const rbMock = mock.method(crypto, 'randomBytes', (size) => {
      assert.strictEqual(size, 2);
      return Buffer.from([0x1A, 0x2B]); // '1A2B'
    });
    
    const payload = {
      items: [{ id: 'p1', qty: 1 }],
      shippingMode: 'retirada'
    };
    const result = finalizePharmacyOrder(payload, { referenceDateIso: '2023-10-10T10:00:00.000Z' });
    
    assert.strictEqual(result.protocol, 'FAR-1A2B');
    
    mock.restoreAll();
  });
});
