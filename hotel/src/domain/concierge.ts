import { ConciergeAddon } from '../types';

export const CONCIERGE_ADDONS: ConciergeAddon[] = [
  { id: 'cafe-colonial', name: 'Café Colonial', price: 50, pricing: 'per-guest-night' },
  { id: 'spa-casal', name: 'SPA Casal', price: 300, pricing: 'per-stay' },
  { id: 'transfer-vip', name: 'Transfer VIP', price: 150, pricing: 'per-stay' },
  { id: 'late-checkout', name: 'Late Checkout', price: 200, pricing: 'per-stay' }
];

export function listConciergeAddons(): ConciergeAddon[] {
  return CONCIERGE_ADDONS.map(addon => ({ ...addon }));
}

export function quoteConciergeAddons({
  addonIds,
  nights,
  guests
}: {
  addonIds: string[];
  nights: number;
  guests: number;
}): number {
  if (!Number.isInteger(guests) || guests < 1) {
    throw new RangeError('Guests must be a positive integer');
  }
  if (!Number.isInteger(nights) || nights < 1) {
    throw new RangeError('Nights must be a positive integer');
  }

  let total = 0;
  const uniqueIds = new Set(addonIds);
  
  for (const id of uniqueIds) {
    const addon = CONCIERGE_ADDONS.find(a => a.id === id);
    if (!addon) continue;

    if (addon.pricing === 'per-guest-night') {
      total += addon.price * guests * nights;
    } else {
      total += addon.price;
    }
  }

  return total;
}
