import { describe, it, expect } from 'vitest';
import { calculateCartPricing, PricingInput } from './wholesale';

describe('wholesale pricing engine', () => {
  it('calculates standard prices without rules or discounts', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '1', quantity: 2, substitution: 'NONE' } // Apples: 2.99 * 2 = 5.98
      ],
      wholesaleRules: [],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(5.98);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(5.98);
    expect(result.cashback).toBe(0);
  });

  it('applies wholesale pricing when quantity meets minWholesaleQty', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '2', quantity: 5, substitution: 'NONE' } // Milk: normally 3.49, wholesale 2.99 => 5 * 2.99 = 14.95
      ],
      wholesaleRules: [
        { itemId: '2', minWholesaleQty: 5, wholesalePriceBrl: 2.99 }
      ],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(14.95);
    expect(result.total).toBe(14.95);
  });

  it('does not apply wholesale pricing when quantity is below minWholesaleQty', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '2', quantity: 4, substitution: 'NONE' } // Milk: normally 3.49 => 4 * 3.49 = 13.96
      ],
      wholesaleRules: [
        { itemId: '2', minWholesaleQty: 5, wholesalePriceBrl: 2.99 }
      ],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(13.96);
    expect(result.total).toBe(13.96);
  });

  it('applies 10% discount when coupon DANMKT10 is provided', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '3', quantity: 10, substitution: 'NONE' } // Bread: 2.49 * 10 = 24.90
      ],
      wholesaleRules: [],
      isClubeMember: false,
      couponCode: 'DANMKT10'
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(24.90);
    expect(result.discount).toBe(2.49);
    expect(result.total).toBe(22.41);
  });

  it('applies 5% cashback on the total for Clube members', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '3', quantity: 10, substitution: 'NONE' } // Bread: 24.90
      ],
      wholesaleRules: [],
      isClubeMember: true,
      couponCode: 'DANMKT10' // discount: 2.49, total: 22.41
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(24.90);
    expect(result.discount).toBe(2.49);
    expect(result.total).toBe(22.41);
    expect(result.cashback).toBe(1.12); // 5% of 22.41 is 1.1205 -> 1.12
  });

  it('ignores invalid items', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '999', quantity: 10, substitution: 'NONE' } // Not in DB
      ],
      wholesaleRules: [],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });
});
