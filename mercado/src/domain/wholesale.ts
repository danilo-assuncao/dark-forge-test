import { CartEntry } from '../types';
import { getGroceryById } from '../data/groceries';

export interface WholesaleRule {
  itemId: string;
  minWholesaleQty: number;
  wholesalePriceBrl: number;
}

export interface PricingInput {
  cart: CartEntry[];
  wholesaleRules: WholesaleRule[];
  isClubeMember: boolean;
  couponCode?: string;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  total: number;
  cashback: number;
}

export function calculateCartPricing(input: PricingInput): PricingResult {
  let subtotal = 0;

  for (const entry of input.cart) {
    const item = getGroceryById(entry.itemId);
    if (!item) continue;

    const rule = input.wholesaleRules.find(r => r.itemId === entry.itemId);
    let unitPrice = item.price;

    if (rule && entry.quantity >= rule.minWholesaleQty) {
      unitPrice = rule.wholesalePriceBrl;
    }

    subtotal += unitPrice * entry.quantity;
  }

  let discount = 0;
  if (input.couponCode === 'DANMKT10') {
    discount = subtotal * 0.10;
  }

  const total = subtotal - discount;

  let cashback = 0;
  if (input.isClubeMember) {
    cashback = total * 0.05;
  }

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2)),
    cashback: Number(cashback.toFixed(2))
  };
}
