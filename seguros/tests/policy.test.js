'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { issuePolicyProposal } = require('../policy.js');

const base = { vehicleId: 'sedan-medio', driverAge: 30, payment: 'credit' };

test('issues a proposal without optional coverages or coupon', () => {
  const p = issuePolicyProposal(base);
  assert.match(p.protocol, /^APO-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(p.vehicleId, 'sedan-medio');
  assert.equal(p.basePremiumCents, 625000);
  assert.equal(p.coveragesTotalCents, 0);
  assert.deepEqual(p.coverageIds, []);
  assert.equal(p.coupon, '');
  assert.equal(p.couponDiscountCents, 0);
  assert.equal(p.netSubtotalCents, 625000);
  assert.equal(p.iofCents, 46125);
  assert.equal(p.pixDiscountCents, 0);
  assert.equal(p.totalCents, 671125);
  assert.equal(p.installments, 1);
  assert.deepEqual(p.installmentAmountsCents, [671125]);
});

test('discounts both premium and coverages, then taxes the net subtotal', () => {
  const p = issuePolicyProposal({
    ...base, coupon: 'DANSEG10', coverageIds: ['assistencia-ilimitada', 'vidros-completo']
  });
  assert.equal(p.coveragesTotalCents, 45000);
  assert.equal(p.subtotalCents, 670000);
  assert.equal(p.couponDiscountCents, 67000);
  assert.equal(p.netSubtotalCents, 603000);
  assert.equal(p.iofCents, 44501);
  assert.equal(p.totalWithIofCents, 647501);
  assert.equal(p.totalCents, 647501);
});

test('PIX deducts 5% after coupon and IOF and is payable in one installment', () => {
  const p = issuePolicyProposal({
    ...base, payment: 'pix', coupon: 'DANSEG10',
    coverageIds: ['assistencia-ilimitada', 'vidros-completo']
  });
  assert.equal(p.totalWithIofCents, 647501);
  assert.equal(p.pixDiscountCents, 32375);
  assert.equal(p.totalCents, 615126);
  assert.deepEqual(p.installmentAmountsCents, [615126]);
  assert.equal(issuePolicyProposal({ ...base, payment: 'pix' }).totalCents, 637569);
});

test('uses the risk, garage, bonus and deductible adjusted premium and rounds each step', () => {
  const p = issuePolicyProposal({
    vehicleId: 'hatch-compacto', driverAge: 20, hasGarage: true,
    bonusClass: 7, deductibleType: 'reduzida', coupon: 'DANSEG10', payment: 'pix'
  });
  assert.equal(p.quote.basePremiumCents, 337500);
  assert.equal(p.basePremiumCents, 390755);
  assert.equal(p.quote.deductibleCents, 225000);
  assert.equal(p.couponDiscountCents, 39076);
  assert.equal(p.netSubtotalCents, 351679);
  assert.equal(p.iofCents, 25954);
  assert.equal(p.totalWithIofCents, 377633);
  assert.equal(p.pixDiscountCents, 18882);
  assert.equal(p.totalCents, 358751);
});

test('credit supports every count from 1 to 12 without interest or lost cents', () => {
  for (let installments = 1; installments <= 12; installments++) {
    const p = issuePolicyProposal({ ...base, installments });
    const amounts = p.installmentAmountsCents;
    assert.equal(p.totalCents, 671125);
    assert.equal(p.installments, installments);
    assert.equal(amounts.length, installments);
    assert.ok(amounts.every(Number.isInteger));
    assert.equal(amounts.reduce((sum, n) => sum + n, 0), p.totalCents);
    assert.ok(Math.max(...amounts) - Math.min(...amounts) <= 1);
  }
  assert.deepEqual(issuePolicyProposal({ ...base, installments: 5 }).installmentAmountsCents,
    [134225, 134225, 134225, 134225, 134225]);
  const p = issuePolicyProposal({ ...base, installments: 12, coupon: 'DANSEG10' });
  assert.equal(p.totalCents, 604013);
  assert.deepEqual(p.installmentAmountsCents, [...Array(5).fill(50335), ...Array(7).fill(50334)]);
});

test('normalizes selections and coupon without mutating the payload', () => {
  const payload = Object.freeze({
    ...base, vehicleId: ' SEDAN-MEDIO ', coupon: ' danseg10 ',
    coverageIds: Object.freeze([' VIDROS-COMPLETO '])
  });
  const p = issuePolicyProposal(payload);
  assert.equal(p.vehicleId, 'sedan-medio');
  assert.equal(p.coupon, 'DANSEG10');
  assert.deepEqual(p.coverageIds, ['vidros-completo']);
  p.coverageIds.push('carro-reserva-7d');
  assert.deepEqual(payload.coverageIds, [' VIDROS-COMPLETO ']);

  const pEmpty = issuePolicyProposal({ ...base, coupon: '   ', installments: undefined });
  assert.equal(pEmpty.coupon, '');
  assert.equal(pEmpty.couponDiscountCents, 0);
  assert.equal(pEmpty.installments, 1);
});

test('rejects invalid payment, installment and coupon inputs', () => {
  [undefined, null, {}, 'cash', 'PIX'].forEach(payment => {
    assert.throws(() => issuePolicyProposal({ ...base, payment }), /payment/);
  });
  [0, 13, -1, 1.5, '3', null, NaN, Infinity].forEach(installments => {
    assert.throws(() => issuePolicyProposal({ ...base, installments }), /installments/);
  });
  assert.throws(() => issuePolicyProposal({ ...base, payment: 'pix', installments: 2 }), /installments/);
  ['OTHER', 'DANSEG100', null, 10, {}].forEach(coupon => {
    assert.throws(() => issuePolicyProposal({ ...base, coupon }), /coupon/);
  });
  [undefined, null, [], 'proposal', 42].forEach(payload => {
    assert.throws(() => issuePolicyProposal(payload), /payload/);
  });
});

test('preserves vehicle, driver, bonus, deductible and coverage validation', () => {
  [
    [{ vehicleId: 'missing' }, /vehicleId/],
    [{ driverAge: 17 }, /driverAge/],
    [{ bonusClass: 11 }, /bonusClass/],
    [{ deductibleType: 'missing' }, /deductibleType/],
    [{ coverageIds: 'vidros-completo' }, /array/],
    [{ coverageIds: ['missing'] }, /unknown coverage/],
    [{ coverageIds: ['vidros-completo', ' VIDROS-COMPLETO '] }, /duplicate/],
    [{ coverageIds: ['carro-reserva-7d', 'carro-reserva-15d'] }, /mutually exclusive/]
  ].forEach(([input, error]) => {
    assert.throws(() => issuePolicyProposal({ ...base, ...input }), error);
  });
});

test('browser export composes all three dependencies and matches the Node calculation', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const window = {};
  for (const file of ['vehicles.js', 'quote.js', 'coverages.js', 'policy.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { window });
  }
  const payload = { ...base, coupon: 'DANSEG10', installments: 12, coverageIds: ['carro-reserva-7d'] };
  const browser = JSON.parse(JSON.stringify(window.SegurosPolicy.issuePolicyProposal(payload)));
  const node = issuePolicyProposal(payload);
  assert.match(browser.protocol, /^APO-[A-HJ-NP-Z2-9]{4}$/);
  delete browser.protocol;
  delete node.protocol;
  assert.deepEqual(browser, node);
});
