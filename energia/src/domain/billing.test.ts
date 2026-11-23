import { describe, it, expect } from 'vitest';
import { calculateMonthlyBill, BillingInput, TARIFF_RATES } from './billing';
import { getApplianceById } from '../data/appliances';

describe('billing', () => {
  it('calculates monthly bill correctly without tariff flag extra', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '1', hoursPerDay: 24, daysPerMonth: 30 }, // 250W -> 250*24*30/1000 = 180kWh
        { applianceId: '3', hoursPerDay: 4, daysPerMonth: 30 },  // 150W -> 150*4*30/1000 = 18kWh
      ],
      pricePerKwh: 0.8,
      tariffFlag: 'green',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBe(198); // 180 + 18
    expect(result.baseCost).toBeCloseTo(198 * 0.8);
    expect(result.flagCost).toBe(0);
    expect(result.totalCost).toBeCloseTo(198 * 0.8);
    
    expect(result.highestConsumptionAppliance).toBeDefined();
    expect(result.highestConsumptionAppliance?.appliance).toEqual(getApplianceById('1'));
    expect(result.highestConsumptionAppliance?.monthlyKwh).toBe(180);
  });

  it('calculates monthly bill correctly with yellow tariff flag', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '4', hoursPerDay: 8, daysPerMonth: 30 }, // 1500W -> 1500*8*30/1000 = 360kWh
      ],
      pricePerKwh: 0.8,
      tariffFlag: 'yellow',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBe(360);
    expect(result.baseCost).toBeCloseTo(360 * 0.8);
    expect(result.flagCost).toBeCloseTo((360 / 100) * TARIFF_RATES.yellow);
    expect(result.totalCost).toBeCloseTo(360 * 0.8 + 3.6 * TARIFF_RATES.yellow);
  });

  it('calculates monthly bill correctly with red2 tariff flag and handles unknown appliance', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '5', hoursPerDay: 0.5, daysPerMonth: 30 }, // 5500W -> 5500*0.5*30/1000 = 82.5kWh
        { applianceId: 'unknown', hoursPerDay: 10, daysPerMonth: 30 }, // Should be ignored
      ],
      pricePerKwh: 0.5,
      tariffFlag: 'red2',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBe(82.5);
    expect(result.baseCost).toBeCloseTo(82.5 * 0.5);
    expect(result.flagCost).toBeCloseTo((82.5 / 100) * TARIFF_RATES.red2);
  });

  it('returns zeros for empty usage', () => {
    const input: BillingInput = {
      usages: [],
      pricePerKwh: 0.8,
      tariffFlag: 'red1',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBe(0);
    expect(result.baseCost).toBe(0);
    expect(result.flagCost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.highestConsumptionAppliance).toBeUndefined();
  });
});
