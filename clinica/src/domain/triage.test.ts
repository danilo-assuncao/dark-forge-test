import { describe, it, expect } from 'vitest';
import { evaluateSymptomTriage, type TriageInput } from './triage';

describe('evaluateSymptomTriage', () => {
  it('should return priority vermelho and specialty cardiologia for chestPain', () => {
    const input: TriageInput = {
      chestPain: true,
      highFever: false,
      shortnessOfBreath: false,
      durationDays: 1,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('vermelho');
    expect(result.specialty).toBe('cardiologia');
  });

  it('should return priority vermelho and specialty clinica-geral for shortnessOfBreath', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: false,
      shortnessOfBreath: true,
      durationDays: 1,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('vermelho');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should return priority amarelo and specialty clinica-geral for highFever', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: true,
      shortnessOfBreath: false,
      durationDays: 1,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('amarelo');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should return priority amarelo and specialty clinica-geral for durationDays > 5', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: false,
      shortnessOfBreath: false,
      durationDays: 6,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('amarelo');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should return priority verde and specialty clinica-geral for no severe symptoms and short duration', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: false,
      shortnessOfBreath: false,
      durationDays: 3,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('verde');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should prioritize vermelho over amarelo if both are present', () => {
    const input: TriageInput = {
      chestPain: true,
      highFever: true,
      shortnessOfBreath: false,
      durationDays: 10,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('vermelho');
    expect(result.specialty).toBe('cardiologia');
  });

  it('should return priority verde for durationDays = 5', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: false,
      shortnessOfBreath: false,
      durationDays: 5,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('verde');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should return priority verde for durationDays = 0', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: false,
      shortnessOfBreath: false,
      durationDays: 0,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('verde');
    expect(result.specialty).toBe('clinica-geral');
  });

  it('should prioritize chestPain specialty cardiologia when both chestPain and shortnessOfBreath are true', () => {
    const input: TriageInput = {
      chestPain: true,
      highFever: false,
      shortnessOfBreath: true,
      durationDays: 1,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('vermelho');
    expect(result.specialty).toBe('cardiologia');
  });

  it('should return priority vermelho and specialty clinica-geral for shortnessOfBreath and highFever', () => {
    const input: TriageInput = {
      chestPain: false,
      highFever: true,
      shortnessOfBreath: true,
      durationDays: 1,
    };
    const result = evaluateSymptomTriage(input);
    expect(result.priority).toBe('vermelho');
    expect(result.specialty).toBe('clinica-geral');
  });
});
