import { describe, it, expect } from 'vitest';
import { finalizeTripCheckout } from './miles';
import type { TravelDestination } from '../types';

describe('finalizeTripCheckout', () => {
  const baseDestination: TravelDestination = {
    id: '1',
    name: 'Test',
    scope: 'nacional',
    description: 'Test',
    price: 1000,
    availableCabins: ['economica'],
    excursions: []
  };

  it('should discount R$ 25 for every 1000 miles', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 2000
    });
    expect(result.milesDiscount).toBe(50);
    expect(result.finalValue).toBe(950);
  });

  it('should limit miles discount to 50% of the package value', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination, // R$ 1000
      miles: 40000 // 40 * 25 = 1000, but limit is 500
    });
    expect(result.milesDiscount).toBe(500);
    expect(result.finalValue).toBe(500);
  });

  it('should require travel insurance for international trips', () => {
    expect(() => {
      finalizeTripCheckout({
        destination: { ...baseDestination, scope: 'internacional' },
        miles: 0,
        hasTravelInsurance: false
      });
    }).toThrow('Seguro viagem é obrigatório para viagens internacionais');
  });

  it('should calculate exchange rate estimate for international trips', () => {
    const result = finalizeTripCheckout({
      destination: { ...baseDestination, scope: 'internacional' },
      miles: 0,
      hasTravelInsurance: true,
      exchangeRate: 5
    });
    expect(result.insuranceRequired).toBe(true);
    expect(result.exchangeEstimate).toBe(200); // 1000 / 5
  });

  it('should apply 10% coupon on balance and emit locator', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 2000, // discount 50, balance 950
      coupon: ' DANTRIP10 '
    });
    expect(result.couponDiscount).toBe(95); // 10% of 950
    expect(result.finalValue).toBe(855); // 950 - 95
    expect(result.locator).toMatch(/^TRP-[A-Z0-9]{4}$/);
  });

  it('should emit locator even without coupon', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 0,
    });
    expect(result.locator).toMatch(/^TRP-[A-Z0-9]{4}$/);
  });

  it('should ignore invalid coupons', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 0,
      coupon: 'INVALID'
    });
    expect(result.couponDiscount).toBe(0);
    expect(result.finalValue).toBe(1000);
    expect(result.locator).toMatch(/^TRP-[A-Z0-9]{4}$/);
  });

  it('should handle unrounded prices properly', () => {
    const result = finalizeTripCheckout({
      destination: { ...baseDestination, price: 99.99 },
      miles: 0,
      coupon: 'DANTRIP10'
    });
    expect(result.couponDiscount).toBe(10); // 10% of 99.99 is 9.999 => 10.00
    expect(result.finalValue).toBe(89.99); // 99.99 - 10.00
  });
  
  it('should throw if price is negative', () => {
    expect(() => {
      finalizeTripCheckout({
        destination: { ...baseDestination, price: -100 },
        miles: 0,
      });
    }).toThrow('O valor do pacote deve ser um número positivo');
  });

  it('should throw if miles is negative', () => {
    expect(() => {
      finalizeTripCheckout({
        destination: baseDestination,
        miles: -10,
      });
    }).toThrow('A quantidade de milhas deve ser um número positivo');
  });

  it('should throw if exchange rate is zero or negative', () => {
    expect(() => {
      finalizeTripCheckout({
        destination: baseDestination,
        miles: 0,
        exchangeRate: 0,
      });
    }).toThrow('A taxa de câmbio deve ser um número positivo maior que zero');
  });

  it('should ignore miles below 1000', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 999
    });
    expect(result.milesDiscount).toBe(0);
    expect(result.finalValue).toBe(1000);
  });

  it('should default exchange rate to 5', () => {
    const result = finalizeTripCheckout({
      destination: { ...baseDestination, scope: 'internacional' },
      miles: 0,
      hasTravelInsurance: true
    });
    expect(result.exchangeEstimate).toBe(200); // 1000 / 5
  });
  
  it('should calculate international trip combined with miles discount and coupon', () => {
    const result = finalizeTripCheckout({
      destination: { ...baseDestination, scope: 'internacional' },
      miles: 2000,
      hasTravelInsurance: true,
      coupon: 'DANTRIP10'
    });
    expect(result.exchangeEstimate).toBe(171); // 855 / 5
  });

  it('should skip exchangeEstimate for national trips even with insurance', () => {
    const result = finalizeTripCheckout({
      destination: baseDestination,
      miles: 0,
      hasTravelInsurance: true
    });
    expect(result.exchangeEstimate).toBeUndefined();
  });
});
