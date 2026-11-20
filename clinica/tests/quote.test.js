'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Quote = require('../quote.js');

test('calculates correct subtotal, fasting and turnaround for multiple exams', () => {
    const quote = new Quote();
    quote.addExam('hemograma'); // price: 25, fasting: 8, turnaround: 1
    quote.addExam('colesterol'); // price: 30, fasting: 12, turnaround: 2
    
    const result = quote.calculate();
    assert.equal(result.subtotal, 55);
    assert.equal(result.fastingHours, 12); // max of 8 and 12
    assert.equal(result.turnaroundDays, 2); // max of 1 and 2
    assert.equal(result.discount, 0);
    assert.equal(result.total, 55);
    assert.equal(result.discountType, null);
});

test('applies DANSAUDE10 coupon correctly', () => {
    const quote = new Quote();
    quote.addExam('hemograma'); // 25
    quote.applyCoupon('DANSAUDE10');
    
    const result = quote.calculate();
    assert.equal(result.subtotal, 25);
    assert.equal(result.discount, 2.5); // 10%
    assert.equal(result.total, 22.5);
    assert.equal(result.discountType, 'cupom_dansaude10');
});

test('ignores invalid coupon', () => {
    const quote = new Quote();
    quote.addExam('hemograma'); // 25
    quote.applyCoupon('INVALIDO');
    
    const result = quote.calculate();
    assert.equal(result.discount, 0);
    assert.equal(result.total, 25);
    assert.equal(result.discountType, null);
});

test('applies insurance copay correctly', () => {
    const quote = new Quote();
    quote.addExam('checkup_completo'); // price: 200
    // copay of 30% means patient pays 60 (discount of 140)
    quote.setInsuranceCopay(30);
    
    const result = quote.calculate();
    assert.equal(result.subtotal, 200);
    assert.equal(result.discount, 140);
    assert.equal(result.total, 60);
    assert.equal(result.discountType, 'convenio');
});

test('prioritizes insurance over coupon if both are applied', () => {
    const quote = new Quote();
    quote.addExam('checkup_completo'); // price 200
    quote.setInsuranceCopay(30); // discount 140
    quote.applyCoupon('DANSAUDE10'); // discount 20 (ignored)
    
    const result = quote.calculate();
    assert.equal(result.discountType, 'convenio');
    assert.equal(result.discount, 140);
    assert.equal(result.total, 60);
});

test('throws error for invalid exam', () => {
    const quote = new Quote();
    assert.throws(() => quote.addExam('invalid_exam'), /Exam not found: invalid_exam/);
});

test('throws error for invalid copay percentage', () => {
    const quote = new Quote();
    assert.throws(() => quote.setInsuranceCopay(-10), /Copay percentage must be a number between 0 and 100/);
    assert.throws(() => quote.setInsuranceCopay(150), /Copay percentage must be a number between 0 and 100/);
    assert.throws(() => quote.setInsuranceCopay('30'), /Copay percentage must be a number between 0 and 100/);
});

test('rejects duplicate exams', () => {
    const quote = new Quote();
    quote.addExam('hemograma');
    assert.throws(() => quote.addExam('hemograma'), /Exam already added: hemograma/);
});

test('exams included in a selected checkup are not charged, in any order', () => {
    const a = new Quote();
    a.addExam('checkup_basico');
    a.addExam('hemograma');
    const b = new Quote();
    b.addExam('hemograma');
    b.addExam('checkup_basico');
    assert.equal(a.calculate().subtotal, 120);
    assert.equal(b.calculate().subtotal, 120);
    assert.equal(a.calculate().fastingHours, b.calculate().fastingHours);
});

test('setInsuranceCopay rejects NaN and Infinity', () => {
    const quote = new Quote();
    assert.throws(() => quote.setInsuranceCopay(NaN), /Copay percentage/);
    assert.throws(() => quote.setInsuranceCopay(Infinity), /Copay percentage/);
});

test('copay boundaries 0 and 100', () => {
    const q0 = new Quote();
    q0.addExam('checkup_completo');
    q0.setInsuranceCopay(0);
    assert.deepEqual([q0.calculate().discount, q0.calculate().total], [200, 0]);
    const q100 = new Quote();
    q100.addExam('checkup_completo');
    q100.setInsuranceCopay(100);
    assert.deepEqual([q100.calculate().discount, q100.calculate().total], [0, 200]);
    assert.equal(q100.calculate().discountType, 'convenio');
});

test('empty quote returns zeros', () => {
    assert.deepEqual(new Quote().calculate(), {
        subtotal: 0, discount: 0, total: 0, fastingHours: 0, turnaroundDays: 0, discountType: null
    });
});

test('rounds monetary values to cents', () => {
    const quote = new Quote();
    quote.addExam('hemograma'); // 25
    quote.addExam('glicemia'); // 15
    quote.setInsuranceCopay(33.3);
    const r = quote.calculate();
    assert.equal(r.subtotal, 40);
    assert.equal(r.total, 13.32);
    assert.equal(r.discount, 26.68);
});

test('coupon is normalized, validated and cleared', () => {
    const quote = new Quote();
    quote.addExam('hemograma');
    assert.equal(quote.applyCoupon(' dansaude10 '), true);
    assert.equal(quote.calculate().discountType, 'cupom_dansaude10');
    assert.equal(quote.applyCoupon(''), false);
    assert.equal(quote.calculate().discountType, null);
    quote.applyCoupon('DANSAUDE10');
    assert.equal(quote.applyCoupon(null), false);
    assert.equal(quote.calculate().discountType, null);
    assert.throws(() => quote.applyCoupon(10), /Coupon code must be a string/);
});

test('insurance wins over coupon regardless of order', () => {
    const quote = new Quote();
    quote.addExam('checkup_completo');
    quote.applyCoupon('DANSAUDE10');
    quote.setInsuranceCopay(30);
    const r = quote.calculate();
    assert.equal(r.discountType, 'convenio');
    assert.equal(r.total, 60);
});
