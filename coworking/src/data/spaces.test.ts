import { listSpaces, filterSpacesByCapacity, getSpaceById } from './spaces';
import { expect, test, describe } from 'vitest';

describe('spaces data functions', () => {
  test('listSpaces should return all spaces', () => {
    const spaces = listSpaces();
    expect(spaces.length).toBeGreaterThan(0);
  });

  test('filterSpacesByCapacity should return spaces with enough capacity', () => {
    const spaces = filterSpacesByCapacity(4);
    expect(spaces.every(s => s.capacity >= 4)).toBe(true);
  });

  test('getSpaceById should return the correct space or undefined', () => {
    const space = getSpaceById('1');
    expect(space).toBeDefined();
    expect(space?.id).toBe('1');
    
    const missing = getSpaceById('not-found');
    expect(missing).toBeUndefined();
  });
});
