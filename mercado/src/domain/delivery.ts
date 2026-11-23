import { getGroceryById } from '../data/groceries';
import { CartEntry } from '../types';

export type DeliveryMethod = 'HOME_DELIVERY' | 'DRIVE_THRU';

export interface DeliveryQuoteInput {
  entries: CartEntry[];
  method: DeliveryMethod;
}

export interface DeliveryQuote {
  subtotal: number;
  freight: number;
  requiresThermalBag: boolean;
  total: number;
  protocol: string;
  entries: CartEntry[];
}

function generateProtocol(): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `MKT-${code}`;
}

export function quoteGroceryDelivery(input: DeliveryQuoteInput): DeliveryQuote {
  let subtotal = 0;
  let requiresThermalBag = false;

  for (const entry of input.entries) {
    const item = getGroceryById(entry.itemId);
    if (!item) {
      throw new Error(`Item not found: ${entry.itemId}`);
    }
    subtotal += item.price * entry.quantity;

    if (input.method === 'HOME_DELIVERY' && (item.aisle === 'FROZEN' || item.aisle === 'DAIRY')) {
      requiresThermalBag = true;
    }
  }

  subtotal = Math.round(subtotal * 100) / 100;

  let freight = 12.90;
  if (input.method === 'DRIVE_THRU' || subtotal >= 180) {
    freight = 0;
  }

  const total = Math.round((subtotal + freight) * 100) / 100;

  return {
    subtotal,
    freight,
    requiresThermalBag,
    total,
    protocol: generateProtocol(),
    entries: input.entries
  };
}
