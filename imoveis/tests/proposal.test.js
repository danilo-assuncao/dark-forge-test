'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../listings.js');
const P = require('../proposal.js');

test('has required CONDITIONS', () => {
  assert.ok(P.CONDITIONS.find(c => c.id === 'vista'), 'missing vista');
  assert.ok(P.CONDITIONS.find(c => c.id === 'financiado'), 'missing financiado');
  assert.ok(P.CONDITIONS.find(c => c.id === 'caucao'), 'missing caucao');
});

test('rejects proposal without listing', () => {
  const res = P.validateProposal({});
  assert.equal(res.ok, false);
  assert.equal(res.errors.listingId, 'Imóvel inválido ou não encontrado.');
});

test('validates correct proposal', () => {
  const res = P.validateProposal({
    listingId: 'apt-001',
    condition: 'vista',
    amount: '500000',
    contact: { name: 'João Silva', email: 'joao@example.com', phone: '11987654321' }
  });
  assert.equal(res.ok, true);
  assert.ok(res.proposal);
  assert.ok(res.proposal.protocol.startsWith('IMOB-'));
  assert.equal(res.proposal.condition, 'vista');
  assert.equal(res.proposal.amount, 500000);
});

test('generates summary data', () => {
  const res = P.validateProposal({
    listingId: 'apt-001',
    condition: 'financiado',
    amount: 450000,
    contact: { name: 'Maria Souza', email: 'maria@example.com', phone: '21987654321' }
  });
  const sum = P.generateSummary(res.proposal);
  assert.ok(sum.title.startsWith('Proposta Comercial - IMOB-'));
  assert.equal(sum.buyer.name, 'Maria Souza');
  assert.equal(sum.offer.condition, 'Financiamento');
  assert.equal(sum.offer.amount, L.formatBRL(450000));
});
