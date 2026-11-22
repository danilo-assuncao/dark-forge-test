import { ConciergeAddon } from '../types';

export const CONCIERGE_ADDONS: ConciergeAddon[] = [
  { id: 'cafe-colonial', name: 'Café Colonial', price: 50 },
  { id: 'spa-casal', name: 'SPA Casal', price: 300 },
  { id: 'transfer-vip', name: 'Transfer VIP', price: 150 },
  { id: 'late-checkout', name: 'Late Checkout', price: 200 }
];

export function listConciergeAddons(): ConciergeAddon[] {
  return CONCIERGE_ADDONS;
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
  let total = 0;
  
  for (const id of addonIds) {
    const addon = CONCIERGE_ADDONS.find(a => a.id === id);
    if (!addon) continue;

    if (id === 'cafe-colonial') {
      total += addon.price * guests * nights;
    } else {
      total += addon.price;
    }
  }

  return total;
}
