const { validateCartPrescription } = require('./prescription.js');
const { calculatePharmacyPricing } = require('./discounts.js');

function finalizePharmacyOrder(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload');
  }

  const { items, purchaseMode, couponCode, shippingMode, prescription, referenceDateIso } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items are required');
  }

  // 1. Validate Prescription
  // validateCartPrescription throws an Error if prescription is required but invalid/missing
  validateCartPrescription(items, prescription, referenceDateIso);

  // 2. Calculate Pricing
  const pricing = calculatePharmacyPricing({ items, purchaseMode, couponCode });

  // 3. Calculate Shipping
  let shippingPrice = 0;
  if (shippingMode === 'retirada') {
    shippingPrice = 0;
  } else {
    // Default to expresso
    if (pricing.finalPrice >= 110) {
      shippingPrice = 0;
    } else {
      shippingPrice = 9.90;
    }
  }

  const total = parseFloat((pricing.finalPrice + shippingPrice).toFixed(2));

  // 4. Generate Protocol (FAR-XXXX)
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
  const protocol = `FAR-${randomSuffix}`;

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
