import { describe, it, expect } from 'vitest';
import { listGroceries, filterByAisle, getGroceryById } from './groceries';

describe('groceries', () => {
  it('should list all groceries', () => {
    const items = listGroceries();
    expect(items.length).toBeGreaterThan(0);
  });

  it('should filter groceries by aisle', () => {
    const produce = filterByAisle('PRODUCE');
    expect(produce.length).toBeGreaterThan(0);
    expect(produce.every(item => item.aisle === 'PRODUCE')).toBe(true);
  });

  it('should return empty array for aisle with no items', () => {
    const meat = filterByAisle('MEAT');
    expect(meat).toEqual([]);
  });

  it('should get grocery by id', () => {
    const item = getGroceryById('1');
    expect(item).toBeDefined();
    expect(item?.id).toBe('1');
    expect(item?.name).toBe('Apples');
  });

  it('should return undefined for non-existent id', () => {
    const item = getGroceryById('999');
    expect(item).toBeUndefined();
  });

  it('should not mutate original data if returned array or objects are mutated', () => {
    const items = listGroceries();
    const originalLength = items.length;
    items.push({ id: '99', name: 'Fake', price: 1, aisle: 'MEAT', inStock: true });
    
    if (items[0]) {
      items[0].name = 'Mutated';
    }

    const newItems = listGroceries();
    expect(newItems.length).toBe(originalLength);
    expect(newItems[0].name).not.toBe('Mutated');
  });
});
