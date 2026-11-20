/* Optional annual coverages catalog for insurance quotes. Prices are integer
   cents and display-only simulations. Exposed via module.exports in Node and
   as window.SegurosCoverages in the browser. */
(function (root) {
  'use strict';

  function coverage(id, name, priceCents, excludes) {
    return Object.freeze({
      id: id,
      name: name,
      priceCents: priceCents,
      excludes: Object.freeze(excludes || [])
    });
  }

  var COVERAGES = Object.freeze([
    coverage('assistencia-ilimitada', 'Assistência 24h ilimitada (guincho)', 24000),
    coverage('carro-reserva-7d', 'Carro reserva 7 dias', 19000, ['carro-reserva-15d']),
    coverage('carro-reserva-15d', 'Carro reserva 15 dias', 34000, ['carro-reserva-7d']),
    coverage('vidros-completo', 'Vidros completo', 21000),
    coverage('rcf-danos-terceiros', 'RCF danos a terceiros', 38000)
  ]);

  function listCoverages() {
    return COVERAGES.slice();
  }

  function getCoverageById(id) {
    var key = String(id == null ? '' : id).trim().toLowerCase();
    for (var i = 0; i < COVERAGES.length; i++) {
      if (COVERAGES[i].id === key) return COVERAGES[i];
    }
    return null;
  }

  // Returns the total in integer cents. Throws on non-array input, unknown or
  // duplicate ids, and mutually exclusive coverages selected together.
  function calculateCoveragesTotal(coverageIds) {
    if (coverageIds == null) return 0;
    if (!Array.isArray(coverageIds)) {
      throw new TypeError('coverageIds must be an array');
    }
    var seen = {};
    var total = 0;
    var i;
    for (i = 0; i < coverageIds.length; i++) {
      var found = getCoverageById(coverageIds[i]);
      if (!found) throw new RangeError('unknown coverage: ' + coverageIds[i]);
      if (seen[found.id]) throw new RangeError('duplicate coverage: ' + found.id);
      seen[found.id] = found;
      total += found.priceCents;
    }
    for (i = 0; i < coverageIds.length; i++) {
      var c = seen[getCoverageById(coverageIds[i]).id];
      for (var j = 0; j < c.excludes.length; j++) {
        if (seen[c.excludes[j]]) {
          throw new RangeError('mutually exclusive coverages: ' + c.id + ' and ' + c.excludes[j]);
        }
      }
    }
    return total;
  }

  var api = {
    listCoverages: listCoverages,
    getCoverageById: getCoverageById,
    calculateCoveragesTotal: calculateCoveragesTotal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SegurosCoverages = api;
})(typeof window !== 'undefined' ? window : this);
