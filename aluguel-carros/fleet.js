const FLEET = {
  economico: {
    id: 'economico',
    dailyRateBrl: 119.00,
    depositBrl: 800.00,
    minAge: 21
  },
  suv: {
    id: 'suv',
    dailyRateBrl: 229.00,
    depositBrl: 1500.00,
    minAge: 21
  },
  executivo: {
    id: 'executivo',
    dailyRateBrl: 349.00,
    depositBrl: 2500.00,
    minAge: 25
  },
  eletrico: {
    id: 'eletrico',
    dailyRateBrl: 289.00,
    depositBrl: 1800.00,
    minAge: 23
  }
};

function listFleet({ category, maxDailyBrl } = {}) {
  let results = Object.values(FLEET);

  if (category) {
    results = results.filter(item => item.id === category);
  }
  
  if (typeof maxDailyBrl === 'number') {
    results = results.filter(item => item.dailyRateBrl <= maxDailyBrl);
  }

  return results;
}

function getVehicleGroup(groupId) {
  const group = FLEET[groupId];
  if (!group) {
    return null;
  }
  return group;
}

function validateDriverEligibility(groupId, driverAge, licenseYears) {
  const group = getVehicleGroup(groupId);
  if (!group) {
    throw new Error('Vehicle group not found');
  }

  if (licenseYears < 2) {
    return false;
  }

  if (driverAge < group.minAge) {
    return false;
  }

  return true;
}

module.exports = {
  listFleet,
  getVehicleGroup,
  validateDriverEligibility
};
