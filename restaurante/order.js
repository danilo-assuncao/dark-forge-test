'use strict';

const crypto = require('node:crypto');
const { customizeDish } = require('./customizer.js');
const { calculateDeliveryTotals } = require('./delivery.js');
const { getDishById } = require('./menu.js');

function generateProtocol() {
  const code = crypto.randomInt(0, 10000).toString().padStart(4, '0');
  return `PED-${code}`;
}

/**
 * Trust boundary: The caller MUST ensure distanceKm is computed server-side 
 * and couponCode eligibility/usage limits are verified before calling.
 * All returned string fields (customerName, address, notes) must be 
 * properly escaped at any output sink to prevent injection/XSS.
 */
function submitRestaurantOrder(opts) {
  const { lineItems, distanceKm, tipPct = 0, couponCode = '', customerName, address } = opts ?? {};

  if (!Array.isArray(lineItems) || lineItems.length === 0 || lineItems.length > 50) {
    throw new TypeError('lineItems must be a non-empty array with at most 50 items');
  }
  if (typeof customerName !== 'string' || !customerName.trim() || customerName.length > 100 || /[\x00-\x1F]/.test(customerName)) {
    throw new TypeError('customerName must be a valid string up to 100 characters without control characters');
  }
  if (typeof address !== 'string' || !address.trim() || address.length > 300 || /[\x00-\x1F]/.test(address)) {
    throw new TypeError('address must be a valid string up to 300 characters without control characters');
  }

  let itemsSubtotalCents = 0;
  let maxPrepMinutes = 0;
  const customizedItems = [];

  for (const item of lineItems) {
    const customized = customizeDish(item);
    customizedItems.push(customized);
    itemsSubtotalCents += Math.round(customized.totalBrl * 100);

    const dish = getDishById(customized.dishId);
    if (dish && dish.prepMinutes > maxPrepMinutes) {
      maxPrepMinutes = dish.prepMinutes;
    }
  }

  const itemsSubtotalBrl = itemsSubtotalCents / 100;

  const totals = calculateDeliveryTotals({
    itemsSubtotalBrl,
    distanceKm,
    tipPct,
    couponCode
  });

  const estimatedMinutes = maxPrepMinutes + Math.ceil(distanceKm * 3) + 10;
  const protocol = generateProtocol();

  return {
    protocol,
    customerName: customerName.trim(),
    address: address.trim(),
    items: customizedItems,
    totals,
    estimatedMinutes
  };
}

module.exports = { submitRestaurantOrder };
