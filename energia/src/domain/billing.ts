import { ApplianceUsage, TariffFlag, ApplianceItem } from '../types';
import { getApplianceById } from '../data/appliances';

export interface BillingInput {
  usages: ApplianceUsage[];
  pricePerKwh: number;
  tariffFlag: TariffFlag;
}

export interface ApplianceConsumption {
  appliance: ApplianceItem;
  monthlyKwh: number;
}

export interface BillingResult {
  totalKwh: number;
  baseCost: number;
  flagCost: number;
  totalCost: number;
  highestConsumptionAppliance?: ApplianceConsumption;
}

export const TARIFF_RATES: Record<TariffFlag, number> = {
  green: 0,
  yellow: 1.885,
  red1: 4.463,
  red2: 7.877,
};

export const calculateMonthlyBill = (input: BillingInput): BillingResult => {
  let totalKwh = 0;
  let highestConsumption = -1;
  let highestAppliance: ApplianceConsumption | undefined;

  for (const usage of input.usages) {
    const appliance = getApplianceById(usage.applianceId);
    if (!appliance) continue;

    const monthlyKwh = (appliance.powerWatts * usage.hoursPerDay * usage.daysPerMonth) / 1000;
    totalKwh += monthlyKwh;

    if (monthlyKwh > highestConsumption) {
      highestConsumption = monthlyKwh;
      highestAppliance = { appliance, monthlyKwh };
    }
  }

  const baseCost = totalKwh * input.pricePerKwh;
  // Tariff flags are usually charged per 100 kWh
  // We use Math.floor to know how many full 100 kWh blocks, or is it proportional?
  // According to ANEEL, it's per 100 kWh consumed (proportional actually, but strictly speaking it's a value per 100 kWh, meaning rate/100 per kWh).
  // Let's do (totalKwh / 100) * TARIFF_RATES[input.tariffFlag] for proportional, as it's the standard calculation.
  const flagRate = TARIFF_RATES[input.tariffFlag] ?? 0;
  const flagCost = (totalKwh / 100) * flagRate;

  return {
    totalKwh,
    baseCost,
    flagCost,
    totalCost: baseCost + flagCost,
    highestConsumptionAppliance: highestAppliance,
  };
};
