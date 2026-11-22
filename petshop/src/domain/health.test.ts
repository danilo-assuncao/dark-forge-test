import { describe, it, expect } from 'vitest';
import { calculateDailyFoodGrams, evaluateVaccineStatus, evaluateWallet } from './health';
import { VaccineRecord } from '../types';

describe('health domain', () => {
  describe('calculateDailyFoodGrams', () => {
    it('calculates food for a filhote and ignores activity level', () => {
      const resultAlta = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'filhote',
        activityLevel: 'alta',
      });
      const resultBaixa = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'filhote',
        activityLevel: 'baixa',
      });
      // RER = 70 * 10^0.75 = 393.626
      // filhote multiplier = 3.0 -> DER = 1180.87
      // dailyGrams = 1180.87 / 3.5 = 337
      expect(resultAlta.mealsPerDay).toBe(3);
      expect(resultAlta.dailyGrams).toBe(337);
      expect(resultAlta.dailyGrams).toBe(resultBaixa.dailyGrams);
    });

    it('calculates food for an adulto moderada', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'adulto',
        activityLevel: 'moderada',
      });
      // RER = 393.626, multiplier = 1.6, DER = 629.8, daily = 180
      expect(result.mealsPerDay).toBe(2);
      expect(result.dailyGrams).toBe(180);
    });

    it('calculates food for an adulto baixa', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'adulto',
        activityLevel: 'baixa',
      });
      // multiplier = 1.2, DER = 472.35, daily = 135
      expect(result.mealsPerDay).toBe(2);
      expect(result.dailyGrams).toBe(135);
    });

    it('calculates food for an adulto alta', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'adulto',
        activityLevel: 'alta',
      });
      // multiplier = 2.0, DER = 787.25, daily = 225
      expect(result.mealsPerDay).toBe(2);
      expect(result.dailyGrams).toBe(225);
    });
    
    it('calculates food for an idoso and ignores activity level', () => {
      const resultBaixa = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'idoso',
        activityLevel: 'baixa',
      });
      const resultAlta = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'idoso',
        activityLevel: 'alta',
      });
      // multiplier = 1.2, DER = 472.35, daily = 135
      expect(resultBaixa.mealsPerDay).toBe(2);
      expect(resultBaixa.dailyGrams).toBe(135);
      expect(resultBaixa.dailyGrams).toBe(resultAlta.dailyGrams);
    });

    it('throws RangeError for invalid weight', () => {
      expect(() => calculateDailyFoodGrams({ weightKg: 0, ageStage: 'adulto', activityLevel: 'moderada' })).toThrow(RangeError);
      expect(() => calculateDailyFoodGrams({ weightKg: -5, ageStage: 'adulto', activityLevel: 'moderada' })).toThrow(RangeError);
      expect(() => calculateDailyFoodGrams({ weightKg: NaN, ageStage: 'adulto', activityLevel: 'moderada' })).toThrow(RangeError);
    });
  });

  describe('evaluateVaccineStatus', () => {
    it('throws for invalid reference date', () => {
      expect(() => evaluateVaccineStatus([], 'V10', 'invalid-date')).toThrow('Invalid reference date');
    });

    it('returns atrasada if no record exists', () => {
      const result = evaluateVaccineStatus([], 'V10', '2023-10-01T00:00:00.000Z');
      expect(result.status).toBe('atrasada');
      expect(result.daysUntilBooster).toBe(-1);
    });

    it('ignores invalid dates in records and uses valid latest record', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: 'invalid-date', veterinarian: 'Dr. John' },
        { id: '2', name: 'V10', date: '2022-01-01T00:00:00.000Z', veterinarian: 'Dr. John' },
        { id: '3', name: 'V10', date: '2022-06-01T00:00:00.000Z', veterinarian: 'Dr. John' },
      ];
      // 1 year from 2022-06-01 is 2023-06-01. ref is 2023-05-01. difference is 31 days.
      const result = evaluateVaccineStatus(records, 'V10', '2023-05-01T00:00:00.000Z');
      expect(result.status).toBe('em-dia');
      expect(result.daysUntilBooster).toBe(31);
    });

    it('handles leap day (Feb 29) rollover to Mar 1 in non-leap year', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2020-02-29T10:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // 1 year from 2020-02-29 is Mar 1 2021. 
      // If reference is 2021-02-28, diff is 1 day.
      const result = evaluateVaccineStatus(records, 'V10', '2021-02-28T10:00:00.000Z');
      expect(result.status).toBe('vence-em-breve');
      expect(result.daysUntilBooster).toBe(1);
    });

    it('handles exactly 31 days (em-dia boundary)', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // Due: 2023-10-15. Ref: 2023-09-14. Diff = 31 days.
      const result = evaluateVaccineStatus(records, 'V10', '2023-09-14T00:00:00.000Z');
      expect(result.status).toBe('em-dia');
      expect(result.daysUntilBooster).toBe(31);
    });

    it('handles exactly 30 days (vence-em-breve boundary)', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // Due: 2023-10-15. Ref: 2023-09-15. Diff = 30 days.
      const result = evaluateVaccineStatus(records, 'V10', '2023-09-15T00:00:00.000Z');
      expect(result.status).toBe('vence-em-breve');
      expect(result.daysUntilBooster).toBe(30);
    });

    it('handles exactly 0 days (due today boundary)', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // Due: 2023-10-15. Ref: 2023-10-15. Diff = 0 days.
      const result = evaluateVaccineStatus(records, 'V10', '2023-10-15T00:00:00.000Z');
      expect(result.status).toBe('vence-em-breve');
      expect(result.daysUntilBooster).toBe(0);
    });

    it('handles exactly -1 day (atrasada boundary)', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // Due: 2023-10-15. Ref: 2023-10-16. Diff = -1 day.
      const result = evaluateVaccineStatus(records, 'V10', '2023-10-16T00:00:00.000Z');
      expect(result.status).toBe('atrasada');
      expect(result.daysUntilBooster).toBe(-1);
    });
    
    it('is robust to timezone differences (DST)', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2023-01-10T12:00:00.000-03:00', veterinarian: 'Dr. John' }
      ];
      // Due: 2024-01-10. Ref: 2024-01-08T12:00:00.000Z.
      const result = evaluateVaccineStatus(records, 'V10', '2024-01-08T12:00:00.000Z');
      // Days from Jan 8 UTC to Jan 10 UTC is 2 days.
      expect(result.status).toBe('vence-em-breve');
      expect(result.daysUntilBooster).toBe(2);
    });
  });

  describe('evaluateWallet', () => {
    it('evaluates all three vaccines', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2023-01-01T00:00:00.000Z', veterinarian: 'Dr. John' },
        { id: '2', name: 'Antirrabica', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' },
        // Giardia missing
      ];
      
      const result = evaluateWallet(records, '2023-10-01T00:00:00.000Z');
      
      expect(result.V10.status).toBe('em-dia');
      expect(result.Antirrabica.status).toBe('vence-em-breve');
      expect(result.Giardia.status).toBe('atrasada');
    });
  });
});