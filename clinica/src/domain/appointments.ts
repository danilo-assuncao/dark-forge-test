import { getDoctorById } from '../data/doctors';
import type { DoctorProfile } from '../types';

export type AppointmentMode = 'presencial' | 'telemedicina';
export type HealthPlan = 'convenio-plus' | 'convenio-basico' | 'particular';

export interface QuoteInput {
  doctorId: string;
  mode: AppointmentMode;
  plan: HealthPlan;
  basePrice: number;
}

export interface QuoteResult {
  protocol: string;
  finalPrice: number;
  doctorName: string;
}

export function quoteAppointment(
  input: QuoteInput,
  generateId: () => string = () => crypto.randomUUID().split('-')[0].toUpperCase()
): QuoteResult {
  if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
    throw new RangeError('Invalid basePrice');
  }

  const doctor: DoctorProfile | undefined = getDoctorById(input.doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }
  if (!doctor.active) {
    throw new Error('Doctor inactive');
  }

  let currentPrice = input.basePrice;

  if (input.mode === 'telemedicina') {
    currentPrice = currentPrice * 0.85;
  }

  let finalPrice = currentPrice;
  if (input.plan === 'convenio-plus') {
    finalPrice = 0;
  } else if (input.plan === 'convenio-basico') {
    finalPrice = currentPrice * 0.30;
  }

  // Rounding to 2 decimal places for money arithmetic
  finalPrice = Math.round(finalPrice * 100) / 100;

  const protocol = `MED-${generateId()}`;

  return {
    protocol,
    finalPrice,
    doctorName: doctor.name
  };
}
