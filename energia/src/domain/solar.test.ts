import { describe, it, expect } from 'vitest';
import { estimateSolarSystem } from './solar';

describe('Solar System Estimator', () => {
  it('should calculate the solar system properties correctly without coupon', () => {
    const input = {
      monthlyConsumptionKwh: 300,
      tariffValue: 1.0, // R$ 1.00 / kWh
    };
    
    // requiredKwp = 300 / 120 = 2.5
    // panels = ceil(2.5 / 0.55) = 5
    // systemSizeKw = 5 * 0.55 = 2.75
    // estimatedGen = 2.75 * 120 = 330
    // totalCost = 2.75 * 4000 = 11000
    // offsetableKwh = min(330, 300) = 300
    // discountedConsumption = 300 - 50 = 250
    // netEconomyMonthly = 250 * 1 = 250
    // paybackMonths = 11000 / 250 = 44
    
    const result = estimateSolarSystem(input);
    
    expect(result.panelsCount).toBe(5);
    expect(result.systemSizeKw).toBe(2.75);
    expect(result.estimatedGenerationKwh).toBe(330);
    expect(result.totalCost).toBe(11000);
    expect(result.netEconomyMonthly).toBe(250);
    expect(result.paybackMonths).toBe(44);
    expect(result.protocol).toMatch(/^ENR-\d{4}$/);
  });

  it('should apply the DANGRID5 coupon with 5% discount', () => {
    const input = {
      monthlyConsumptionKwh: 300,
      tariffValue: 1.0,
      coupon: 'DANGRID5'
    };
    
    const result = estimateSolarSystem(input);
    
    // 11000 * 0.95 = 10450
    // paybackMonths = 10450 / 250 = 41.8
    expect(result.totalCost).toBe(10450);
    expect(result.paybackMonths).toBe(41.8);
  });

  it('should handle consumption below minimum fee correctly', () => {
    const input = {
      monthlyConsumptionKwh: 40,
      tariffValue: 1.0,
    };
    
    const result = estimateSolarSystem(input);
    
    expect(result.netEconomyMonthly).toBe(0);
    expect(result.paybackMonths).toBe(0);
  });
});
