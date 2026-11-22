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

    it('should contain all required simulated statuses', () => {
      const statuses = SIMULATED_SHIPMENTS.map(s => s.status);
      expect(statuses).toContain('coletado');
      expect(statuses).toContain('em-transito');
      expect(statuses).toContain('saiu-para-entrega');
      expect(statuses).toContain('entregue');
    });
  });

  describe('evaluateShipmentSla', () => {
    it('should mark as delayed if reference date is past the estimated date', () => {
      const shipment = lookupShipment('CRG-1002'); // estimated: 2026-11-20
      expect(shipment).toBeDefined();
      if (shipment) {
        const evaluation = evaluateShipmentSla(shipment, '2026-11-25T10:00:00Z');
        expect(evaluation.isDelayed).toBe(true);
        expect(evaluation.daysDifference).toBe(-5);
      }
    });

    it('should not mark as delayed if reference date is before the estimated date', () => {
      const shipment = lookupShipment('CRG-1001'); // estimated: 2026-12-01
      expect(shipment).toBeDefined();
      if (shipment) {
        const evaluation = evaluateShipmentSla(shipment, '2026-11-20T10:00:00Z');
        expect(evaluation.isDelayed).toBe(false);
        expect(evaluation.daysDifference).toBe(11);
      }
    });

    it('should not mark as delayed if status is entregue', () => {
      const shipment = lookupShipment('CRG-1004'); // estimated: 2026-11-15, status: entregue
      expect(shipment).toBeDefined();
      if (shipment) {
        const evaluation = evaluateShipmentSla(shipment, '2026-11-20T10:00:00Z'); // technically past
        expect(evaluation.isDelayed).toBe(false);
        expect(evaluation.daysDifference).toBe(-5);
      }
    });
    
    it('should not mark as delayed on the exact estimated date', () => {
      const shipment = lookupShipment('CRG-1002'); // estimated: 2026-11-20
      expect(shipment).toBeDefined();
      if (shipment) {
        const evaluation = evaluateShipmentSla(shipment, '2026-11-20T23:59:59Z');
        expect(evaluation.isDelayed).toBe(false);
        expect(evaluation.daysDifference).toBe(0);
      }
    });
  });
});
