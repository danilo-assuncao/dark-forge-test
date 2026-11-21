const { getVehicleGroup, validateDriverEligibility } = require('./fleet.js');
const { calculateRentalBase } = require('./pricing.js');
const { calculateProtectionAndAddons } = require('./protections.js');

function createRentalBooking(payload) {
  const {
    driverAge,
    licenseYears,
    groupId,
    days,
    mileagePlan,
    estimatedKm,
    differentDropoffCity,
    protectionPlan,
    addonIds,
    coupon
  } = payload;

  const isEligible = validateDriverEligibility(groupId, driverAge, licenseYears);
  if (!isEligible) {
    throw new Error('Driver not eligible');
  }

  const group = getVehicleGroup(groupId);
  if (!group) {
    throw new Error('Invalid vehicle group');
  }

  const rentalBase = calculateRentalBase({
    groupId,
    days,
    mileagePlan,
    estimatedKm,
    differentDropoffCity
  });

  const protectionTotal = calculateProtectionAndAddons({
    protectionPlan,
    addonIds,
    days
  });

  const { totalDailyCost, extraKmCost, dropoffFee } = rentalBase.breakdown;

  const subtotal = totalDailyCost + extraKmCost + dropoffFee + protectionTotal;

  let discount = 0;
  if (coupon === 'DANCAR10') {
    discount = (totalDailyCost + protectionTotal) * 0.10;
  }

  const netSubtotal = subtotal - discount;
  const patioFee = netSubtotal * 0.08;
  const finalTotal = netSubtotal + patioFee;

  // Generate CAR-XXXX (4 random alphanumeric characters)
  const randomChars = Math.floor(Math.random() * 1679616)
    .toString(36)
    .padStart(4, '0')
    .toUpperCase();
  const contractId = `CAR-${randomChars}`;

  return {
    contractId,
    cautionValue: group.depositBrl,
    total: Number(finalTotal.toFixed(2)),
    breakdown: {
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      netSubtotal: Number(netSubtotal.toFixed(2)),
      patioFee: Number(patioFee.toFixed(2))
    }
  };
}

module.exports = {
  createRentalBooking
};
