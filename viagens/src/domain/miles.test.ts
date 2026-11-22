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
      coupon: 'DANTRIP10'
    });
    expect(result.couponDiscount).toBe(95); // 10% of 950
    expect(result.finalValue).toBe(855); // 950 - 95
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
    expect(result.locator).toBeUndefined();
  });
});
