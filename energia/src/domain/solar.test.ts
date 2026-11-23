import { describe, it, expect } from 'vitest';
import { estimateSolarSystem } from './solar';

describe('Solar System Estimator', () => {
  it('should calculate the solar system properties correctly without coupon', () => {
    const input = {
      monthlyConsumptionKwh: 300,
      tariffValue: 1.0,
      generateProtocol: () => 'ENR-1234'
    };
    
    const result = estimateSolarSystem(input);
    
    expect(result.panelsCount).toBe(5);
    expect(result.systemSizeKw).toBeCloseTo(2.75);
    expect(result.estimatedGenerationKwh).toBeCloseTo(330);
    expect(result.totalCost).toBeCloseTo(11000);
    expect(result.netEconomyMonthly).toBeCloseTo(250);
    expect(result.paybackMonths).toBeCloseTo(44);
    expect(result.protocol).toBe('ENR-1234');
  });

  it('should apply the DANGRID5 coupon with 5% discount', () => {
    const input = {
      monthlyConsumptionKwh: 300,
      tariffValue: 1.0,
      coupon: 'DANGRID5'
    };
    
    const result = estimateSolarSystem(input);
    
    expect(result.totalCost).toBeCloseTo(10450);
    expect(result.paybackMonths).toBeCloseTo(41.8);
  });

  it('should ignore an unknown coupon', () => {
    const input = {
      monthlyConsumptionKwh: 300,
      tariffValue: 1.0,
      coupon: 'INVALID10'
    };
    
    const result = estimateSolarSystem(input);
    
    expect(result.totalCost).toBeCloseTo(11000); // No discount
  });

  it('should return Infinity for payback when there are no savings (consumption <= 50)', () => {
    const input = {
      monthlyConsumptionKwh: 40,
      tariffValue: 1.0,
    };
    
    const result = estimateSolarSystem(input);
    
    expect(result.netEconomyMonthly).toBe(0);
    expect(result.paybackMonths).toBe(Infinity);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('should throw an error if consumption is 0 or negative', () => {
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: 0, tariffValue: 1.0 }))
      .toThrow('Invalid monthly consumption');
      
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: -50, tariffValue: 1.0 }))
      .toThrow('Invalid monthly consumption');
      
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: NaN, tariffValue: 1.0 }))
      .toThrow('Invalid monthly consumption');
  });

  it('should throw an error if tariff value is 0 or negative', () => {
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: 100, tariffValue: 0 }))
      .toThrow('Invalid tariff value');
      
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: 100, tariffValue: -1.0 }))
      .toThrow('Invalid tariff value');
      
    expect(() => estimateSolarSystem({ monthlyConsumptionKwh: 100, tariffValue: NaN }))
      .toThrow('Invalid tariff value');
  });

  it('should properly handle consumption at the ceil boundary', () => {
    // 1 panel = 0.55 kWp. Generation = 0.55 * 120 = 66 kWh/month.
    const input = {
      monthlyConsumptionKwh: 66,
      tariffValue: 1.0,
    };
    
    const result = estimateSolarSystem(input);
    expect(result.panelsCount).toBe(1);
    expect(result.systemSizeKw).toBeCloseTo(0.55);
    expect(result.estimatedGenerationKwh).toBeCloseTo(66);
    expect(result.netEconomyMonthly).toBeCloseTo(16); // 66 - 50 = 16
  });
  
  it('should properly handle a very large consumption', () => {
    const input = {
      monthlyConsumptionKwh: 10000,
      tariffValue: 1.0,
    };
    
    const result = estimateSolarSystem(input);
    expect(result.panelsCount).toBe(152); // ceil((10000/120) / 0.55) = ceil(83.33 / 0.55) = ceil(151.51) = 152
    expect(result.systemSizeKw).toBeCloseTo(83.6); // 152 * 0.55
    expect(result.estimatedGenerationKwh).toBeCloseTo(10032); // 83.6 * 120
    expect(result.netEconomyMonthly).toBeCloseTo(9950); // min(10032, 10000) - 50 = 9950
  });
});
