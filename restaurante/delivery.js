'use strict';

/* Delivery totals: distance-based fee, minimum order, tip and coupon.
   Amounts are BRL (reais); internal math uses integer cents. */

const MAX_DISTANCE_KM = 15;
const MIN_ORDER_BRL = 35;
const FREE_DELIVERY_THRESHOLD_BRL = 120;
const COUPON_CODE = 'DANCHEF10';
const COUPON_DISCOUNT_PCT = 10;
const ALLOWED_TIP_PCTS = Object.freeze([0, 10, 12]);

const FEE_TIERS = Object.freeze([
  Object.freeze({ maxKm: 3, feeCents: 700 }),
  Object.freeze({ maxKm: 8, feeCents: 1200 }),
  Object.freeze({ maxKm: 15, feeCents: 1800 }),
]);

const toCents = (brl) => Math.round(brl * 100);
const toBrl = (cents) => cents / 100;

function deliveryFeeCents(distanceKm) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError(`Invalid distanceKm: ${String(distanceKm)}`);
  }
  if (distanceKm > MAX_DISTANCE_KM) {
    throw new RangeError(`Distance ${distanceKm} km exceeds the ${MAX_DISTANCE_KM} km delivery radius`);
  }
  return FEE_TIERS.find((t) => distanceKm <= t.maxKm).feeCents;
}

function calculateDeliveryTotals({ itemsSubtotalBrl, distanceKm, tipPct = 0, couponCode = '' } = {}) {
  if (typeof itemsSubtotalBrl !== 'number' || !Number.isFinite(itemsSubtotalBrl) || itemsSubtotalBrl < 0) {
    throw new RangeError(`Invalid itemsSubtotalBrl: ${String(itemsSubtotalBrl)}`);
  }
  if (!ALLOWED_TIP_PCTS.includes(tipPct)) {
    throw new RangeError(`Invalid tipPct: ${String(tipPct)} (allowed: ${ALLOWED_TIP_PCTS.join(', ')})`);
  }
  const feeTierCents = deliveryFeeCents(distanceKm);

  const subtotalCents = toCents(itemsSubtotalBrl);
  if (subtotalCents < toCents(MIN_ORDER_BRL)) {
    throw new RangeError(`Order below the minimum of R$ ${MIN_ORDER_BRL.toFixed(2)}`);
  }

  const code = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
  if (code !== '' && code !== COUPON_CODE) {
    throw new RangeError(`Unknown coupon: ${String(couponCode)}`);
  }
  const discountCents = code === COUPON_CODE
    ? Math.round((subtotalCents * COUPON_DISCOUNT_PCT) / 100)
    : 0;
  const netCents = subtotalCents - discountCents;

  const deliveryFeeCentsFinal = netCents >= toCents(FREE_DELIVERY_THRESHOLD_BRL) ? 0 : feeTierCents;
  const tipCents = Math.round((netCents * tipPct) / 100);
  const totalCents = netCents + deliveryFeeCentsFinal + tipCents;

  return {
    itemsSubtotalBrl: toBrl(subtotalCents),
    discountBrl: toBrl(discountCents),
    netSubtotalBrl: toBrl(netCents),
    deliveryFeeBrl: toBrl(deliveryFeeCentsFinal),
    tipBrl: toBrl(tipCents),
    totalBrl: toBrl(totalCents),
  };
}

module.exports = {
  calculateDeliveryTotals,
  MAX_DISTANCE_KM,
  MIN_ORDER_BRL,
  FREE_DELIVERY_THRESHOLD_BRL,
  COUPON_CODE,
  ALLOWED_TIP_PCTS,
};
