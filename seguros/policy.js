/* Simulated insurance proposals. Load vehicles.js, quote.js and coverages.js
   before this file in a browser. Money is represented in integer cents.
   Payload: quote inputs plus coverageIds, optional coupon, payment ('pix' or
   'credit'), and installments (defaults to 1; credit accepts 1..12).
   Each discount and IOF is rounded to cents before the next calculation. */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var quote = isNode ? require('./quote.js') : root.SegurosQuote;
  var coverages = isNode ? require('./coverages.js') : root.SegurosCoverages;

  function issuePolicyProposal(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TypeError('payload must be an object');
    }
    var payment = payload.payment;
    if (payment !== 'pix' && payment !== 'credit') {
      throw new RangeError('payment must be pix or credit');
    }
    var installments = payload.installments === undefined ? 1 : payload.installments;
    if (!Number.isInteger(installments) || installments < 1 || installments > 12 ||
        (payment === 'pix' && installments !== 1)) {
      throw new RangeError('installments must be 1 for pix or an integer between 1 and 12 for credit');
    }
    var coupon = payload.coupon === undefined ? '' : payload.coupon;
    if (typeof coupon !== 'string') throw new TypeError('coupon must be a string');
    coupon = coupon.trim().toUpperCase();
    if (coupon !== '' && coupon !== 'DANSEG10') throw new RangeError('unknown coupon');

    // The quote applies vehicle, age, garage, bonus and deductible factors.
    var baseQuote = quote.calculateBaseQuote(payload);
    var coveragesTotalCents = coverages.calculateCoveragesTotal(payload.coverageIds);
    var coverageIds = (payload.coverageIds || []).map(function (id) {
      return coverages.getCoverageById(id).id;
    });
    var subtotalCents = baseQuote.annualPremiumCents + coveragesTotalCents;
    var couponDiscountCents = coupon ? Math.round(subtotalCents * 10 / 100) : 0;
    var netSubtotalCents = subtotalCents - couponDiscountCents;
    var iofCents = Math.round(netSubtotalCents * 738 / 10000);
    var totalWithIofCents = netSubtotalCents + iofCents;
    var pixDiscountCents = payment === 'pix' ? Math.round(totalWithIofCents * 5 / 100) : 0;
    var totalCents = totalWithIofCents - pixDiscountCents;

    // Equal shares with unavoidable remainder cents assigned to the first
    // payments, preserving the exact total without interest or lost cents.
    var installmentCents = Math.floor(totalCents / installments);
    var remainder = totalCents % installments;
    var installmentAmountsCents = Array.from({ length: installments }, function (_, i) {
      return installmentCents + (i < remainder ? 1 : 0);
    });
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var protocol = 'APO-';
    for (var i = 0; i < 4; i++) {
      protocol += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    return {
      protocol: protocol,
      quote: baseQuote,
      vehicleId: baseQuote.vehicleId,
      coverageIds: coverageIds,
      basePremiumCents: baseQuote.annualPremiumCents,
      coveragesTotalCents: coveragesTotalCents,
      subtotalCents: subtotalCents,
      coupon: coupon,
      couponDiscountCents: couponDiscountCents,
      netSubtotalCents: netSubtotalCents,
      iofCents: iofCents,
      totalWithIofCents: totalWithIofCents,
      pixDiscountCents: pixDiscountCents,
      totalCents: totalCents,
      payment: payment,
      installments: installments,
      installmentAmountsCents: installmentAmountsCents
    };
  }

  var api = { issuePolicyProposal: issuePolicyProposal };
  if (isNode) module.exports = api;
  else root.SegurosPolicy = api;
})(typeof window !== 'undefined' ? window : this);
