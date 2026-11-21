const HSP = {
  'nordeste': 5.4,
  'centro-oeste': 5.1,
  'sudeste': 4.8,
  'norte': 4.6,
  'sul': 4.2
};

function calculateSolarSizing({ monthlyConsumptionKwh, region }) {
  const hsp = HSP[region.toLowerCase()];
  if (!hsp) {
    throw new Error('Região inválida');
  }

  const performanceRatio = 0.78;
  const requiredKwp = monthlyConsumptionKwh / (30 * hsp * performanceRatio);
  
  const panelKwp = 0.55;
  const panelArea = 2.6;
  const panels = Math.ceil(requiredKwp / panelKwp);
  const installedKwp = Number((panels * panelKwp).toFixed(2));
  const roofArea = Number((panels * panelArea).toFixed(2));
  
  // custo base instalado R$ 3.900,00 por kWp instalado
  const estimatedCost = Number((installedKwp * 3900).toFixed(2));

  return {
    requiredKwp,
    panels,
    installedKwp,
    roofArea,
    estimatedCost
  };
}

module.exports = { calculateSolarSizing };
