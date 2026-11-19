/* Imóveis mortgage simulator: financed amount, SAC (first/last installment,
   decreasing) vs Price (fixed installment), total cost and recommended family
   income. Money is in BRL cents; rates are nominal annual percentages
   (e.g. 10.5 = 10.5% a.a.) converted to an effective monthly rate. Exposed as
   window.ImoveisMortgage in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var SYSTEMS = [
    { id: 'sac', name: 'SAC' },
    { id: 'price', name: 'Price' },
  ];

  // Share of gross family income that may go to the first installment.
  var INCOME_COMMITMENT = 0.3;

  function isMoney(n) { return typeof n === 'number' && isFinite(n) && n >= 0; }

  function monthlyRate(annualPercent) {
    return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
  }

  function financedAmount(price, down) {
    if (!isMoney(price) || !isMoney(down)) throw new RangeError('price and down must be non-negative finite numbers');
    if (down > price) throw new RangeError('down payment exceeds price');
    return Math.round(price) - Math.round(down);
  }

  function priceInstallment(financed, rate, months) {
    if (financed === 0) return 0;
    if (rate === 0) return Math.round(financed / months);
    return Math.round(financed * rate / (1 - Math.pow(1 + rate, -months)));
  }

  // Returns [{ n, installment, interest, amortization, balance }] in cents.
  function schedule(system, financed, annualPercent, months) {
    if (system !== 'sac' && system !== 'price') throw new RangeError('unknown system: ' + system);
    if (!isMoney(financed)) throw new RangeError('invalid financed amount');
    if (!isMoney(annualPercent)) throw new RangeError('invalid annual rate');
    if (typeof months !== 'number' || !isFinite(months) || months < 1 || Math.floor(months) !== months) {
      throw new RangeError('months must be a positive integer');
    }
    var rate = monthlyRate(annualPercent);
    var rows = [];
    var balance = financed;
    var fixed = priceInstallment(financed, rate, months);
    var sacAmort = financed / months;
    for (var n = 1; n <= months; n++) {
      var interest = Math.round(balance * rate);
      var amort;
      if (n === months) amort = balance; // clear rounding residue
      else amort = system === 'sac' ? Math.round(sacAmort) : fixed - interest;
      if (amort > balance) amort = balance;
      balance -= amort;
      rows.push({ n: n, installment: amort + interest, interest: interest, amortization: amort, balance: balance });
    }
    return rows;
  }

  function summarize(rows, financed) {
    var total = rows.reduce(function (s, r) { return s + r.installment; }, 0);
    return {
      first: rows[0].installment,
      last: rows[rows.length - 1].installment,
      total: total,
      interest: total - financed,
      recommendedIncome: Math.ceil(rows[0].installment / INCOME_COMMITMENT),
    };
  }

  // opts: { price, down, annualRate (percent), months }
  function simulate(opts) {
    opts = opts || {};
    var financed = financedAmount(opts.price, opts.down);
    var out = { financed: financed, months: opts.months, annualRate: opts.annualRate };
    SYSTEMS.forEach(function (s) {
      out[s.id] = summarize(schedule(s.id, financed, opts.annualRate, opts.months), financed);
    });
    out.sacSavings = out.price.total - out.sac.total;
    return out;
  }

  var api = {
    SYSTEMS: SYSTEMS, INCOME_COMMITMENT: INCOME_COMMITMENT, monthlyRate: monthlyRate,
    financedAmount: financedAmount, schedule: schedule, simulate: simulate,
  };
  root.ImoveisMortgage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
