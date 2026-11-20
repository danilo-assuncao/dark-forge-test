'use strict';

const { customizeDish } = require('./customizer.js');
const { calculateDeliveryTotals } = require('./delivery.js');
const { getDishById } = require('./menu.js');

function generateProtocol() {
  const code = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PED-${code}`;
}

function submitRestaurantOrder(opts) {
  const { lineItems, distanceKm, tipPct = 0, couponCode = '', customerName, address } = opts ?? {};

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new TypeError('lineItems must be a non-empty array');
  }
  if (typeof customerName !== 'string' || !customerName.trim()) {
    throw new TypeError('customerName must be a non-empty string');
  }
  if (typeof address !== 'string' || !address.trim()) {
    throw new TypeError('address must be a non-empty string');
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
