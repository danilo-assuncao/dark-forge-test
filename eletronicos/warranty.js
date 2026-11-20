const WARRANTY_RATES = new Map([
    [12, 0.10],
    [24, 0.20]
]);

const NORDESTE = { name: 'Nordeste', baseCents: 3500, riskPercent: 0.02 };

// CEP prefixes 60-65 (CE, PI, MA) belong to Nordeste even though the first digit 6 is otherwise Norte.
const PREFIX_OVERRIDES = new Map([
    ['60', NORDESTE], ['61', NORDESTE], ['62', NORDESTE],
    ['63', NORDESTE], ['64', NORDESTE], ['65', NORDESTE]
]);

const SHIPPING_REGIONS = [
    { from: 0, to: 3, name: 'Sudeste', baseCents: 1500, riskPercent: 0.01 },
    { from: 4, to: 5, ...NORDESTE },
    { from: 6, to: 7, name: 'Centro-Oeste/Norte', baseCents: 4500, riskPercent: 0.02 },
    { from: 8, to: 9, name: 'Sul', baseCents: 2500, riskPercent: 0.015 }
];

function normalizeCep(input) {
    if (typeof input !== 'string' || !/^\d{5}-?\d{3}$/.test(input)) return null;
    return input.replace('-', '');
}

function calculateWarranty(subtotalCents, months) {
    if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
        throw new Error('Invalid subtotal');
    }
    const rate = typeof months === 'number' ? WARRANTY_RATES.get(months) : undefined;
    if (rate === undefined) {
        throw new Error('Invalid warranty months. Allowed: 12, 24.');
    }
    return Math.floor(subtotalCents * rate);
}

function calculateInsuredShipping(cepInput, subtotalCents) {
    if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
        throw new Error('Invalid subtotal');
    }
    const cep = normalizeCep(cepInput);
    if (!cep) {
        throw new Error('Invalid CEP');
    }
    const firstDigit = Number(cep.charAt(0));
    // The table covers digits 0-9, so a match always exists for a validated CEP.
    const region = PREFIX_OVERRIDES.get(cep.slice(0, 2)) ||
        SHIPPING_REGIONS.find((r) => firstDigit >= r.from && firstDigit <= r.to);

    const insuranceCents = Math.floor(subtotalCents * region.riskPercent);
    const totalCents = region.baseCents + insuranceCents;

    return {
        cep,
        region: region.name,
        baseCents: region.baseCents,
        insuranceCents,
        totalCents
    };
}

module.exports = {
    calculateWarranty,
    calculateInsuredShipping
};
