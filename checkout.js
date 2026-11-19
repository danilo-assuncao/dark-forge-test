/* Simulated shipping for Dan Motors checkout. Exposed as window.DanCheckout;
   loaded after cart.js and before script.js. The fee depends only on the
   first digit of the 8-digit CEP (Brazilian postal region); nothing is sent
   anywhere. Amounts are BRL cents. */
(function () {
  'use strict';

  // First CEP digit -> { region, cents }.
  var REGIONS = {
    '0': { region: 'Grande São Paulo', cents: 1490 },
    '1': { region: 'Interior de São Paulo', cents: 1890 },
    '2': { region: 'Rio de Janeiro e Espírito Santo', cents: 2190 },
    '3': { region: 'Minas Gerais', cents: 2290 },
    '4': { region: 'Bahia e Sergipe', cents: 2990 },
    '5': { region: 'Nordeste', cents: 3290 },
    '6': { region: 'Norte e Nordeste', cents: 3890 },
    '7': { region: 'Centro-Oeste', cents: 2890 },
    '8': { region: 'Paraná e Santa Catarina', cents: 2490 },
    '9': { region: 'Rio Grande do Sul', cents: 2690 }
  };

  // Returns the CEP as 8 digits, or null when it is not a valid "12345678" / "12345-678".
  function normalizeCep(raw) {
    var value = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!/^\d{5}-?\d{3}$/.test(value)) {
      return null;
    }
    return value.replace('-', '');
  }

  // Returns { cep, region, cents } or null for an invalid CEP.
  function quote(raw) {
    var cep = normalizeCep(raw);
    if (!cep) {
      return null;
    }
    var entry = REGIONS[cep.charAt(0)];
    return { cep: cep, region: entry.region, cents: entry.cents };
  }

  window.DanCheckout = { normalizeCep: normalizeCep, quote: quote };
})();
