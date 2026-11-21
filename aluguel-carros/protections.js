const PROTECTION_PLANS = Object.freeze(Object.assign(Object.create(null), {
  'nenhuma': 0,
  'basica': 29,
  'completa': 54
}));

const ADDONS = Object.freeze(Object.assign(Object.create(null), {
  'cadeirinha-bebe': { price: 18, type: 'per_day' },
  'condutor-adicional': { price: 22, type: 'per_day' },
  'tag-pedagio': { price: 25, type: 'flat' }
}));

export function listAddons() {
  return Object.keys(ADDONS).map(id => ({
    id,
    ...ADDONS[id]
  }));
}

export function calculateProtectionAndAddons({ protectionPlan = 'basica', addonIds = [], days }) {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error('days must be an integer between 1 and 60');
  }

  if (!Object.hasOwn(PROTECTION_PLANS, protectionPlan)) {
    throw new Error('invalid protection plan');
  }

  if (!Array.isArray(addonIds)) {
    throw new TypeError('addonIds must be an array');
  }

  const uniqueAddonIds = new Set(addonIds);

  let total = PROTECTION_PLANS[protectionPlan] * days;

  for (const addonId of uniqueAddonIds) {
    if (!Object.hasOwn(ADDONS, addonId)) {
      throw new Error(`invalid addon: ${addonId}`);
    }
    const addon = ADDONS[addonId];
    if (addon.type === 'per_day') {
      total += addon.price * days;
    } else if (addon.type === 'flat') {
      total += addon.price;
    }
  }

  return total;
}
