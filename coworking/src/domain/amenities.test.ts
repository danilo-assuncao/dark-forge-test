import { describe, it, expect } from 'vitest';
import { listAmenities, quoteAmenities, ADDITIONAL_AMENITIES } from './amenities';
import { WorkspaceItem } from '../types';

const mockSpace: WorkspaceItem = {
  id: '1',
  name: 'Main Conference Room',
  kind: 'meeting_room',
  capacity: 10,
  amenities: ['projector', 'whiteboard'],
  pricePerHour: 50
};

describe('amenities', () => {
  describe('listAmenities', () => {
    it('should return the list of available additional amenities', () => {
      const amenities = listAmenities();
      expect(amenities).toEqual(ADDITIONAL_AMENITIES);
      expect(amenities.length).toBe(4);
    });
  });

  describe('quoteAmenities', () => {
    it('should quote correctly for fixed amenities', () => {
      const result = quoteAmenities({
        space: mockSpace,
        participants: 5,
        amenities: ['kit-streaming-4k', 'armario-dia']
      });

      expect(result.total).toBe(150 + 20);
      expect(result.details.length).toBe(2);
      expect(result.details[0].id).toBe('kit-streaming-4k');
      expect(result.details[0].quantity).toBe(1);
      expect(result.details[0].subtotal).toBe(150);
    });

    it('should quote correctly for per_person amenities based on participants', () => {
      const result = quoteAmenities({
        space: mockSpace,
        participants: 5,
        amenities: ['coffee-break']
      });

      expect(result.total).toBe(125); // 25 * 5
      expect(result.details[0].quantity).toBe(5);
      expect(result.details[0].subtotal).toBe(125);
    });

    it('should use space capacity if participants count is 0', () => {
      const result = quoteAmenities({
        space: mockSpace,
        participants: 0,
        amenities: ['coffee-break']
      });

      expect(result.total).toBe(250); // 25 * 10 (capacity)
      expect(result.details[0].quantity).toBe(10);
    });

    it('should throw error if participants exceed space capacity', () => {
      expect(() => {
        quoteAmenities({
          space: mockSpace,
          participants: 15,
          amenities: ['coffee-break']
        });
      }).toThrow('Participants exceed space capacity');
    });

    it('should ignore unknown amenities', () => {
      const result = quoteAmenities({
        space: mockSpace,
        participants: 5,
        amenities: ['unknown-amenity' as any, 'coffee-break']
      });

      expect(result.details.length).toBe(1);
      expect(result.total).toBe(125);
    });
  });
});
