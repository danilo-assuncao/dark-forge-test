const { validateCartPrescription } = require('./prescription.js');
const { calculatePharmacyPricing } = require('./discounts.js');
const crypto = require('crypto');

function finalizePharmacyOrder(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload');
  }

  const { items, purchaseMode, couponCode, shippingMode, prescription } = payload;
  const { referenceDateIso } = options;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items are required');
  }

  if (shippingMode !== 'retirada' && shippingMode !== 'expresso') {
    throw new Error('Invalid shippingMode');
  }

  // 1. Validate Prescription
  validateCartPrescription(items, prescription, referenceDateIso);

  // 2. Calculate Pricing
  const pricing = calculatePharmacyPricing({ items, purchaseMode, couponCode });

  // 3. Calculate Shipping
  const finalPriceCents = Math.round(pricing.finalPrice * 100);
  let shippingPriceCents = 0;
  
  if (shippingMode === 'retirada') {
    shippingPriceCents = 0;
  } else {
    if (finalPriceCents >= 11000) {
      shippingPriceCents = 0;
    } else {
      shippingPriceCents = 990;
    }
  }

  const shippingPrice = shippingPriceCents / 100;
  const total = (finalPriceCents + shippingPriceCents) / 100;

  // 4. Generate Protocol
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const protocol = `FAR-${suffix}`;

  return {
    protocol,
    pricing,
    shippingPrice,
    total,
    status: 'CONFIRMED'
  };
}

module.exports = {
  finalizePharmacyOrder
};
