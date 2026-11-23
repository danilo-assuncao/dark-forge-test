import { SolarQuote } from '../types';

export interface SolarInput {
  monthlyConsumptionKwh: number;
  tariffValue: number;
  coupon?: string;
  generateProtocol?: () => string;
}

export interface SolarEstimate extends SolarQuote {
  protocol: string;
  panelsCount: number;
  netEconomyMonthly: number;
}

export function estimateSolarSystem(input: SolarInput): SolarEstimate {
  // Base configuration
  const PANEL_POWER_KW = 0.55; // 550W
  const AVG_GENERATION_PER_KWP = 120; // 120 kWh/month per kWp
  const COST_PER_KWP = 4000; // base estimate
  const MINIMUM_FEE_KWH = 50; // discount 50 kWh


  const { monthlyConsumptionKwh, tariffValue, coupon, generateProtocol } = input;

  if (!Number.isFinite(monthlyConsumptionKwh) || monthlyConsumptionKwh <= 0) {
    throw new Error('Invalid monthly consumption');
  }
  if (!Number.isFinite(tariffValue) || tariffValue <= 0) {
    throw new Error('Invalid tariff value');
  }


  // Required size to match consumption
  const requiredKwp = monthlyConsumptionKwh / AVG_GENERATION_PER_KWP;
  
  // Calculate panels (550W each)
  const panelsCount = Math.ceil(requiredKwp / PANEL_POWER_KW);
  
  // Real system size
  const systemSizeKw = panelsCount * PANEL_POWER_KW;
  
  // Estimated generation
  const estimatedGenerationKwh = systemSizeKw * AVG_GENERATION_PER_KWP;

  // Total cost
  let totalCost = systemSizeKw * COST_PER_KWP;

  if (coupon === 'DANGRID5') {
    totalCost = totalCost * 0.95; // 5% discount
  }

  // Net economy discounting 50 kWh
  // We assume the system generates enough to offset the consumption minus 50kWh
  const offsetableKwh = Math.min(estimatedGenerationKwh, monthlyConsumptionKwh);
  const discountedConsumption = Math.max(0, offsetableKwh - MINIMUM_FEE_KWH);
  const netEconomyMonthly = discountedConsumption * tariffValue;

  // Payback in months
  const paybackMonths = netEconomyMonthly > 0 ? totalCost / netEconomyMonthly : Infinity;

  // Protocol generation: ENR-XXXX
  const generator = generateProtocol || (() => `ENR-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const protocol = generator();

  return {
    protocol,
    systemSizeKw,
    estimatedGenerationKwh,
    totalCost,
    paybackMonths,
    panelsCount,
    netEconomyMonthly
  };
}
