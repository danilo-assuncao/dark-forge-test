import { describe, it, expect } from 'vitest';
import { validateTicketEligibility, issueTicketPass } from './halfPrice';

describe('halfPrice domain', () => {
  describe('validateTicketEligibility', () => {
    it('should invalidate orders with more than 4 tickets', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 5,
        benefitType: 'inteira'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maximum of 4 tickets allowed per order');
    });

    it('should validate orders with 4 or fewer tickets', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 4,
        benefitType: 'inteira'
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should invalidate estudante benefit without a student card number', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 2,
        benefitType: 'estudante'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Valid student card number required for estudante benefit');
      
      const resultEmpty = validateTicketEligibility({
        ticketsQuantity: 2,
        benefitType: 'estudante',
        studentCardNumber: '   '
      });
      expect(resultEmpty.valid).toBe(false);
    });

    it('should validate estudante benefit with a student card number', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 2,
        benefitType: 'estudante',
        studentCardNumber: 'STU12345'
      });
      expect(result.valid).toBe(true);
    });

    it('should invalidate social benefit without food donation pledge', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 1,
        benefitType: 'social',
        foodDonationPledged: false
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Food donation pledge required for social benefit');
    });

    it('should validate social benefit with food donation pledge', () => {
      const result = validateTicketEligibility({
        ticketsQuantity: 1,
        benefitType: 'social',
        foodDonationPledged: true
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('issueTicketPass', () => {
    it('should return error if eligibility fails', () => {
      const result = issueTicketPass({
        ticketsQuantity: 5,
        benefitType: 'inteira'
      });
      expect(result.valid).toBe(false);
      expect(result.code).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should issue a pass with code format TKT-XXXX if eligibility passes', () => {
      const result = issueTicketPass({
        ticketsQuantity: 2,
        benefitType: 'inteira'
      });
      expect(result.valid).toBe(true);
      expect(result.code).toMatch(/^TKT-[A-Z0-9]{4}$/);
      expect(result.error).toBeUndefined();
    });
  });
});
