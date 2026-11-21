const { getVehicleGroup, validateDriverEligibility } = require('./fleet.js');
const { calculateRentalBase } = require('./pricing.js');
const { calculateProtectionAndAddons } = require('./protections.js');
const crypto = require('crypto');

function createRentalBooking(payload = {}) {
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

  const group = getVehicleGroup(groupId);
  if (!group) {
    throw new Error('Vehicle group not found');
  }

  const isEligible = validateDriverEligibility(groupId, driverAge, licenseYears);
  if (!isEligible) {
    throw new Error('Driver not eligible');
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
  let couponApplied = false;
  
  if (typeof coupon === 'string') {
    const normalizedCoupon = coupon.trim().toUpperCase();
    if (normalizedCoupon === 'DANCAR10') {
      discount = Number(((totalDailyCost + protectionTotal) * 0.10).toFixed(2));
      couponApplied = true;
    }
  }

  const netSubtotal = Number((subtotal - discount).toFixed(2));
  const patioFee = Number((netSubtotal * 0.08).toFixed(2));
  const finalTotal = Number((netSubtotal + patioFee).toFixed(2));

  // Generate CAR-XXXX
  // Uses crypto for unpredictability. Note: This is a display-only identifier.
  // Uniqueness must be enforced by the persistence layer.
  const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase();
  const contractId = `CAR-${randomChars}`;

  return {
    contractId,
    cautionValue: group.depositBrl,
    total: finalTotal,
    breakdown: {
      subtotal: Number(subtotal.toFixed(2)),
      discount,
      netSubtotal,
      patioFee,
      couponApplied
    }
  };
}

module.exports = {
  createRentalBooking
};