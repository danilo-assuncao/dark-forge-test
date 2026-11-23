import { describe, it, expect, vi } from 'vitest';
import { calculateSpaceRental } from './booking';
import * as spacesData from '../data/spaces';
import { WorkspaceItem } from '../types';

describe('calculateSpaceRental', () => {
  const mockSpace: WorkspaceItem = {
    id: '1',
    name: 'Test Room',
    kind: 'meeting_room',
    capacity: 10,
    amenities: [],
    pricePerHour: 100
  };

  it('should return error if hours <= 0', () => {
    const result = calculateSpaceRental({ spaceId: '1', hours: 0, participants: 5 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Hours must be greater than zero');
  });

  it('should return error if space is not found', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(undefined);
    const result = calculateSpaceRental({ spaceId: 'unknown', hours: 2, participants: 5 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Space not found');
  });

  it('should return error if participants exceed capacity', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 2, participants: 15 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Participants exceed space capacity');
  });

  it('should calculate base amount correctly for < 8 hours', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 5, participants: 5 });
    
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(false);
    expect(result.baseAmount).toBe(500);
    expect(result.discount).toBe(0);
    expect(result.totalAmount).toBe(500);
  });

  it('should apply 20% discount for daily rental (hours >= 8)', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 8, participants: 5 });
    
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(true);
    expect(result.baseAmount).toBe(800);
    expect(result.discount).toBe(160); // 20% of 800
    expect(result.totalAmount).toBe(640);
  });

  it('should apply 20% discount for more than 8 hours', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 10, participants: 5 });
    
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(true);
    expect(result.baseAmount).toBe(1000);
    expect(result.discount).toBe(200); // 20% of 1000
    expect(result.totalAmount).toBe(800);
  });
});
