import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateSpaceRental } from './booking';
import * as spacesData from '../data/spaces';
import { WorkspaceItem } from '../types';

describe('calculateSpaceRental', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSpace: WorkspaceItem = {
    id: '1',
    name: 'Test Room',
    kind: 'meeting_room',
    capacity: 10,
    amenities: [],
    pricePerHour: 100.5 // fractional to test rounding
  };

  it('should return error if hours <= 0 or invalid', () => {
    expect(calculateSpaceRental({ spaceId: '1', hours: 0, participants: 5 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: -5, participants: 5 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: NaN, participants: 5 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: Infinity, participants: 5 }).success).toBe(false);
    
    expect(calculateSpaceRental({ spaceId: '1', hours: 0, participants: 5 }).error).toBe('Hours must be greater than zero and finite');
  });

  it('should return error if participants are invalid', () => {
    expect(calculateSpaceRental({ spaceId: '1', hours: 2, participants: 0 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: 2, participants: -2 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: 2, participants: 2.5 }).success).toBe(false);
    expect(calculateSpaceRental({ spaceId: '1', hours: 2, participants: NaN }).success).toBe(false);

    expect(calculateSpaceRental({ spaceId: '1', hours: 2, participants: 0 }).error).toBe('Participants must be a positive integer');
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
  
  it('should allow participants exactly equal to capacity', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 2, participants: 10 });
    expect(result.success).toBe(true);
  });

  it('should calculate base amount correctly for < 8 hours with rounding', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 5.5, participants: 5 });
    
    // 100.5 * 5.5 = 552.75
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(false);
    expect(result.baseAmount).toBe(552.75);
    expect(result.discount).toBe(0);
    expect(result.totalAmount).toBe(552.75);
  });

  it('should not apply daily discount for hours just under 8 (e.g. 7.99)', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 7.99, participants: 5 });
    
    // 100.5 * 7.99 = 802.995 => rounded to 803
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(false);
    expect(result.baseAmount).toBe(803);
    expect(result.discount).toBe(0);
    expect(result.totalAmount).toBe(803);
  });

  it('should apply 20% discount for daily rental (hours >= 8)', () => {
    vi.spyOn(spacesData, 'getSpaceById').mockReturnValueOnce(mockSpace);
    const result = calculateSpaceRental({ spaceId: '1', hours: 8, participants: 5 });
    
    // 100.5 * 8 = 804
    // 804 * 0.20 = 160.8
    // 804 - 160.8 = 643.2
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(true);
    expect(result.baseAmount).toBe(804);
    expect(result.discount).toBe(160.8); 
    expect(result.totalAmount).toBe(643.2);
  });
  
  it('should work with real seed data', () => {
    // using real space with ID '1' which has price 50, capacity 10
    const result = calculateSpaceRental({ spaceId: '1', hours: 10, participants: 8 });
    
    // 50 * 10 = 500
    // 20% of 500 = 100
    // 500 - 100 = 400
    expect(result.success).toBe(true);
    expect(result.isDaily).toBe(true);
    expect(result.baseAmount).toBe(500);
    expect(result.discount).toBe(100);
    expect(result.totalAmount).toBe(400);
  });
});
