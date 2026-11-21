import { describe, it, expect } from 'vitest';
import { foodsData, dietsData } from './data';

describe('Data Integrity', () => {
  it('has unique food IDs', () => {
    const ids = foodsData.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has unique diet IDs', () => {
    const ids = dietsData.map(d => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('diet recommendedFoods resolve to existing foods', () => {
    const foodIds = new Set(foodsData.map(f => f.id));
    
    dietsData.forEach(diet => {
      diet.recommendedFoods.forEach(foodId => {
        expect(foodIds.has(foodId)).toBe(true);
      });
    });
  });
});
