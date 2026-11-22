import type { TicketBenefitType } from '../types';

export interface TicketOrderInput {
  ticketsQuantity: number;
  benefitType: TicketBenefitType;
  studentCardNumber?: string;
  foodDonationPledged?: boolean;
}

export function validateTicketEligibility(input: TicketOrderInput): { valid: boolean; error?: string } {
  if (!Number.isInteger(input.ticketsQuantity) || input.ticketsQuantity < 1 || input.ticketsQuantity > 4) {
    return { valid: false, error: 'Tickets quantity must be an integer between 1 and 4' };
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

export function issueTicketPass(
  input: TicketOrderInput,
  generateSuffix: () => string = () => crypto.randomUUID().substring(0, 4).toUpperCase()
): { code?: string; valid: boolean; error?: string } {
  const eligibility = validateTicketEligibility(input);
  if (!eligibility.valid) {
    return { valid: false, error: eligibility.error };
  }
  
  const codeSuffix = generateSuffix();
  
  return { valid: true, code: `TKT-${codeSuffix}` };
}
