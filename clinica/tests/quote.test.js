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
