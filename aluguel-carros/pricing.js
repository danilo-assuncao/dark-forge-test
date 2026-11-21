const { getVehicleGroup } = require('./fleet.js');

function calculateRentalBase({
  groupId,
  days,
  mileagePlan = 'km-livre',
  estimatedKm = 0,
  differentDropoffCity = false
}) {
  const group = getVehicleGroup(groupId);
  if (!group) {
    throw new Error('Invalid or missing vehicle group');
  }

  if (!Number.isInteger(days) || days < 1) {
    throw new Error('Days must be a positive integer');
  }

  let adjustedDailyRate = group.dailyRateBrl;
  let extraKmCost = 0;

  if (mileagePlan === 'franquia-100km') {
    adjustedDailyRate *= 0.85; // 15% discount
    const limitKm = 100 * days;
    if (estimatedKm > limitKm) {
      extraKmCost = (estimatedKm - limitKm) * 1.20;
    }
  } else if (mileagePlan !== 'km-livre') {
    throw new Error('Invalid mileage plan');
  }

  let totalDailyCost = adjustedDailyRate * days;

  // 12% discount on daily rates for 7+ days
  if (days >= 7) {
    totalDailyCost *= 0.88;
  }

  const dropoffFee = differentDropoffCity ? 180.00 : 0;

  const total = totalDailyCost + extraKmCost + dropoffFee;

  return {
    total: Number(total.toFixed(2)),
    breakdown: {
      totalDailyCost: Number(totalDailyCost.toFixed(2)),
      extraKmCost: Number(extraKmCost.toFixed(2)),
      dropoffFee: Number(dropoffFee.toFixed(2))
    }
  };
}

module.exports = {
  calculateRentalBase
};
