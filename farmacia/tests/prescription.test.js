const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCartPrescription } = require('../prescription.js');

test('validateCartPrescription', async (t) => {
  const referenceDateIso = '2023-10-01T12:00:00.000Z';

  await t.test('returns true when no items require prescription', () => {
    // p1 does not require prescription
    const cartItems = [{ id: 'p1', quantity: 1 }];
    const result = validateCartPrescription(cartItems, null, referenceDateIso);
    assert.equal(result, true);
  });

  await t.test('throws when cartItems is not an array', () => {
    assert.throws(
      () => validateCartPrescription({ id: 'p1' }, null, referenceDateIso),
      /cartItems must be an array/
    );
  });

  await t.test('throws when cart item is null', () => {
    assert.throws(
      () => validateCartPrescription([null], null, referenceDateIso),
      /Cart item must be an object/
    );
  });

  await t.test('throws when product id is missing or not a string (e.g. using productId instead of id)', () => {
    assert.throws(
      () => validateCartPrescription([{ productId: 'p1' }], null, referenceDateIso),
      /Cart item id must be a string/
    );
    assert.throws(
      () => validateCartPrescription([{ id: 123 }], null, referenceDateIso),
      /Cart item id must be a string/
    );
  });

  await t.test('throws when product id is unknown', () => {
    assert.throws(
      () => validateCartPrescription([{ id: 'unknown-p' }], null, referenceDateIso),
      /Unknown product id: unknown-p/
    );
  });

  await t.test('throws when item requires prescription but none is provided (mixed cart)', () => {
    const cartItems = [{ id: 'p1', quantity: 1 }, { id: 'p5', quantity: 1 }];
    assert.throws(
      () => validateCartPrescription(cartItems, null, referenceDateIso),
      /Prescription is required/
    );
  });

  await t.test('returns true when prescription is valid', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const prescription = {
      patientName: 'John Doe',
      crmNumber: '12345',
      uf: 'SP',
      issuedAtIso: '2023-09-15T12:00:00Z'
    };
    const result = validateCartPrescription(cartItems, prescription, referenceDateIso);
    assert.equal(result, true);
  });

  await t.test('throws when patientName is invalid', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { crmNumber: '12345', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' };
    
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, patientName: '   ' }, referenceDateIso),
      /Invalid patientName/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, patientName: 123 }, referenceDateIso),
      /Invalid patientName/
    );
  });

  await t.test('crmNumber valid boundaries and types', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' };

    // 4 digits string
    assert.equal(validateCartPrescription(cartItems, { ...validP, crmNumber: '1234' }, referenceDateIso), true);
    // 7 digits string
    assert.equal(validateCartPrescription(cartItems, { ...validP, crmNumber: '1234567' }, referenceDateIso), true);
    // numeric crmNumber
    assert.equal(validateCartPrescription(cartItems, { ...validP, crmNumber: 12345 }, referenceDateIso), true);
  });

  await t.test('throws when crmNumber is invalid', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' };
    
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, crmNumber: '123' }, referenceDateIso),
      /Invalid crmNumber/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, crmNumber: '12345678' }, referenceDateIso),
      /Invalid crmNumber/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, crmNumber: undefined }, referenceDateIso),
      /Invalid crmNumber/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, crmNumber: ['1234'] }, referenceDateIso),
      /Invalid crmNumber/
    );
  });

  await t.test('uf valid boundaries (lowercase)', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', issuedAtIso: '2023-09-15T12:00:00Z' };
    
    assert.equal(validateCartPrescription(cartItems, { ...validP, uf: 'sp' }, referenceDateIso), true);
  });

  await t.test('throws when uf is invalid or missing', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', issuedAtIso: '2023-09-15T12:00:00Z' };

    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, uf: 'XX' }, referenceDateIso),
      /Invalid uf/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP }, referenceDateIso),
      /Invalid uf/
    );
  });

  await t.test('throws when issuedAtIso is invalid, missing, or wrong format', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', uf: 'SP' };
    
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, issuedAtIso: '2023-09-15' }, referenceDateIso),
      /Invalid issuedAtIso/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, issuedAtIso: undefined }, referenceDateIso),
      /Invalid issuedAtIso/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, issuedAtIso: 'not-a-date' }, referenceDateIso),
      /Invalid issuedAtIso/
    );
  });

  await t.test('throws when referenceDateIso is invalid (when provided)', () => {
    const cartItems = [{ id: 'p1', quantity: 1 }];
    
    assert.throws(
      () => validateCartPrescription(cartItems, null, 'garbage'),
      /Invalid referenceDateIso/
    );
    assert.throws(
      () => validateCartPrescription(cartItems, null, '2023-10-01'), // Not strict ISO with time
      /Invalid referenceDateIso/
    );
  });
  
  await t.test('accepts missing referenceDateIso (defaults to now)', () => {
    const cartItems = [{ id: 'p1', quantity: 1 }];
    // Should not throw, defaults internally
    const result = validateCartPrescription(cartItems, null, undefined);
    assert.equal(result, true);
  });

  await t.test('throws when issuedAtIso is in the future (boundary + 1 sec)', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', uf: 'SP' };
    
    // Future + 1 sec
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, issuedAtIso: '2023-10-01T12:00:01.000Z' }, referenceDateIso),
      /future/
    );
  });

  await t.test('throws when prescription is older than 30 days (boundary + 1 sec)', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', uf: 'SP' };
    
    // 30 days + 1 sec
    assert.throws(
      () => validateCartPrescription(cartItems, { ...validP, issuedAtIso: '2023-09-01T11:59:59.000Z' }, referenceDateIso),
      /expired/
    );
  });
  
  await t.test('accepts exactly 30 days difference', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    const validP = { patientName: 'John', crmNumber: '12345', uf: 'SP' };
    
    // exactly 30 days before referenceDateIso
    const issued = '2023-09-01T12:00:00.000Z'; 
    const result = validateCartPrescription(cartItems, { ...validP, issuedAtIso: issued }, referenceDateIso);
    assert.equal(result, true);
  });
});