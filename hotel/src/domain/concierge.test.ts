import { describe, it, expect } from 'vitest';
import { listConciergeAddons, quoteConciergeAddons, CONCIERGE_ADDONS } from './concierge';

describe('Concierge Domain', () => {
  it('should list all available addons', () => {
    const addons = listConciergeAddons();
    expect(addons.length).toBeGreaterThan(0);
    
    for (const addon of addons) {
      expect(addon.name.length).toBeGreaterThan(0);
      expect(addon.price).toBeGreaterThan(0);
    }

    expect(addons.map(a => a.id)).toEqual(
      expect.arrayContaining(['cafe-colonial', 'spa-casal', 'transfer-vip', 'late-checkout'])
    );
  });

  it('should not allow mutating the shared catalog', () => {
    const addons1 = listConciergeAddons();
    addons1.push({ id: 'hacked', name: 'Hacked', price: 1, pricing: 'per-stay' });
    addons1[0].price = 999;
    
    const addons2 = listConciergeAddons();
    expect(addons2.find(a => a.id === 'hacked')).toBeUndefined();
    expect(addons2[0].price).not.toBe(999);
  });

  describe('quoteConciergeAddons', () => {
    it('should calculate cafe-colonial by guest and night', () => {
      const cafe = CONCIERGE_ADDONS.find(a => a.id === 'cafe-colonial')!;
      const total = quoteConciergeAddons({
        addonIds: ['cafe-colonial'],
        guests: 2,
        nights: 3
      });
      expect(total).toBe(cafe.price * 2 * 3);
    });

    it('should calculate fixed price addons per stay', () => {
      const addons = CONCIERGE_ADDONS.filter(a => ['spa-casal', 'transfer-vip', 'late-checkout'].includes(a.id));
      const expectedTotal = addons.reduce((sum, a) => sum + a.price, 0);
      
      const total = quoteConciergeAddons({
        addonIds: ['spa-casal', 'transfer-vip', 'late-checkout'],
        guests: 2,
        nights: 3
      });
      expect(total).toBe(expectedTotal);
    });

    it('should calculate mixed addons correctly', () => {
      const cafe = CONCIERGE_ADDONS.find(a => a.id === 'cafe-colonial')!;
      const transfer = CONCIERGE_ADDONS.find(a => a.id === 'transfer-vip')!;
      
      const total = quoteConciergeAddons({
        addonIds: ['cafe-colonial', 'transfer-vip'],
        guests: 3,
        nights: 4
      });
      
      expect(total).toBe((cafe.price * 3 * 4) + transfer.price);
    });

    it('should calculate mixed valid and unknown IDs, and deduplicate duplicate IDs', () => {
      const spa = CONCIERGE_ADDONS.find(a => a.id === 'spa-casal')!;
      const transfer = CONCIERGE_ADDONS.find(a => a.id === 'transfer-vip')!;
      
      const total = quoteConciergeAddons({
        addonIds: ['spa-casal', 'unknown-addon', 'transfer-vip', 'spa-casal'],
        guests: 2,
        nights: 2
      });
      
      expect(total).toBe(spa.price + transfer.price);
    });

    it('should return 0 for empty addons or all unknown addons', () => {
      expect(quoteConciergeAddons({ addonIds: [], guests: 2, nights: 2 })).toBe(0);
      expect(quoteConciergeAddons({ addonIds: ['invalid-addon'], guests: 2, nights: 2 })).toBe(0);
    });

    describe('boundary validations', () => {
      it('should throw if guests is not a positive integer', () => {
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 0, nights: 2 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: -1, nights: 2 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 1.5, nights: 2 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: NaN, nights: 2 }))
          .toThrow(RangeError);
      });

      it('should throw if nights is not a positive integer', () => {
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 2, nights: 0 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 2, nights: -5 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 2, nights: 2.5 }))
          .toThrow(RangeError);
        expect(() => quoteConciergeAddons({ addonIds: ['cafe-colonial'], guests: 2, nights: NaN }))
          .toThrow(RangeError);
      });
    });
  });
});
