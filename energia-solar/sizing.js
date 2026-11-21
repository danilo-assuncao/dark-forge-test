const HSP = Object.freeze(Object.assign(Object.create(null), {
  'nordeste': 5.4,
  'centro-oeste': 5.1,
  'sudeste': 4.8,
  'norte': 4.6,
  'sul': 4.2
}));

const CONSTANTS = {
  DAYS_IN_MONTH: 30,
  PERFORMANCE_RATIO: 0.78,
  PANEL_KWP: 0.55,
  PANEL_AREA: 2.6,
  COST_PER_KWP: 3900
};

function calculateSolarSizing({ monthlyConsumptionKwh, region }) {
  if (typeof monthlyConsumptionKwh !== 'number' || !Number.isFinite(monthlyConsumptionKwh) || monthlyConsumptionKwh <= 0) {
    throw new Error('Consumo mensal inválido');
  }

  if (typeof region !== 'string') {
    throw new Error('Região inválida');
  }

  const hsp = HSP[region.trim().toLowerCase()];
  if (!hsp) {
    throw new Error('Região inválida');
  }

  // requiredKwp is rounded to 6 decimal places to prevent float noise around Math.ceil boundaries
  const rawRequiredKwp = monthlyConsumptionKwh / (CONSTANTS.DAYS_IN_MONTH * hsp * CONSTANTS.PERFORMANCE_RATIO);
  const requiredKwp = Number(rawRequiredKwp.toFixed(6));
  
  const panels = Math.ceil(Number((requiredKwp / CONSTANTS.PANEL_KWP).toFixed(6)));
  const installedKwp = Number((panels * CONSTANTS.PANEL_KWP).toFixed(2));
  const roofArea = Number((panels * CONSTANTS.PANEL_AREA).toFixed(2));
  
  const estimatedCost = Number((installedKwp * CONSTANTS.COST_PER_KWP).toFixed(2));

  return {
    requiredKwp,
    panels,
    installedKwp,
    roofArea,
    estimatedCost
  };
}

module.exports = { calculateSolarSizing };
