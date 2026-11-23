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

// Tariff flag rates are R$ per 100 kWh, applied proportionally to total consumption.
// These values are a point-in-time snapshot.
export const TARIFF_RATES: Record<TariffFlag, number> = {
  green: 0,
  yellow: 1.885,
  red1: 4.463,
  red2: 7.877,
};

export const calculateMonthlyBill = (input: BillingInput): BillingResult => {
  if (!Number.isFinite(input.pricePerKwh) || input.pricePerKwh < 0) {
    throw new Error('Invalid pricePerKwh');
  }

  if (!(input.tariffFlag in TARIFF_RATES)) {
    throw new Error('Invalid tariff flag');
  }

  let totalKwh = 0;
  let highestConsumption = -1;
  let highestAppliance: ApplianceConsumption | undefined;

  for (const usage of input.usages) {
    if (!Number.isFinite(usage.hoursPerDay) || usage.hoursPerDay < 0 || usage.hoursPerDay > 24) {
      throw new Error(`Invalid hoursPerDay for appliance ${usage.applianceId}`);
    }
    if (!Number.isFinite(usage.daysPerMonth) || usage.daysPerMonth < 0 || usage.daysPerMonth > 31) {
      throw new Error(`Invalid daysPerMonth for appliance ${usage.applianceId}`);
    }

    const appliance = getApplianceById(usage.applianceId);
    if (!appliance) {
      throw new Error(`Unknown appliance ID: ${usage.applianceId}`);
    }

    const monthlyKwh = (appliance.powerWatts * usage.hoursPerDay * usage.daysPerMonth) / 1000;
    totalKwh += monthlyKwh;

    if (monthlyKwh > highestConsumption) {
      highestConsumption = monthlyKwh;
      highestAppliance = { appliance, monthlyKwh };
    }
  }

  const baseCost = totalKwh * input.pricePerKwh;
  const flagRate = TARIFF_RATES[input.tariffFlag];
  const flagCost = (totalKwh / 100) * flagRate;

  return {
    totalKwh,
    baseCost,
    flagCost,
    totalCost: baseCost + flagCost,
    highestConsumptionAppliance: highestAppliance,
  };
};
