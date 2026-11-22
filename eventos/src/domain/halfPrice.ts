import type { TicketBenefitType } from '../types';

export interface TicketOrderInput {
  ticketsQuantity: number;
  benefitType: TicketBenefitType;
  studentCardNumber?: string;
  foodDonationPledged?: boolean;
}

export function validateTicketEligibility(input: TicketOrderInput): { valid: boolean; error?: string } {
  if (input.ticketsQuantity > 4) {
    return { valid: false, error: 'Maximum of 4 tickets allowed per order' };
  }
  
  if (input.benefitType === 'estudante') {
    if (!input.studentCardNumber || input.studentCardNumber.trim() === '') {
      return { valid: false, error: 'Valid student card number required for estudante benefit' };
    }
  }
  
  if (input.benefitType === 'social') {
    if (!input.foodDonationPledged) {
      return { valid: false, error: 'Food donation pledge required for social benefit' };
    }
  }
  
  return { valid: true };
}

export function issueTicketPass(input: TicketOrderInput): { code?: string; valid: boolean; error?: string } {
  const eligibility = validateTicketEligibility(input);
  if (!eligibility.valid) {
    return { valid: false, error: eligibility.error };
  }
  
  const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, '0');
  
  return { valid: true, code: `TKT-${codeSuffix}` };
}
