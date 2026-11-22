import { describe, it, expect } from 'vitest';
import { lookupShipment, evaluateShipmentSla, SIMULATED_SHIPMENTS } from './tracking';

describe('Tracking Domain', () => {
  describe('lookupShipment', () => {
    it('should find a shipment by case-insensitive code', () => {
      const shipment = lookupShipment('crg-1002');
      expect(shipment).toBeDefined();
      expect(shipment?.trackingCode).toBe('CRG-1002');
    });

    it('should find a shipment ignoring whitespace', () => {
      const shipment = lookupShipment('  CRG-1003  ');
      expect(shipment).toBeDefined();
      expect(shipment?.trackingCode).toBe('CRG-1003');
    });

    it('should return undefined for an unknown code', () => {
      const shipment = lookupShipment('CRG-9999');
      expect(shipment).toBeUndefined();
    });
    
    it('should return undefined for empty or whitespace-only code', () => {
      expect(lookupShipment('')).toBeUndefined();
      expect(lookupShipment('   ')).toBeUndefined();
    });

    it('should contain all required simulated statuses', () => {
      const statuses = SIMULATED_SHIPMENTS.map(s => s.status);
      expect(statuses).toContain('coletado');
      expect(statuses).toContain('em-transito');
      expect(statuses).toContain('saiu-para-entrega');
      expect(statuses).toContain('entregue');
    });
  });

  describe('evaluateShipmentSla', () => {
    it('should throw an error if reference date is invalid', () => {
      const shipment = lookupShipment('CRG-1002')!;
      expect(() => evaluateShipmentSla(shipment, 'garbage')).toThrow('Invalid date');
      expect(() => evaluateShipmentSla(shipment, '')).toThrow('Invalid date');
    });
    
    it('should throw an error if estimated date is invalid', () => {
      const shipment = {
        ...lookupShipment('CRG-1002')!,
        estimatedDeliveryDate: 'garbage'
      };
      expect(() => evaluateShipmentSla(shipment, '2026-11-20T10:00:00Z')).toThrow('Invalid date');
    });

    it.each([
      ['CRG-1001'], // coletado
      ['CRG-1002'], // em-transito
      ['CRG-1003'], // saiu-para-entrega
    ])('should mark as delayed if reference date is past the estimated date for non-delivered %s', (code) => {
      const shipment = lookupShipment(code)!;
      // estimatedDate + 5 days
      const estimatedTime = new Date(shipment.estimatedDeliveryDate).getTime();
      const pastDateIso = new Date(estimatedTime + 5 * 24 * 60 * 60 * 1000).toISOString();
      const evaluation = evaluateShipmentSla(shipment, pastDateIso);
      expect(evaluation.isDelayed).toBe(true);
      expect(evaluation.daysDifference).toBe(-5);
    });

    it('should not mark as delayed if reference date is before the estimated date', () => {
      const shipment = lookupShipment('CRG-1001')!; // estimated: 2026-12-01
      const evaluation = evaluateShipmentSla(shipment, '2026-11-20T10:00:00Z');
      expect(evaluation.isDelayed).toBe(false);
      expect(evaluation.daysDifference).toBe(11);
    });

    it('should not mark as delayed if status is entregue', () => {
      const shipment = lookupShipment('CRG-1004')!; // estimated: 2026-11-15, status: entregue
      const evaluation = evaluateShipmentSla(shipment, '2026-11-20T10:00:00Z'); // technically past
      expect(evaluation.isDelayed).toBe(false);
      expect(evaluation.daysDifference).toBe(-5);
    });
    
    it('should not mark as delayed on the exact estimated date (end of day)', () => {
      const shipment = lookupShipment('CRG-1002')!; // estimated: 2026-11-20
      const evaluation = evaluateShipmentSla(shipment, '2026-11-20T23:59:59Z');
      expect(evaluation.isDelayed).toBe(false);
      expect(evaluation.daysDifference).toBe(0);
    });
    
    it('should not mark as delayed on the exact estimated date (start of day)', () => {
      const shipment = lookupShipment('CRG-1002')!; // estimated: 2026-11-20
      const evaluation = evaluateShipmentSla(shipment, '2026-11-20T00:00:00Z');
      expect(evaluation.isDelayed).toBe(false);
      expect(evaluation.daysDifference).toBe(0);
    });
    
    it('should mark as delayed on the first instant of the following day', () => {
      const shipment = lookupShipment('CRG-1002')!; // estimated: 2026-11-20
      const evaluation = evaluateShipmentSla(shipment, '2026-11-21T00:00:00Z');
      expect(evaluation.isDelayed).toBe(true);
      expect(evaluation.daysDifference).toBe(-1);
    });
    
    it('should calculate delay correctly with non-UTC offset', () => {
      const shipment = lookupShipment('CRG-1002')!; // estimated: 2026-11-20
      // 2026-11-20T23:00:00-03:00 is 2026-11-21T02:00:00Z (which is next day UTC)
      const evaluation = evaluateShipmentSla(shipment, '2026-11-20T23:00:00-03:00');
      expect(evaluation.isDelayed).toBe(true);
      expect(evaluation.daysDifference).toBe(-1);
    });
  });
});
