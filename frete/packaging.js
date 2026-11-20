'use strict';

// Dimensions are in centimeters; the volumetric divisor is 6000 cm³/kg.
function billableWeightKg(actualKg, lengthCm, widthCm, heightCm) {
  for (const [name, value] of Object.entries({ actualKg, lengthCm, widthCm, heightCm })) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number.`);
    }
    if (value <= 0) {
      throw new RangeError(`${name} must be positive.`);
    }
  }

  const volumetricKg = (lengthCm * widthCm * heightCm) / 6000;
  const weightKg = Math.max(actualKg, volumetricKg);
  if (!Number.isFinite(weightKg)) {
    throw new RangeError('Billable weight is too large to represent.');
  }
  // Large weights already have no precision below a thousandth.
  return weightKg >= 1e13 ? weightKg : Math.round(weightKg * 1000) / 1000;
}

module.exports = { billableWeightKg };
