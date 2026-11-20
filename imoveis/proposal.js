/* Imóveis proposal: handles simulated proposal submissions (contrapropostas)
   for listings, generating a printable structured summary. */
(function (root) {
  'use strict';

  var L = typeof module !== 'undefined' && module.exports ? require('./listings.js') : root.ImoveisListings;
  var V = typeof module !== 'undefined' && module.exports ? require('./visits.js') : root.ImoveisVisits;

  var CONDITIONS = [
    { id: 'vista', name: 'À vista' },
    { id: 'financiado', name: 'Financiamento' },
    { id: 'caucao', name: 'Caução' }
  ];

  function validateProposal(p) {
    var errors = {};
    p = p || {};
    
    var c = V.validateContact(p.contact);
    if (!c.ok) errors.contact = c.errors;
    
    var listing = L.byId(p.listingId);
    if (!listing) errors.listingId = 'Imóvel inválido ou não encontrado.';
    
    var cond = CONDITIONS.filter(function (x) { return x.id === p.condition; })[0];
    if (!cond) errors.condition = 'Condição de pagamento inválida.';
    
    var amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > (listing ? listing.price * 10 : 99999999999) || typeof p.amount === "boolean" || typeof p.amount === "object") {
      errors.amount = 'Valor proposto inválido.';
    }

    var ok = Object.keys(errors).length === 0;
    return {
      ok: ok,
      errors: errors,
      proposal: ok ? {
        protocol: V.formatProtocol(Math.floor(Math.random() * 10000)), // Simulate protocol
        listing: listing,
        contact: c.contact,
        condition: cond.id,
        conditionName: cond.name,
        amount: amount,
        date: new Date().toISOString()
      } : null
    };
  }

  // Pure function to generate printable summary data structure
  function generateSummary(proposal) {
    if (!proposal) return null;
    return {
      title: 'Proposta Comercial - ' + proposal.protocol,
      protocol: proposal.protocol,
      date: new Date(proposal.date).toLocaleDateString('pt-BR'),
      buyer: proposal.contact,
      property: {
        id: proposal.listing.id,
        title: proposal.listing.title,
        modality: proposal.listing.modality === 'venda' ? 'Venda' : 'Aluguel',
        price: L.formatBRL(proposal.listing.price)
      },
      offer: {
        condition: proposal.conditionName,
        amount: L.formatBRL(proposal.amount)
      }
    };
  }

  var api = {
    CONDITIONS: CONDITIONS,
    validateProposal: validateProposal,
    generateSummary: generateSummary
  };
  
  root.ImoveisProposal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
