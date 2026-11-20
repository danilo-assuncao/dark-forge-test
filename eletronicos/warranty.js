const WARRANTY_RATES = {
    12: 0.10,
    24: 0.20
};

const SHIPPING_REGIONS = [
    { from: 0, to: 3, name: 'Sudeste', baseCents: 1500, riskPercent: 0.01 },
    { from: 4, to: 5, name: 'Nordeste', baseCents: 3500, riskPercent: 0.02 },
    { from: 6, to: 7, name: 'Centro-Oeste/Norte', baseCents: 4500, riskPercent: 0.02 },
    { from: 8, to: 9, name: 'Sul', baseCents: 2500, riskPercent: 0.015 }
];

function normalizeCep(input) {
    if (input == null) return null;
    const digits = String(input).replace(/\D/g, '');
    return digits.length === 8 ? digits : null;
}

function calculateWarranty(subtotalCents, months) {
    if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
        throw new Error('Invalid subtotal');
    }
    const rate = WARRANTY_RATES[months];
    if (rate === undefined) {
        throw new Error('Invalid warranty months. Allowed: 12, 24.');
    }
    return Math.floor(subtotalCents * rate);
}

function calculateInsuredShipping(cepInput, subtotalCents) {
    if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
        throw new Error('Invalid subtotal');
    }
    const cep = normalizeCep(cepInput);
    if (!cep) {
        throw new Error('Invalid CEP');
    }
    const firstDigit = Number(cep.charAt(0));
    let region = null;
    for (let i = 0; i < SHIPPING_REGIONS.length; i++) {
        if (firstDigit >= SHIPPING_REGIONS[i].from && firstDigit <= SHIPPING_REGIONS[i].to) {
            region = SHIPPING_REGIONS[i];
            break;
        }
    }
    
    if (!region) {
        throw new Error('Region not found for CEP');
    }

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
