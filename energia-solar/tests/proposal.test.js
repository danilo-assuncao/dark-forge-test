const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { buildSolarProposal } = require('../proposal');

test('buildSolarProposal - handles missing/invalid input', () => {
  assert.throws(() => buildSolarProposal(), Error); 
  assert.throws(() => buildSolarProposal(null), TypeError);
  assert.throws(() => buildSolarProposal([]), TypeError);
});

test('buildSolarProposal - valid PIX flow', () => {
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'pix'
  };

  const proposal = buildSolarProposal(input);
  
  assert.match(proposal.protocol, /^SOL-[0-9A-F]{8}$/);
  assert.ok(proposal.sizing.installedKwp > 0);
  assert.ok(proposal.savings.monthlySavingsBrl > 0);
  assert.strictEqual(proposal.financing.method, 'pix');
  assert.strictEqual(proposal.cashflowPositive, null);
});

test('buildSolarProposal - valid PRICE flow cashflow positive', () => {
  const input = {
    monthlyConsumptionKwh: 1000,
    region: 'nordeste',
    phaseType: 'trifasico',
    tariffBrlPerKwh: 1.50,
    method: 'price',
    months: 60
  };

  const proposal = buildSolarProposal(input);
  
  assert.strictEqual(proposal.financing.method, 'price');
  assert.strictEqual(proposal.cashflowPositive, true);
  assert.ok(proposal.financing.monthlyInstallment > 0);
  assert.ok(proposal.savings.monthlySavingsBrl >= proposal.financing.monthlyInstallment);
});

test('buildSolarProposal - valid PRICE flow cashflow negative', () => {
  const input = {
    monthlyConsumptionKwh: 200,
    region: 'sul',
    phaseType: 'monofasico',
    tariffBrlPerKwh: 0.50,
    method: 'price',
    months: 24
  };

  const proposal = buildSolarProposal(input);
  
  assert.strictEqual(proposal.financing.method, 'price');
  assert.strictEqual(proposal.cashflowPositive, false);
  assert.ok(proposal.financing.monthlyInstallment > proposal.savings.monthlySavingsBrl);
});

test('buildSolarProposal - exactly equal savings and installment boundary', () => {
  const baseInput = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 1.0, // calculate raw offset
    method: 'price',
    months: 60
  };

  const proposalBase = buildSolarProposal(baseInput);
  
  // To make installment == savings, set tariff = installment / offset
  const requiredTariff = proposalBase.financing.monthlyInstallment / proposalBase.savings.monthlySavingsBrl;
  
  const proposalEqual = buildSolarProposal({
    ...baseInput,
    tariffBrlPerKwh: requiredTariff
  });
  
  assert.strictEqual(proposalEqual.savings.monthlySavingsBrl, proposalEqual.financing.monthlyInstallment);
  assert.strictEqual(proposalEqual.cashflowPositive, true); // <= boundary yields true
});

test('buildSolarProposal - handles invalid inputs correctly', () => {
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: -100, region: 'sudeste' }), /Consumo mensal inválido/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'invalida' }), /Região inválida/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', method: 'boleto' }), /Invalid method/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', method: 'price', months: 12 }), /Invalid months/);
});

test('buildSolarProposal - uses coupon code and calculates generatedKwh', () => {
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'pix',
    couponCode: 'DANSOLAR5'
  };

  const proposal = buildSolarProposal(input);
  assert.ok(proposal.financing.principal < proposal.sizing.estimatedCost); 
  assert.ok(proposal.savings.monthlySavingsBrl > 0); 
});

test('buildSolarProposal - deterministic protocol stubbing', (t) => {
  t.mock.method(crypto, 'randomBytes', () => Buffer.from([0, 17, 34, 51]));
  
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'pix'
  };

  const proposal = buildSolarProposal(input);
  assert.strictEqual(proposal.protocol, 'SOL-00112233');
});
