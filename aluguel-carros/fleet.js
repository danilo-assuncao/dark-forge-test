const FLEET = Object.freeze(Object.assign(Object.create(null), {
  economico: Object.freeze({
    id: 'economico',
    dailyRateBrl: 119.00,
    depositBrl: 800.00,
    minAge: 21
  }),
  suv: Object.freeze({
    id: 'suv',
    dailyRateBrl: 229.00,
    depositBrl: 1500.00,
    minAge: 21
  }),
  executivo: Object.freeze({
    id: 'executivo',
    dailyRateBrl: 349.00,
    depositBrl: 2500.00,
    minAge: 25
  }),
  eletrico: Object.freeze({
    id: 'eletrico',
    dailyRateBrl: 289.00,
    depositBrl: 1800.00,
    minAge: 23
  })
}));

function listFleet({ category, maxDailyBrl } = {}) {
  let results = Object.values(FLEET);

  if (category) {
    results = results.filter(item => item.id === category);
  }
  
  if (typeof maxDailyBrl === 'number' && !Number.isNaN(maxDailyBrl)) {
    results = results.filter(item => item.dailyRateBrl <= maxDailyBrl);
  }

  return results;
}

function getVehicleGroup(groupId) {
  if (typeof groupId !== 'string' || !Object.prototype.hasOwnProperty.call(FLEET, groupId)) {
    return null;
  }
  return FLEET[groupId];
}

function validateDriverEligibility(groupId, driverAge, licenseYears) {
  const group = getVehicleGroup(groupId);
  if (!group) {
    throw new Error('Vehicle group not found');
  }

  if (typeof driverAge !== 'number' || typeof licenseYears !== 'number' || !Number.isFinite(driverAge) || !Number.isFinite(licenseYears)) {
    return false;
  }

  if (licenseYears < 0 || driverAge < 0) {
    return false;
  }

  return licenseYears >= 2 && driverAge >= group.minAge;
}

module.exports = {
  listFleet,
  getVehicleGroup,
  validateDriverEligibility
};
