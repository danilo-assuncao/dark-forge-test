/* Dan Fit enrollment simulator: net monthly fee, accumulated savings on the
   annual plan, DANFIT10 application and FIT-XXXX protocol codes. Amounts are
   integer cents and display-only. Depends on plans.js (window.DanFitPlans in
   the browser, require('./plans.js') in Node). Exposed as window.DanFitBilling
   and via module.exports in Node. */
(function (root) {
  'use strict';

  var plans = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./plans.js')
    : root.DanFitPlans;

  var PROTOCOL_PREFIX = 'FIT-';
  var PROTOCOL_RE = /^FIT-\d{4}$/;
  var MAX_PROTOCOL = 9999;

  // Enrollment quote: price breakdown plus the net monthly fee and the savings
  // versus paying the Mensal list price for the same number of months.
  // Throws RangeError for an unknown plan/cycle (via plans.price).
  function simulate(planId, cycleId, couponCode) {
    if (!plans) { throw new Error('billing.js requires plans.js to be loaded first'); }
    var plan = plans.getPlan(planId);
    var p = plans.price(planId, cycleId, couponCode);
    var baselineCents = plan.monthlyCents * p.months;
    return {
      plan: p.plan,
      cycle: p.cycle,
      months: p.months,
      couponCode: p.couponCode,
      couponError: p.couponError,
      listCents: p.listCents,
      cycleDiscountCents: p.cycleDiscountCents,
      couponDiscountCents: p.couponDiscountCents,
      totalCents: p.totalCents,
      netMonthlyCents: p.perMonthCents,
      savingsCents: baselineCents - p.totalCents
    };
  }

  // Net monthly fee in cents after cycle discount and (valid) coupon.
  function netMonthly(planId, cycleId, couponCode) {
    return simulate(planId, cycleId, couponCode).netMonthlyCents;
  }

  // Accumulated savings over the 12-month Anual plan versus 12 Mensal
  // payments, with an optional DANFIT10 coupon.
  function annualSavings(planId, couponCode) {
    var s = simulate(planId, 'anual', couponCode);
    return {
      plan: s.plan,
      months: s.months,
      mensalTotalCents: s.listCents,
      anualTotalCents: s.totalCents,
      savingsCents: s.savingsCents,
      monthlySavingsCents: Math.round(s.savingsCents / s.months),
      couponCode: s.couponCode
    };
  }

  // Formats a sequence number (1..9999) as FIT-XXXX. Throws RangeError otherwise.
  function formatProtocol(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_PROTOCOL) {
      throw new RangeError('Protocol number must be an integer between 1 and ' + MAX_PROTOCOL);
    }
    return PROTOCOL_PREFIX + ('0000' + n).slice(-4);
  }

  // The protocol is a non-secret, non-unique display reference (random over
  // only 9,999 values). Never use it as an access token or a unique key; if
  // uniqueness or unguessability is needed, assign sequence numbers server-side
  // and pair them with a separate secret.
  // Generates a protocol; `rng` (default Math.random) must return a value in
  // [0, 1). Out-of-range or non-finite values yield a RangeError.
  function generateProtocol(rng) {
    var r = typeof rng === 'function' ? rng() : Math.random();
    return formatProtocol(1 + Math.floor(r * MAX_PROTOCOL));
  }

  // Valid when it matches FIT-XXXX (case/space insensitive) with 0001-9999.
  function normalizeProtocol(code) {
    var c = String(code == null ? '' : code).trim().toUpperCase();
    return PROTOCOL_RE.test(c) && c !== PROTOCOL_PREFIX + '0000' ? c : null;
  }

  function isValidProtocol(code) { return normalizeProtocol(code) !== null; }

  var api = {
    simulate: simulate,
    netMonthly: netMonthly,
    annualSavings: annualSavings,
    formatProtocol: formatProtocol,
    generateProtocol: generateProtocol,
    normalizeProtocol: normalizeProtocol,
    isValidProtocol: isValidProtocol
  };

  root.DanFitBilling = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
