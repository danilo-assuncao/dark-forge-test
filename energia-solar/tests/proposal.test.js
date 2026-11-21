const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { buildSolarProposal } = require('../proposal');

test('buildSolarProposal - handles missing/invalid input', () => {
  assert.throws(() => buildSolarProposal(), TypeError, /phaseType must be a string/);
  assert.throws(() => buildSolarProposal(null), TypeError);
  assert.throws(() => buildSolarProposal([]), TypeError);
  assert.throws(() => buildSolarProposal("string"), TypeError);
  assert.throws(() => buildSolarProposal(123), TypeError);
  
  // Missing/invalid phaseType and tariff
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', method: 'pix', tariffBrlPerKwh: 0.90 }), TypeError, /phaseType must be a string/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 123, tariffBrlPerKwh: 0.90 }), TypeError, /phaseType must be a string/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 'bifasico' }), TypeError, /tariffBrlPerKwh must be a positive number/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 'bifasico', tariffBrlPerKwh: -1 }), TypeError, /tariffBrlPerKwh must be a positive number/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 'bifasico', tariffBrlPerKwh: 0.90, couponCode: 123 }), TypeError, /couponCode must be a string/);
});

test('buildSolarProposal - valid PIX flow', () => {
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'pix'
  };

  const proposal1 = buildSolarProposal(input);
  const proposal2 = buildSolarProposal(input);
  
  assert.match(proposal1.protocol, /^SOL-[0-9A-F]{16}$/);
  assert.notStrictEqual(proposal1.protocol, proposal2.protocol); // F-d19a67 uniqueness
  
  assert.ok(proposal1.sizing.installedKwp > 0);
  assert.ok(proposal1.savings.monthlySavingsBrl > 0);
  assert.strictEqual(proposal1.financing.method, 'pix');
  assert.strictEqual(proposal1.cashflowPositive, null);
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

test('buildSolarProposal - handles missing method (defaults to PIX)', () => {
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90
  };

  const proposal = buildSolarProposal(input);
  assert.strictEqual(proposal.financing.method, 'pix');
  assert.strictEqual(proposal.cashflowPositive, null);
});

test('buildSolarProposal - handles consumption at or below grid minimum (0 savings)', () => {
  const input = {
    monthlyConsumptionKwh: 50, // bifasico min grid is 50
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'price',
    months: 60
  };

  const proposal = buildSolarProposal(input);
  assert.strictEqual(proposal.savings.monthlySavingsBrl, 0);
  assert.strictEqual(proposal.cashflowPositive, false); // Installment > 0
});

test('buildSolarProposal - equality boundary test with fixed epsilon assertions', () => {
  const baseInput = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 1.0, 
    method: 'price',
    months: 60
  };
  const proposalBase = buildSolarProposal(baseInput);
  
  const requiredTariff = proposalBase.financing.monthlyInstallment / (proposalBase.savings.monthlySavingsBrl / 1.0);
  
  const proposalPositive = buildSolarProposal({
    ...baseInput,
    tariffBrlPerKwh: requiredTariff + 0.0001
  });
  
  assert.strictEqual(proposalPositive.cashflowPositive, true);
  
  const proposalNegative = buildSolarProposal({
    ...baseInput,
    tariffBrlPerKwh: requiredTariff - 0.0001
  });
  
  assert.strictEqual(proposalNegative.cashflowPositive, false);
});

test('buildSolarProposal - handles invalid inputs correctly', () => {
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: -100, region: 'sudeste', phaseType: 'monofasico', tariffBrlPerKwh: 0.90 }), /Consumo mensal inválido/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'invalida', phaseType: 'monofasico', tariffBrlPerKwh: 0.90 }), /Região inválida/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 'monofasico', tariffBrlPerKwh: 0.90, method: 'boleto' }), /Invalid method/);
  assert.throws(() => buildSolarProposal({ monthlyConsumptionKwh: 500, region: 'sudeste', phaseType: 'monofasico', tariffBrlPerKwh: 0.90, method: 'price', months: 12 }), /Invalid months/);
});

test('buildSolarProposal - uses coupon code, checks payback selection and generatedKwh', () => {
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'price', 
    couponCode: 'DANSOLAR5'
  };

  const proposal = buildSolarProposal(input);
  
  assert.ok(proposal.financing.principal < proposal.sizing.estimatedCost); 
  
  const expectedSavings = 450 * 0.90;
  assert.strictEqual(proposal.savings.monthlySavingsBrl, expectedSavings);
  
  const expectedPayback = proposal.financing.total / expectedSavings;
  assert.strictEqual(proposal.savings.paybackMonths, expectedPayback);
  
  const pixProposal = buildSolarProposal({ ...input, method: 'pix' });
  const expectedPixPayback = pixProposal.financing.total / expectedSavings;
  assert.strictEqual(pixProposal.savings.paybackMonths, expectedPixPayback);
  
  const priceDefaultMonthsProposal = buildSolarProposal({ ...input, months: undefined });
  assert.strictEqual(priceDefaultMonthsProposal.financing.months, 48); 
});

test('buildSolarProposal - deterministic protocol stubbing', (t) => {
  t.mock.method(crypto, 'randomBytes', () => Buffer.from([0, 17, 34, 51, 68, 85, 102, 119]));
  
  const input = {
    monthlyConsumptionKwh: 500,
    region: 'sudeste',
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.90,
    method: 'pix'
  };

  const proposal = buildSolarProposal(input);
  assert.strictEqual(proposal.protocol, 'SOL-0011223344556677');
});
