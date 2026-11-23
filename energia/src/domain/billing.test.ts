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

    expect(result.totalKwh).toBeCloseTo(198); // 180 + 18
    expect(result.baseCost).toBeCloseTo(198 * 0.8);
    expect(result.flagCost).toBeCloseTo(0);
    expect(result.totalCost).toBeCloseTo(198 * 0.8);
    
    expect(result.highestConsumptionAppliance).toBeDefined();
    expect(result.highestConsumptionAppliance?.appliance).toEqual(getApplianceById('1'));
    expect(result.highestConsumptionAppliance?.monthlyKwh).toBeCloseTo(180);
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

    expect(result.totalKwh).toBeCloseTo(360);
    expect(result.baseCost).toBeCloseTo(360 * 0.8);
    expect(result.flagCost).toBeCloseTo((360 / 100) * TARIFF_RATES.yellow);
    expect(result.totalCost).toBeCloseTo(360 * 0.8 + 3.6 * TARIFF_RATES.yellow);
  });

  it('calculates monthly bill correctly with red1 tariff flag', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '2', hoursPerDay: 1, daysPerMonth: 20 }, // 1200W -> 1200*1*20/1000 = 24kWh
      ],
      pricePerKwh: 0.9,
      tariffFlag: 'red1',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBeCloseTo(24);
    expect(result.baseCost).toBeCloseTo(24 * 0.9);
    expect(result.flagCost).toBeCloseTo((24 / 100) * TARIFF_RATES.red1);
    expect(result.totalCost).toBeCloseTo(24 * 0.9 + 0.24 * TARIFF_RATES.red1);
  });

  it('calculates monthly bill correctly with red2 tariff flag', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '5', hoursPerDay: 0.5, daysPerMonth: 30 }, // 5500W -> 5500*0.5*30/1000 = 82.5kWh
      ],
      pricePerKwh: 0.5,
      tariffFlag: 'red2',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBeCloseTo(82.5);
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

    expect(result.totalKwh).toBeCloseTo(0);
    expect(result.baseCost).toBeCloseTo(0);
    expect(result.flagCost).toBeCloseTo(0);
    expect(result.totalCost).toBeCloseTo(0);
    expect(result.highestConsumptionAppliance).toBeUndefined();
  });

  it('handles zero usage for hours or days properly', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '1', hoursPerDay: 0, daysPerMonth: 30 }, 
        { applianceId: '3', hoursPerDay: 4, daysPerMonth: 0 },
      ],
      pricePerKwh: 0.8,
      tariffFlag: 'green',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBeCloseTo(0);
    expect(result.baseCost).toBeCloseTo(0);
    expect(result.flagCost).toBeCloseTo(0);
    expect(result.totalCost).toBeCloseTo(0);
    
    // First appliance with 0 consumption will be highest (since initialized to -1)
    expect(result.highestConsumptionAppliance).toBeDefined();
    expect(result.highestConsumptionAppliance?.monthlyKwh).toBeCloseTo(0);
  });

  it('breaks ties for highest consumption by keeping the first evaluated', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: '1', hoursPerDay: 1, daysPerMonth: 10 }, // 250W -> 2.5kWh
        { applianceId: '3', hoursPerDay: 5, daysPerMonth: 10 }, // 150W -> 7.5kWh
        { applianceId: '2', hoursPerDay: 1, daysPerMonth: 6.25 }, // 1200W -> 7.5kWh
      ],
      pricePerKwh: 0.8,
      tariffFlag: 'green',
    };

    const result = calculateMonthlyBill(input);

    expect(result.totalKwh).toBeCloseTo(17.5); // 2.5 + 7.5 + 7.5
    expect(result.highestConsumptionAppliance).toBeDefined();
    expect(result.highestConsumptionAppliance?.appliance.id).toBe('3');
    expect(result.highestConsumptionAppliance?.monthlyKwh).toBeCloseTo(7.5);
  });

  it('throws an error for unknown appliance', () => {
    const input: BillingInput = {
      usages: [
        { applianceId: 'unknown', hoursPerDay: 10, daysPerMonth: 30 },
      ],
      pricePerKwh: 0.5,
      tariffFlag: 'red2',
    };

    expect(() => calculateMonthlyBill(input)).toThrow('Unknown appliance ID: unknown');
  });

  it('throws an error for negative or invalid pricePerKwh', () => {
    const input: BillingInput = {
      usages: [],
      pricePerKwh: -0.5,
      tariffFlag: 'green',
    };

    expect(() => calculateMonthlyBill(input)).toThrow('Invalid pricePerKwh');

    input.pricePerKwh = NaN;
    expect(() => calculateMonthlyBill(input)).toThrow('Invalid pricePerKwh');
  });

  it('throws an error for invalid tariffFlag', () => {
    const input: BillingInput = {
      usages: [],
      pricePerKwh: 0.5,
      tariffFlag: 'blue' as any,
    };

    expect(() => calculateMonthlyBill(input)).toThrow('Invalid tariff flag');
  });

  it('throws an error for negative or out-of-range hoursPerDay', () => {
    const input: BillingInput = {
      usages: [{ applianceId: '1', hoursPerDay: -1, daysPerMonth: 30 }],
      pricePerKwh: 0.5,
      tariffFlag: 'green',
    };

    expect(() => calculateMonthlyBill(input)).toThrow('Invalid hoursPerDay for appliance 1');

    input.usages[0].hoursPerDay = 25;
    expect(() => calculateMonthlyBill(input)).toThrow('Invalid hoursPerDay for appliance 1');
  });

  it('throws an error for negative or out-of-range daysPerMonth', () => {
    const input: BillingInput = {
      usages: [{ applianceId: '1', hoursPerDay: 10, daysPerMonth: -1 }],
      pricePerKwh: 0.5,
      tariffFlag: 'green',
    };

    expect(() => calculateMonthlyBill(input)).toThrow('Invalid daysPerMonth for appliance 1');

    input.usages[0].daysPerMonth = 32;
    expect(() => calculateMonthlyBill(input)).toThrow('Invalid daysPerMonth for appliance 1');
  });
});
