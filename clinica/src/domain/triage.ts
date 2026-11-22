import type { Specialty, TriagePriority } from '../types';

export interface TriageInput {
  chestPain: boolean;
  highFever: boolean;
  shortnessOfBreath: boolean;
  durationDays: number;
}

export interface TriageResult {
  priority: TriagePriority;
  specialty: Specialty;
}

export function evaluateSymptomTriage(input: TriageInput): TriageResult {
  if (input.chestPain || input.shortnessOfBreath) {
    return {
      priority: 'vermelho',
      specialty: input.chestPain ? 'cardiologia' : 'clinica-geral',
    };
  }

  if (input.highFever || input.durationDays > 5) {
    return {
      priority: 'amarelo',
      specialty: 'clinica-geral',
    };
  }

  return {
    priority: 'verde',
    specialty: 'clinica-geral',
  };
}
