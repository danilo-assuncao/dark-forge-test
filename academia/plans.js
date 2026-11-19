/* Dan Fit gym plans: tiers (Start, Plus, Black Vip), billing cycles
   (Mensal, Semestral, Anual) and the DANFIT10 promo coupon. Prices are integer
   cents and display-only simulations. Exposed as window.DanFitPlans (and via
   module.exports in Node). */
(function (root) {
  'use strict';

  var CYCLES = Object.freeze({
    mensal: Object.freeze({ id: 'mensal', label: 'Mensal', months: 1, discountPct: 0 }),
    semestral: Object.freeze({ id: 'semestral', label: 'Semestral', months: 6, discountPct: 10 }),
    anual: Object.freeze({ id: 'anual', label: 'Anual', months: 12, discountPct: 20 })
  });

  // monthlyCents is the list price per month on the Mensal cycle.
  var PLANS = Object.freeze({
    start: Object.freeze({
      id: 'start', name: 'Start', monthlyCents: 8990,
      benefits: Object.freeze(['Acesso à musculação', 'Avaliação física inicial', 'Acesso das 6h às 22h'])
    }),
    plus: Object.freeze({
      id: 'plus', name: 'Plus', monthlyCents: 12990,
      benefits: Object.freeze(['Tudo do Start', 'Aulas coletivas ilimitadas', 'Acesso 24h', 'Traz 1 convidado por mês'])
    }),
    black_vip: Object.freeze({
      id: 'black_vip', name: 'Black Vip', monthlyCents: 19990,
      benefits: Object.freeze(['Tudo do Plus', 'Personal trainer 2x por mês', 'Armário fixo e toalhas', 'Acesso a todas as unidades', 'Convidados ilimitados'])
    })
  });

  // DANFIT10: 10% off the cycle price. Only valid on Semestral and Anual
  // (never stacks on Mensal) and cannot be combined with other coupons.
  var COUPON = Object.freeze({
    code: 'DANFIT10',
    discountPct: 10,
    validCycles: Object.freeze(['semestral', 'anual']),
    stackable: false
  });

  function lookup(table, id) {
    var key = String(id == null ? '' : id).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
  }

  function getPlan(id) { return lookup(PLANS, id); }
  function getCycle(id) { return lookup(CYCLES, id); }

  function normalizeCoupon(code) {
    return String(code == null ? '' : code).trim().toUpperCase();
  }

  // Integer percent discount, rounded half up, never negative.
  function pct(cents, p) { return Math.round((cents * p) / 100); }

  // Validates a coupon for a cycle: { valid, reason? }.
  function validateCoupon(code, cycleId) {
    var normalized = normalizeCoupon(code);
    if (!normalized) { return { valid: false, reason: 'empty' }; }
    if (normalized !== COUPON.code) { return { valid: false, reason: 'unknown' }; }
    var cycle = getCycle(cycleId);
    if (!cycle) { return { valid: false, reason: 'invalid_cycle' }; }
    if (COUPON.validCycles.indexOf(cycle.id) === -1) { return { valid: false, reason: 'cycle_not_eligible' }; }
    return { valid: true };
  }

  // Full price breakdown. Throws RangeError for unknown plan/cycle.
  function price(planId, cycleId, couponCode) {
    var plan = getPlan(planId);
    var cycle = getCycle(cycleId);
    if (!plan) { throw new RangeError('Unknown plan: ' + planId); }
    if (!cycle) { throw new RangeError('Unknown cycle: ' + cycleId); }

    var listCents = plan.monthlyCents * cycle.months;
    var cycleDiscountCents = pct(listCents, cycle.discountPct);
    var subtotalCents = listCents - cycleDiscountCents;

    var coupon = validateCoupon(couponCode, cycle.id);
    var couponDiscountCents = coupon.valid ? pct(subtotalCents, COUPON.discountPct) : 0;
    var totalCents = subtotalCents - couponDiscountCents;

    return {
      plan: plan.id,
      cycle: cycle.id,
      months: cycle.months,
      listCents: listCents,
      cycleDiscountCents: cycleDiscountCents,
      subtotalCents: subtotalCents,
      couponCode: coupon.valid ? COUPON.code : null,
      couponDiscountCents: couponDiscountCents,
      couponError: !coupon.valid && normalizeCoupon(couponCode) ? coupon.reason : null,
      totalCents: totalCents,
      perMonthCents: Math.round(totalCents / cycle.months)
    };
  }

  var api = {
    CYCLES: CYCLES,
    PLANS: PLANS,
    COUPON: COUPON,
    getPlan: getPlan,
    getCycle: getCycle,
    listPlans: function () { return Object.keys(PLANS).map(function (k) { return PLANS[k]; }); },
    listCycles: function () { return Object.keys(CYCLES).map(function (k) { return CYCLES[k]; }); },
    normalizeCoupon: normalizeCoupon,
    validateCoupon: validateCoupon,
    price: price
  };

  root.DanFitPlans = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
