/* Reference FIPE table for insurance quotes: vehicle models by category with
   the annual base rate, plus driver-age and garage risk factors. FIPE values
   are integer cents and display-only simulations. Exposed via module.exports
   in Node and as window.SegurosVehicles in the browser. */
(function (root) {
  'use strict';

  // Annual base rate as a fraction of the FIPE value.
  var CATEGORIES = Object.freeze({
    hatch: Object.freeze({ id: 'hatch', label: 'Hatch', baseRate: 0.045 }),
    sedan: Object.freeze({ id: 'sedan', label: 'Sedã', baseRate: 0.05 }),
    suv: Object.freeze({ id: 'suv', label: 'SUV', baseRate: 0.058 }),
    eletrico: Object.freeze({ id: 'eletrico', label: 'Elétrico', baseRate: 0.042 })
  });

  function vehicle(id, name, category, fipeCents) {
    return Object.freeze({
      id: id,
      name: name,
      category: category,
      fipeCents: fipeCents,
      baseRate: CATEGORIES[category].baseRate
    });
  }

  var VEHICLES = Object.freeze([
    vehicle('hatch-compacto', 'Hatch Compacto 1.0', 'hatch', 7500000),
    vehicle('hatch-premium', 'Hatch Premium 1.4 Turbo', 'hatch', 11000000),
    vehicle('sedan-medio', 'Sedã Médio 2.0', 'sedan', 12500000),
    vehicle('sedan-executivo', 'Sedã Executivo 2.0 Turbo', 'sedan', 21000000),
    vehicle('suv-compacto', 'SUV Compacto 1.3 Turbo', 'suv', 14500000),
    vehicle('suv-grande', 'SUV Grande 3.0 Diesel', 'suv', 32000000),
    vehicle('eletrico-urbano', 'Elétrico Urbano', 'eletrico', 15000000),
    vehicle('eletrico-premium', 'Elétrico Premium', 'eletrico', 29000000)
  ]);

  var GARAGE_FACTOR = 0.92;
  var NO_GARAGE_FACTOR = 1.0;

  function listVehicles() {
    return VEHICLES.slice();
  }

  function getVehicleById(id) {
    var key = String(id == null ? '' : id).trim().toLowerCase();
    for (var i = 0; i < VEHICLES.length; i++) {
      if (VEHICLES[i].id === key) return VEHICLES[i];
    }
    return null;
  }

  function ageFactor(age) {
    if (typeof age !== 'number' || !Number.isInteger(age) || age < 18 || age > 85) {
      throw new RangeError('driverAge must be an integer between 18 and 85');
    }
    if (age <= 24) return 1.35;
    if (age <= 59) return 1.0;
    return 1.12;
  }

  // Combined multiplier = age factor × garage factor, rounded to 4 decimals
  // to avoid floating-point noise (e.g. 1.35 × 0.92 = 1.242).
  function resolveRiskMultiplier(input) {
    var opts = input || {};
    var age = ageFactor(opts.driverAge);
    var garage = opts.hasGarage === true ? GARAGE_FACTOR : NO_GARAGE_FACTOR;
    return Math.round(age * garage * 10000) / 10000;
  }

  var api = {
    CATEGORIES: CATEGORIES,
    listVehicles: listVehicles,
    getVehicleById: getVehicleById,
    resolveRiskMultiplier: resolveRiskMultiplier
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SegurosVehicles = api;
})(typeof window !== 'undefined' ? window : this);
