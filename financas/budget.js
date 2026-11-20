'use strict';

const TARGETS = Object.freeze({ essentials: 50, lifestyle: 30, savings: 20 });
const RESERVE_MONTHS = Object.freeze({ clt: 6, autonomo: 12 });

function assertAmount(value, name, { positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0 || (positive && value === 0)) {
    throw new RangeError(`${name} must be ${positive ? 'positive' : 'non-negative'}`);
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Accepts `employmentType` (canonical) and `EmploymentType` (alias from the brief).
function analyzeMonthlyBudget({
  netIncomeBrl,
  essentialsBrl,
  lifestyleBrl,
  employmentType,
  EmploymentType,
} = {}) {
  const type = employmentType ?? EmploymentType ?? 'clt';
  assertAmount(netIncomeBrl, 'netIncomeBrl', { positive: true });
  assertAmount(essentialsBrl, 'essentialsBrl');
  assertAmount(lifestyleBrl, 'lifestyleBrl');
  if (typeof type !== 'string' || !Object.hasOwn(RESERVE_MONTHS, type)) {
    throw new RangeError("employmentType must be 'clt' or 'autonomo'");
  }

  const monthlySavingsCapacityBrl = round2(netIncomeBrl - essentialsBrl - lifestyleBrl);
  const pct = (amount) => round2((amount / netIncomeBrl) * 100);
  const actual = {
    essentials: pct(essentialsBrl),
    lifestyle: pct(lifestyleBrl),
    savings: pct(netIncomeBrl - essentialsBrl - lifestyleBrl),
  };
  const months = RESERVE_MONTHS[type];

  return {
    employmentType: type,
    targetPercentages: { ...TARGETS },
    actualPercentages: actual,
    differencePercentages: {
      essentials: round2(actual.essentials - TARGETS.essentials),
      lifestyle: round2(actual.lifestyle - TARGETS.lifestyle),
      savings: round2(actual.savings - TARGETS.savings),
    },
    monthlySavingsCapacityBrl,
    emergencyReserveMonths: months,
    emergencyReserveTargetBrl: round2(essentialsBrl * months),
  };
}

module.exports = { analyzeMonthlyBudget };
