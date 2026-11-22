import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { lookupShipment, evaluateShipmentSla } from '../domain/tracking';
import type { SlaEvaluation } from '../domain/tracking';
import type { TrackingShipment } from '../types';

export const TrackingPanel: React.FC = () => {
  const [code, setCode] = useState('');
  const [shipment, setShipment] = useState<TrackingShipment | null>(null);
  const [sla, setSla] = useState<SlaEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = lookupShipment(code);
    if (result) {
      setShipment(result);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localDateIso = `${year}-${month}-${day}T00:00:00Z`;
      setSla(evaluateShipmentSla(result, localDateIso));
      setError(null);
    } else {
      setShipment(null);
      setSla(null);
      setError('Encomenda não encontrada.');
    }
  };

  return (
    <div className="tracking-panel">
      <h2>Rastreamento de Encomendas</h2>
      <form onSubmit={handleSubmit} className="tracking-form">
        <div className="form-group">
          <label htmlFor="trackingCode">Código de Rastreio (Ex: CRG-1001)</label>
          <input 
            id="trackingCode"
            type="text" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            placeholder="CRG-1001" 
          />
        </div>
        <button type="submit">Buscar</button>
      </form>

      {error && <div className="error">{error}</div>}

      {shipment && sla && (
        <div className="tracking-results" data-testid="tracking-results">
          <h3>Status da Encomenda: {shipment.trackingCode}</h3>
          <p><strong>Modalidade:</strong> <span style={{ textTransform: 'capitalize' }}>{shipment.mode.replace(/-/g, ' ')}</span></p>
          <p><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{shipment.status.replace(/-/g, ' ')}</span></p>
          <p><strong>Previsão de Entrega:</strong> {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
          
          <div className="sla-status">
            <h4>Status de SLA</h4>
            {sla.isDelayed ? (
              <p className="delayed" data-testid="sla-delayed">Atrasado ({-sla.daysDifference} dias)</p>
            ) : (
              <p className="on-time" data-testid="sla-on-time">
                {shipment.status === 'entregue' ? 'Entregue' : `No prazo (${sla.daysDifference} dias restantes)`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
