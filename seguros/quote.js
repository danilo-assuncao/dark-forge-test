/* Annual insurance premium quote: FIPE base rate × risk multiplier × bonus
   discount × deductible factor. All money values are integer cents and
   display-only simulations. Exposed via module.exports in Node and as
   window.SegurosQuote in the browser (requires window.SegurosVehicles). */
(function (root) {
  'use strict';

  var vehicles = typeof require === 'function' && typeof module !== 'undefined' && module.exports
    ? require('./vehicles.js')
    : root.SegurosVehicles;

  var BONUS_DISCOUNT_PER_CLASS = 0.03;
  var MAX_BONUS_CLASS = 10;

  // premiumFactor multiplies the premium; deductibleRate is a fraction of FIPE.
  var DEDUCTIBLES = Object.freeze({
    normal: Object.freeze({ id: 'normal', premiumFactor: 1.0, deductibleRate: 0.06 }),
    reduzida: Object.freeze({ id: 'reduzida', premiumFactor: 1.18, deductibleRate: 0.03 }),
    majorada: Object.freeze({ id: 'majorada', premiumFactor: 0.86, deductibleRate: 0.1 })
  });

  function bonusDiscount(bonusClass) {
    if (typeof bonusClass !== 'number' || !Number.isInteger(bonusClass) ||
        bonusClass < 0 || bonusClass > MAX_BONUS_CLASS) {
      throw new RangeError('bonusClass must be an integer between 0 and ' + MAX_BONUS_CLASS);
    }
    return Math.round(bonusClass * BONUS_DISCOUNT_PER_CLASS * 100) / 100;
  }

  function resolveDeductible(type) {
    if (typeof type === 'string' && Object.prototype.hasOwnProperty.call(DEDUCTIBLES, type)) {
      return DEDUCTIBLES[type];
    }
    throw new RangeError('deductibleType must be one of: ' + Object.keys(DEDUCTIBLES).join(', '));
  }

  function calculateBaseQuote(input) {
    var opts = input || {};
    var bonusClass = opts.bonusClass === undefined ? 0 : opts.bonusClass;
    var deductibleType = opts.deductibleType === undefined ? 'normal' : opts.deductibleType;

    var vehicle = vehicles.getVehicleById(opts.vehicleId);
    if (!vehicle) throw new RangeError('unknown vehicleId');

    var riskMultiplier = vehicles.resolveRiskMultiplier({
      driverAge: opts.driverAge,
      hasGarage: opts.hasGarage
    });
    var discount = bonusDiscount(bonusClass);
    var deductible = resolveDeductible(deductibleType);

    var basePremiumCents = Math.round(vehicle.fipeCents * vehicle.baseRate);
    var annualPremiumCents = Math.round(
      vehicle.fipeCents * vehicle.baseRate * riskMultiplier * (1 - discount) * deductible.premiumFactor
    );

    return {
      vehicleId: vehicle.id,
      fipeCents: vehicle.fipeCents,
      basePremiumCents: basePremiumCents,
      riskMultiplier: riskMultiplier,
      bonusClass: bonusClass,
      bonusDiscount: discount,
      deductibleType: deductible.id,
      deductiblePremiumFactor: deductible.premiumFactor,
      annualPremiumCents: annualPremiumCents,
      deductibleCents: Math.round(vehicle.fipeCents * deductible.deductibleRate)
    };
  }

  var api = {
    DEDUCTIBLES: DEDUCTIBLES,
    MAX_BONUS_CLASS: MAX_BONUS_CLASS,
    calculateBaseQuote: calculateBaseQuote
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SegurosQuote = api;
})(typeof window !== 'undefined' ? window : this);
