const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCartPrescription } = require('../prescription.js');

test('validateCartPrescription', async (t) => {
  const referenceDateIso = '2023-10-01T12:00:00Z';

  await t.test('returns true when no items require prescription', () => {
    // p1 does not require prescription
    const cartItems = [{ id: 'p1', quantity: 1 }];
    const result = validateCartPrescription(cartItems, null, referenceDateIso);
    assert.equal(result, true);
  });

  await t.test('throws when item requires prescription but none is provided', () => {
    // p5 requires prescription
    const cartItems = [{ id: 'p5', quantity: 1 }];
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
    const prescription = {
      patientName: '   ', // invalid
      crmNumber: '12345',
      uf: 'SP',
      issuedAtIso: '2023-09-15T12:00:00Z'
    };
    assert.throws(
      () => validateCartPrescription(cartItems, prescription, referenceDateIso),
      /Invalid patientName/
    );
  });

  await t.test('throws when crmNumber is invalid', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    
    // less than 4 digits
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '123', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' }, referenceDateIso),
      /Invalid crmNumber/
    );

    // more than 7 digits
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '12345678', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' }, referenceDateIso),
      /Invalid crmNumber/
    );

    // non-numeric
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '1234A', uf: 'SP', issuedAtIso: '2023-09-15T12:00:00Z' }, referenceDateIso),
      /Invalid crmNumber/
    );
  });

  await t.test('throws when uf is invalid', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    
    // not a valid state
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '12345', uf: 'XX', issuedAtIso: '2023-09-15T12:00:00Z' }, referenceDateIso),
      /Invalid uf/
    );
  });

  await t.test('throws when issuedAtIso is in the future', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '12345', uf: 'SP', issuedAtIso: '2023-10-02T12:00:00Z' }, referenceDateIso),
      /future/
    );
  });

  await t.test('throws when prescription is older than 30 days', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    
    // 31 days ago
    assert.throws(
      () => validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '12345', uf: 'SP', issuedAtIso: '2023-08-31T12:00:00Z' }, referenceDateIso),
      /expired/
    );
  });
  
  await t.test('accepts exactly 30 days difference', () => {
    const cartItems = [{ id: 'p5', quantity: 1 }];
    // exactly 30 days before referenceDateIso
    const issued = '2023-09-01T12:00:00Z'; 
    const result = validateCartPrescription(cartItems, { patientName: 'John', crmNumber: '12345', uf: 'SP', issuedAtIso: issued }, referenceDateIso);
    assert.equal(result, true);
  });
});