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

const COUPON_CODE = 'DANMKT10';
const COUPON_DISCOUNT_RATE = 0.10;
const CLUBE_CASHBACK_RATE = 0.05;

export function calculateCartPricing(input: PricingInput): PricingResult {
  let subtotalCents = 0;

  // Aggregate quantities by itemId, skipping invalid ones
  const aggregatedCart = new Map<string, number>();
  for (const entry of input.cart) {
    if (typeof entry.quantity !== 'number' || entry.quantity <= 0 || !Number.isInteger(entry.quantity)) {
      continue;
    }
    aggregatedCart.set(entry.itemId, (aggregatedCart.get(entry.itemId) || 0) + entry.quantity);
  }

  for (const [itemId, quantity] of aggregatedCart.entries()) {
    const item = getGroceryById(itemId);
    if (!item) continue;

    const rule = input.wholesaleRules.find(r => r.itemId === itemId);
    let unitPriceCents = Math.round(item.price * 100);

    if (rule && rule.minWholesaleQty > 0 && rule.wholesalePriceBrl >= 0 && quantity >= rule.minWholesaleQty) {
      unitPriceCents = Math.round(rule.wholesalePriceBrl * 100);
    }

    subtotalCents += unitPriceCents * quantity;
  }

  let discountCents = 0;
  const normalizedCoupon = input.couponCode?.trim().toUpperCase();
  if (normalizedCoupon === COUPON_CODE) {
    discountCents = Math.round(subtotalCents * COUPON_DISCOUNT_RATE);
  }

  const totalCents = subtotalCents - discountCents;

  let cashbackCents = 0;
  if (input.isClubeMember) {
    cashbackCents = Math.round(totalCents * CLUBE_CASHBACK_RATE);
  }

  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: totalCents / 100,
    cashback: cashbackCents / 100
  };
}
