import { TrackingShipment } from '../types';

export const SIMULATED_SHIPMENTS: TrackingShipment[] = [
  {
    trackingCode: 'CRG-1001',
    status: 'coletado',
    estimatedDeliveryDate: '2026-12-01',
    mode: 'economico'
  },
  {
    trackingCode: 'CRG-1002',
    status: 'em-transito',
    estimatedDeliveryDate: '2026-11-20',
    mode: 'expresso'
  },
  {
    trackingCode: 'CRG-1003',
    status: 'saiu-para-entrega',
    estimatedDeliveryDate: '2026-11-22',
    mode: 'aereo-proximo-dia'
  },
  {
    trackingCode: 'CRG-1004',
    status: 'entregue',
    estimatedDeliveryDate: '2026-11-15',
    mode: 'economico'
  }
];

export function lookupShipment(code: string): TrackingShipment | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return SIMULATED_SHIPMENTS.find(
    (shipment) => shipment.trackingCode.toUpperCase() === normalizedCode
  );
}

export interface SlaEvaluation {
  isDelayed: boolean;
  daysDifference: number;
}

export function evaluateShipmentSla(shipment: TrackingShipment, referenceDateIso: string): SlaEvaluation {
  const estimatedDate = new Date(shipment.estimatedDeliveryDate);
  const referenceDate = new Date(referenceDateIso);

  // Set times to midnight for pure day comparison
  estimatedDate.setUTCHours(0, 0, 0, 0);
  referenceDate.setUTCHours(0, 0, 0, 0);

  const diffMs = estimatedDate.getTime() - referenceDate.getTime();
  const daysDifference = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (shipment.status === 'entregue') {
    return { isDelayed: false, daysDifference };
  }

  return {
    isDelayed: daysDifference < 0,
    daysDifference
  };
}
