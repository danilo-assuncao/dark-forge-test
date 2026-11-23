import { describe, it, expect } from 'vitest';
import { quoteGroceryDelivery } from './delivery';
import { CartEntry } from '../types';

describe('quoteGroceryDelivery', () => {
  it('calculates standard freight and no thermal bag for produce items', () => {
    const entries: CartEntry[] = [
      { itemId: '1', quantity: 2, substitution: 'ANY' } // Apples: $2.99 * 2 = $5.98
    ];
    
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    
    expect(result.subtotal).toBe(5.98);
    expect(result.freight).toBe(12.90);
    expect(result.requiresThermalBag).toBe(false);
    expect(result.total).toBe(18.88);
    expect(result.protocol).toMatch(/^MKT-\d{4}$/);
    expect(result.entries).toEqual(entries);
  });

  it('adds thermal bag for dairy items in home delivery', () => {
    const entries: CartEntry[] = [
      { itemId: '2', quantity: 1, substitution: 'SAME_BRAND' } // Milk (DAIRY): $3.49
    ];
    
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    
    expect(result.subtotal).toBe(3.49);
    expect(result.freight).toBe(12.90);
    expect(result.requiresThermalBag).toBe(true);
    expect(result.total).toBe(16.39);
    expect(result.protocol).toMatch(/^MKT-\d{4}$/);
    expect(result.entries).toEqual(entries);
  });

  it('does not add thermal bag for dairy items in drive thru', () => {
    const entries: CartEntry[] = [
      { itemId: '2', quantity: 1, substitution: 'SAME_BRAND' } // Milk (DAIRY): $3.49
    ];
    
    const result = quoteGroceryDelivery({ entries, method: 'DRIVE_THRU' });
    
    expect(result.subtotal).toBe(3.49);
    expect(result.freight).toBe(0);
    expect(result.requiresThermalBag).toBe(false);
    expect(result.total).toBe(3.49);
  });

  it('gives free freight for home delivery when subtotal >= 180', () => {
    const entries: CartEntry[] = [
      { itemId: '1', quantity: 100, substitution: 'NONE' } // Apples: $2.99 * 100 = $299.00
    ];
    
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    
    expect(result.subtotal).toBe(299.00);
    expect(result.freight).toBe(0);
    expect(result.requiresThermalBag).toBe(false);
    expect(result.total).toBe(299.00);
  });

  it('throws an error for non-existent item', () => {
    const entries: CartEntry[] = [
      { itemId: '999', quantity: 1, substitution: 'ANY' }
    ];
    
    expect(() => quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' })).toThrow('Item not found: 999');
  });
});
