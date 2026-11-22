import { describe, it, expect } from 'vitest';
import { listConciergeAddons, quoteConciergeAddons } from './concierge';

describe('Concierge Domain', () => {
  it('should list all available addons', () => {
    const addons = listConciergeAddons();
    expect(addons.length).toBe(4);
    expect(addons.map(a => a.id)).toEqual([
      'cafe-colonial',
      'spa-casal',
      'transfer-vip',
      'late-checkout'
    ]);
  });

  describe('quoteConciergeAddons', () => {
    it('should calculate cafe-colonial by guest and night', () => {
      // cafe-colonial base price is 50
      const total = quoteConciergeAddons({
        addonIds: ['cafe-colonial'],
        guests: 2,
        nights: 3
      });
      expect(total).toBe(50 * 2 * 3); // 300
    });

    it('should calculate fixed price addons per stay', () => {
      // spa-casal (300), transfer-vip (150), late-checkout (200)
      const total = quoteConciergeAddons({
        addonIds: ['spa-casal', 'transfer-vip', 'late-checkout'],
        guests: 2,
        nights: 3
      });
      expect(total).toBe(300 + 150 + 200); // 650
    });

    it('should calculate mixed addons correctly', () => {
      const total = quoteConciergeAddons({
        addonIds: ['cafe-colonial', 'transfer-vip'],
        guests: 3,
        nights: 4
      });
      // cafe-colonial: 50 * 3 * 4 = 600
      // transfer-vip: 150
      expect(total).toBe(600 + 150); // 750
    });

    it('should return 0 for unknown or empty addons', () => {
      expect(quoteConciergeAddons({ addonIds: [], guests: 2, nights: 2 })).toBe(0);
      expect(quoteConciergeAddons({ addonIds: ['invalid-addon'], guests: 2, nights: 2 })).toBe(0);
    });
  });
});
