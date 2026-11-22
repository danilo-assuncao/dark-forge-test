import { describe, it, expect } from 'vitest';
import { calculateDailyFoodGrams, evaluateVaccineStatus, evaluateWallet } from './health';
import { VaccineRecord } from '../types';

describe('health domain', () => {
  describe('calculateDailyFoodGrams', () => {
    it('calculates food for a filhote', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'filhote',
        activityLevel: 'alta', // should ignore and use puppy multiplier
      });
      expect(result.mealsPerDay).toBe(3);
      expect(result.dailyGrams).toBeGreaterThan(0);
    });

    it('calculates food for an adulto moderada', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'adulto',
        activityLevel: 'moderada',
      });
      expect(result.mealsPerDay).toBe(2);
      expect(result.dailyGrams).toBeGreaterThan(0);
    });
    
    it('calculates food for an idoso', () => {
      const result = calculateDailyFoodGrams({
        weightKg: 10,
        ageStage: 'idoso',
        activityLevel: 'baixa', // ignores and uses senior multiplier
      });
      expect(result.mealsPerDay).toBe(2);
      expect(result.dailyGrams).toBeGreaterThan(0);
    });
  });

  describe('evaluateVaccineStatus', () => {
    it('returns atrasada if no record exists', () => {
      const result = evaluateVaccineStatus([], 'V10', '2023-10-01T00:00:00.000Z');
      expect(result.status).toBe('atrasada');
      expect(result.daysUntilBooster).toBeLessThan(0);
    });

    it('returns em-dia if vaccine is recent', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'V10', date: '2023-05-01T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      const result = evaluateVaccineStatus(records, 'V10', '2023-10-01T00:00:00.000Z');
      expect(result.status).toBe('em-dia');
      expect(result.daysUntilBooster).toBeGreaterThan(30);
    });

    it('returns vence-em-breve if <= 30 days left', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'Antirrábica', date: '2022-10-15T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // 1 year from 2022-10-15 is 2023-10-15. So on 2023-10-01, there are 14 days left.
      const result = evaluateVaccineStatus(records, 'Antirrabica', '2023-10-01T00:00:00.000Z');
      expect(result.status).toBe('vence-em-breve');
      expect(result.daysUntilBooster).toBe(14);
    });

    it('returns atrasada if > 1 year has passed', () => {
      const records: VaccineRecord[] = [
        { id: '1', name: 'Giardia', date: '2022-05-01T00:00:00.000Z', veterinarian: 'Dr. John' }
      ];
      // 1 year from 2022-05-01 is 2023-05-01. So on 2023-10-01, it is late.
      const result = evaluateVaccineStatus(records, 'Giardia', '2023-10-01T00:00:00.000Z');
      expect(result.status).toBe('atrasada');
      expect(result.daysUntilBooster).toBeLessThan(0);
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
