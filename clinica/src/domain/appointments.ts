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

export function quoteAppointment(input: QuoteInput): QuoteResult {
  const doctor: DoctorProfile | undefined = getDoctorById(input.doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
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

  const randomString = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
  const protocol = `MED-${randomString}`;

  return {
    protocol,
    finalPrice,
    doctorName: doctor.name
  };
}
