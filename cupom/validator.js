'use strict';

/**
 * Trim and uppercase strings without coercing other input types.
 * This formatting helper does not validate codes or bound their length/charset.
 * Unicode case mapping can merge distinct inputs (for example, ß and SS).
 * Lookup callers must enforce their code policy, including input length and
 * allowed characters, before normalization; a post-normalization ASCII check
 * alone cannot reject Unicode inputs that uppercase to ASCII.
 * Storage and lookup must use the same normalization and uniqueness policy.
 */
function normalizeCouponCode(raw) {
  if (typeof raw !== 'string') {
    throw new TypeError('code must be a string.');
  }
  return raw.trim().toUpperCase();
}

function assertFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}

/**
 * Validate all required coupon fields and the order before checking eligibility.
 * Invalid types/nonfinite numbers throw TypeError; invalid ranges throw RangeError.
 * Usage counts must be nonnegative safe integers; fractional percentages are valid.
 * Returns false for orders below the minimum or exhausted coupons (including maxUses 0).
 * This check never mutates the coupon or consumes a use.
 * It neither normalizes codes nor performs a code lookup; callers compare codes
 * separately using normalizeCouponCode under their storage/lookup code policy.
 * Eligibility is advisory only: concurrent redemptions can observe the same counts.
 * Server-side callers must load coupons (including usage counts and limits) from
 * trusted storage, never from request input, and atomically enforce the usage limit
 * when consuming a use (for example, a conditional increment where used_count <
 * max_uses, treating no updated row as a failed redemption).
 */
function validateCoupon(coupon, orderTotalBrl) {
  if (coupon === null || typeof coupon !== 'object' || Array.isArray(coupon)) {
    throw new TypeError('coupon must be an object.');
  }
  const { code, minOrderBrl, percentOff, maxUses, usedCount } = coupon;
  if (typeof code !== 'string') {
    throw new TypeError('code must be a string.');
  }
  if (code.trim().length === 0) {
    throw new RangeError('code must not be blank.');
  }
  for (const [label, value] of Object.entries({ minOrderBrl, percentOff, maxUses, usedCount, orderTotalBrl })) {
    assertFiniteNumber(value, label);
  }
  for (const [label, value] of Object.entries({ minOrderBrl, orderTotalBrl })) {
    if (value < 0) {
      throw new RangeError(`${label} must not be negative.`);
    }
  }
  if (percentOff < 1 || percentOff > 90) {
    throw new RangeError('percentOff must be between 1 and 90.');
  }
  for (const [label, value] of Object.entries({ maxUses, usedCount })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${label} must be a nonnegative safe integer.`);
    }
  }
  return orderTotalBrl >= minOrderBrl && usedCount < maxUses;
}

module.exports = { validateCoupon, normalizeCouponCode };
