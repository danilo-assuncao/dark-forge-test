import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quoteGroceryDelivery } from './delivery';
import { CartEntry, GroceryItem } from '../types';
import * as groceriesModule from '../data/groceries';

describe('quoteGroceryDelivery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it('gives free freight exactly at threshold of 180', () => {
    vi.spyOn(groceriesModule, 'getGroceryById').mockImplementation((id: string): GroceryItem | undefined => {
      if (id === 'mock1') return { id: 'mock1', name: 'Mock', price: 60, aisle: 'PRODUCE', inStock: true };
      return undefined;
    });

    const entries: CartEntry[] = [
      { itemId: 'mock1', quantity: 3, substitution: 'NONE' },
    ];
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    expect(result.subtotal).toBe(180.00);
    expect(result.freight).toBe(0);
    expect(result.total).toBe(180.00);
  });

  it('charges freight just below threshold of 180', () => {
    vi.spyOn(groceriesModule, 'getGroceryById').mockImplementation((id: string): GroceryItem | undefined => {
      if (id === 'mock1') return { id: 'mock1', name: 'Mock', price: 179.99, aisle: 'PRODUCE', inStock: true };
      return undefined;
    });

    const entries: CartEntry[] = [
      { itemId: 'mock1', quantity: 1, substitution: 'NONE' },
    ];
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    expect(result.subtotal).toBe(179.99);
    expect(result.freight).toBe(12.90);
    expect(result.total).toBe(192.89);
  });

  it('adds thermal bag for frozen items in home delivery', () => {
    vi.spyOn(groceriesModule, 'getGroceryById').mockImplementation((id: string): GroceryItem | undefined => {
      if (id === 'frozen') return { id: 'frozen', name: 'Pizza', price: 10, aisle: 'FROZEN', inStock: true };
      return undefined;
    });

    const entries: CartEntry[] = [
      { itemId: 'frozen', quantity: 1, substitution: 'NONE' },
    ];
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    expect(result.requiresThermalBag).toBe(true);
  });

  it('handles mixed cart with both produce and dairy/frozen correctly', () => {
    vi.spyOn(groceriesModule, 'getGroceryById').mockImplementation((id: string): GroceryItem | undefined => {
      if (id === 'apple') return { id: 'apple', name: 'Apple', price: 2, aisle: 'PRODUCE', inStock: true };
      if (id === 'milk') return { id: 'milk', name: 'Milk', price: 3, aisle: 'DAIRY', inStock: true };
      return undefined;
    });

    const entries: CartEntry[] = [
      { itemId: 'apple', quantity: 2, substitution: 'NONE' }, // 4.00
      { itemId: 'milk', quantity: 1, substitution: 'NONE' },  // 3.00
    ];
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' });
    expect(result.subtotal).toBe(7.00);
    expect(result.freight).toBe(12.90);
    expect(result.requiresThermalBag).toBe(true);
    expect(result.total).toBe(19.90);
  });

  it('rejects empty cart', () => {
    expect(() => quoteGroceryDelivery({ entries: [], method: 'HOME_DELIVERY' })).toThrow('Cart cannot be empty');
  });

  it('rejects invalid quantity', () => {
    const entries: CartEntry[] = [
      { itemId: '1', quantity: 0, substitution: 'NONE' },
    ];
    expect(() => quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' })).toThrow('Invalid quantity for item 1: 0');

    const entries2: CartEntry[] = [
      { itemId: '1', quantity: -5, substitution: 'NONE' },
    ];
    expect(() => quoteGroceryDelivery({ entries: entries2, method: 'HOME_DELIVERY' })).toThrow('Invalid quantity for item 1: -5');

    const entries3: CartEntry[] = [
      { itemId: '1', quantity: 1.5, substitution: 'NONE' },
    ];
    expect(() => quoteGroceryDelivery({ entries: entries3, method: 'HOME_DELIVERY' })).toThrow('Invalid quantity for item 1: 1.5');
  });

  it('rejects out of stock item', () => {
    vi.spyOn(groceriesModule, 'getGroceryById').mockImplementation((id: string): GroceryItem | undefined => {
      if (id === 'oos') return { id: 'oos', name: 'OOS', price: 10, aisle: 'PRODUCE', inStock: false };
      return undefined;
    });

    const entries: CartEntry[] = [
      { itemId: 'oos', quantity: 1, substitution: 'NONE' },
    ];
    expect(() => quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' })).toThrow('Item out of stock: oos');
  });

  it('generates predictable protocol using injected generator', () => {
    const entries: CartEntry[] = [
      { itemId: '1', quantity: 1, substitution: 'NONE' }
    ];
    const result = quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' }, () => 'MKT-INJECTED');
    expect(result.protocol).toBe('MKT-INJECTED');
  });

  it('throws an error for non-existent item', () => {
    const entries: CartEntry[] = [
      { itemId: '999', quantity: 1, substitution: 'ANY' }
    ];
    
    expect(() => quoteGroceryDelivery({ entries, method: 'HOME_DELIVERY' })).toThrow('Item not found: 999');
  });
});
