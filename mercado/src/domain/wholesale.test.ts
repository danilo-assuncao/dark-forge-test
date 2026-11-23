import { describe, it, expect, vi } from 'vitest';
import { calculateCartPricing, PricingInput } from './wholesale';
import * as groceries from '../data/groceries';

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

  it('aggregates quantities per itemId and applies wholesale pricing when threshold is met', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '2', quantity: 2, substitution: 'NONE' },
        { itemId: '2', quantity: 3, substitution: 'NONE' }
      ],
      wholesaleRules: [
        { itemId: '2', minWholesaleQty: 5, wholesalePriceBrl: 2.99 } // Milk: normally 3.49, wholesale 2.99 => 5 * 2.99 = 14.95
      ],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(14.95);
    expect(result.total).toBe(14.95);
  });

  it('ignores invalid quantities (negative, zero, fractional)', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '1', quantity: -1, substitution: 'NONE' },
        { itemId: '1', quantity: 0, substitution: 'NONE' },
        { itemId: '1', quantity: 1.5, substitution: 'NONE' },
        { itemId: '1', quantity: 2, substitution: 'NONE' } // Only this one is valid: 2.99 * 2 = 5.98
      ],
      wholesaleRules: [],
      isClubeMember: false
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(5.98);
    expect(result.total).toBe(5.98);
  });

  it('applies 10% discount when coupon is provided with whitespace and mixed case', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '3', quantity: 10, substitution: 'NONE' } // Bread: 2.49 * 10 = 24.90
      ],
      wholesaleRules: [],
      isClubeMember: false,
      couponCode: ' daNmkt10 '
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(24.90);
    expect(result.discount).toBe(2.49);
    expect(result.total).toBe(22.41);
  });

  it('handles unknown/invalid coupons without applying discount', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '3', quantity: 10, substitution: 'NONE' } // Bread: 24.90
      ],
      wholesaleRules: [],
      isClubeMember: false,
      couponCode: 'INVALID123'
    };

    const result = calculateCartPricing(input);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(24.90);
  });

  it('applies 5% cashback on the total for Clube members, and ensures rounding correctness (F-1a870e)', () => {
    // Mocking an item to expose the floating point issue:
    // Subtotal: 0.05
    // 10% discount: 0.005 -> rounds to 0.01
    // Total: 0.04
    // 5% cashback: 0.002 -> rounds to 0
    vi.spyOn(groceries, 'getGroceryById').mockImplementation((id: string) => {
      if (id === 'TEST') return { id: 'TEST', name: 'Test', price: 0.05, aisle: 'PRODUCE', inStock: true };
      return undefined;
    });

    const input: PricingInput = {
      cart: [
        { itemId: 'TEST', quantity: 1, substitution: 'NONE' }
      ],
      wholesaleRules: [],
      isClubeMember: true,
      couponCode: 'DANMKT10'
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(0.05);
    expect(result.discount).toBe(0.01);
    expect(result.total).toBe(0.04);
    expect(result.cashback).toBe(0);

    vi.restoreAllMocks();
  });

  it('cashback is zero for non-members even with coupon', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '3', quantity: 10, substitution: 'NONE' } // Bread: 24.90
      ],
      wholesaleRules: [],
      isClubeMember: false,
      couponCode: 'DANMKT10'
    };

    const result = calculateCartPricing(input);
    expect(result.discount).toBe(2.49);
    expect(result.total).toBe(22.41);
    expect(result.cashback).toBe(0);
  });

  it('handles a mixed multi-item cart with wholesale, coupon and cashback', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '1', quantity: 2, substitution: 'NONE' }, // Apples: 2.99 * 2 = 5.98
        { itemId: '2', quantity: 5, substitution: 'NONE' }  // Milk: wholesale 2.99 * 5 = 14.95
      ],
      wholesaleRules: [
        { itemId: '2', minWholesaleQty: 5, wholesalePriceBrl: 2.99 },
        { itemId: '999', minWholesaleQty: 5, wholesalePriceBrl: 1.00 } // Rule for an item not in cart
      ],
      isClubeMember: true,
      couponCode: 'DANMKT10'
    };
    
    // Subtotal: 5.98 + 14.95 = 20.93
    // Discount: 20.93 * 0.10 = 2.093 -> 2.09
    // Total: 20.93 - 2.09 = 18.84
    // Cashback: 18.84 * 0.05 = 0.942 -> 0.94

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(20.93);
    expect(result.discount).toBe(2.09);
    expect(result.total).toBe(18.84);
    expect(result.cashback).toBe(0.94);
  });

  it('ignores invalid items and returns zeros', () => {
    const input: PricingInput = {
      cart: [
        { itemId: '999', quantity: 10, substitution: 'NONE' } // Not in DB
      ],
      wholesaleRules: [],
      isClubeMember: false,
      couponCode: 'DANMKT10'
    };

    const result = calculateCartPricing(input);
    expect(result.subtotal).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(0);
    expect(result.cashback).toBe(0);
  });
});
