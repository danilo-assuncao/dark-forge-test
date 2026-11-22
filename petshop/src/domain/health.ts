import { VaccineRecord } from '../types';

export type AgeStage = 'filhote' | 'adulto' | 'idoso';
export type ActivityLevel = 'baixa' | 'moderada' | 'alta';
export type VaccineName = 'V10' | 'Antirrabica' | 'Giardia';
export type VaccineStatus = 'em-dia' | 'vence-em-breve' | 'atrasada';

export interface NutritionalParams {
  weightKg: number;
  ageStage: AgeStage;
  activityLevel: ActivityLevel;
}

export interface NutritionalRecommendation {
  dailyGrams: number;
  mealsPerDay: number;
}

export interface VaccineEvaluation {
  status: VaccineStatus;
  daysUntilBooster: number;
}

export interface WalletEvaluation {
  V10: VaccineEvaluation;
  Antirrabica: VaccineEvaluation;
  Giardia: VaccineEvaluation;
}

export function calculateDailyFoodGrams({
  weightKg,
  ageStage,
  activityLevel,
}: NutritionalParams): NutritionalRecommendation {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError("Invalid weight");
  }

  const rer = 70 * Math.pow(weightKg, 0.75);
  let multiplier = 1.6;

  if (ageStage === 'filhote') {
    multiplier = 3.0;
  } else if (ageStage === 'idoso') {
    multiplier = 1.2;
  } else {
    if (activityLevel === 'baixa') multiplier = 1.2;
    else if (activityLevel === 'moderada') multiplier = 1.6;
    else if (activityLevel === 'alta') multiplier = 2.0;
  }

  const der = rer * multiplier;
  const dailyGrams = Math.round(der / 3.5);

  let mealsPerDay = 2;
  if (ageStage === 'filhote') {
    mealsPerDay = 3;
  }

  return { dailyGrams, mealsPerDay };
}

export function evaluateVaccineStatus(
  vaccineRecords: VaccineRecord[],
  vaccineName: VaccineName,
  referenceDateIso: string
): VaccineEvaluation {
  const refTime = new Date(referenceDateIso).getTime();
  if (isNaN(refTime)) {
    throw new Error('Invalid reference date');
  }

  const normalizedVaccineName = vaccineName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const relevantRecords = vaccineRecords
    .filter((r) => !isNaN(new Date(r.date).getTime()))
    .filter((r) => {
      const normalizedRecordName = r.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalizedRecordName === normalizedVaccineName;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (relevantRecords.length === 0) {
    return { status: 'atrasada', daysUntilBooster: -1 };
  }

  const lastVaccine = relevantRecords[0];
  const lastVaccineDate = new Date(lastVaccine.date);
  const refDate = new Date(referenceDateIso);

  const dueDate = new Date(lastVaccineDate);
  dueDate.setUTCFullYear(dueDate.getUTCFullYear() + 1);

  const dueDateMs = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const refDateMs = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());

  const diffTime = dueDateMs - refDateMs;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'atrasada', daysUntilBooster: diffDays };
  }

  if (diffDays <= 30) {
    return { status: 'vence-em-breve', daysUntilBooster: diffDays };
  }

  return { status: 'em-dia', daysUntilBooster: diffDays };
}

export function evaluateWallet(
  vaccineRecords: VaccineRecord[],
  referenceDateIso: string
): WalletEvaluation {
  return {
    V10: evaluateVaccineStatus(vaccineRecords, 'V10', referenceDateIso),
    Antirrabica: evaluateVaccineStatus(vaccineRecords, 'Antirrabica', referenceDateIso),
    Giardia: evaluateVaccineStatus(vaccineRecords, 'Giardia', referenceDateIso),
  };
}
