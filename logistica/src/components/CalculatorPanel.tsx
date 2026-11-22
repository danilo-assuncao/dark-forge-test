import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { calculateFreightQuote } from '../domain/freight';
import type { FreightQuoteInput, FreightQuoteResult } from '../domain/freight';
import { listRoutes } from '../data/zones';
import type { ZoneRoute, ShippingMode } from '../types';

interface FormState {
  originUf: string;
  destUf: string;
  actualWeightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  declaredValueBrl: string;
  quantity: string;
  coupon: string;
}

interface QuoteResultData {
  submittedInput: FreightQuoteInput;
  quotes: Record<ShippingMode, FreightQuoteResult>;
}

const mapDomainError = (err: unknown): string => {
  if (err instanceof Error) {
    if (err.message.includes('Weight and dimensions must be positive finite numbers')) {
      return 'Peso e dimensões devem ser números positivos.';
    }
    if (err.message.includes('Quantity must be a positive integer')) {
      return 'A quantidade deve ser um número inteiro positivo.';
    }
    if (err.message.includes('Declared value must be a non-negative finite number')) {
      return 'O valor declarado deve ser um número não-negativo.';
    }
    if (err.message.includes('Route not found')) {
      return 'Rota não encontrada para as UFs selecionadas.';
    }
    return err.message;
  }
  return 'Erro ao calcular frete';
};

export const CalculatorPanel: React.FC = () => {
  const [input, setInput] = useState<FormState>({
    originUf: 'SP',
    destUf: 'RJ',
    actualWeightKg: '1',
    lengthCm: '20',
    widthCm: '20',
    heightCm: '20',
    declaredValueBrl: '100',
    quantity: '1',
    coupon: ''
  });

  const [result, setResult] = useState<QuoteResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routes] = useState<ZoneRoute[]>(listRoutes());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const parsedInput: FreightQuoteInput = {
        originUf: input.originUf,
        destUf: input.destUf,
        actualWeightKg: Number(input.actualWeightKg),
        lengthCm: Number(input.lengthCm),
        widthCm: Number(input.widthCm),
        heightCm: Number(input.heightCm),
        declaredValueBrl: Number(input.declaredValueBrl),
        quantity: Number(input.quantity),
        coupon: input.coupon || undefined
      };

      const quotes: Record<ShippingMode, FreightQuoteResult> = {
        'economico': calculateFreightQuote({ ...parsedInput, mode: 'economico' }),
        'expresso': calculateFreightQuote({ ...parsedInput, mode: 'expresso' }),
        'aereo-proximo-dia': calculateFreightQuote({ ...parsedInput, mode: 'aereo-proximo-dia' })
      };

      setResult({ submittedInput: parsedInput, quotes });
    } catch (err: unknown) {
      setResult(null);
      setError(mapDomainError(err));
    }
  };

  const getUfs = () => {
    const ufs = new Set<string>();
    routes.forEach(r => {
      ufs.add(r.originUf);
      ufs.add(r.destUf);
    });
    return Array.from(ufs).sort();
  };

  return (
    <div className="calculator-panel">
      <h2>Calculadora de Frete</h2>
      <form onSubmit={handleSubmit} className="calculator-form">
        {error && <div className="error">{error}</div>}
        <div className="form-group">
          <label htmlFor="originUf">Origem (UF)</label>
          <select id="originUf" name="originUf" value={input.originUf} onChange={handleChange}>
            {getUfs().map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="destUf">Destino (UF)</label>
          <select id="destUf" name="destUf" value={input.destUf} onChange={handleChange}>
            {getUfs().map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="actualWeightKg">Peso Real (kg)</label>
          <input id="actualWeightKg" type="number" step="0.1" name="actualWeightKg" value={input.actualWeightKg} onChange={handleChange} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="lengthCm">Comp. (cm)</label>
            <input id="lengthCm" type="number" step="1" name="lengthCm" value={input.lengthCm} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="widthCm">Largura (cm)</label>
            <input id="widthCm" type="number" step="1" name="widthCm" value={input.widthCm} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="heightCm">Altura (cm)</label>
            <input id="heightCm" type="number" step="1" name="heightCm" value={input.heightCm} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="declaredValueBrl">Valor Declarado (R$)</label>
          <input id="declaredValueBrl" type="number" step="0.01" name="declaredValueBrl" value={input.declaredValueBrl} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="quantity">Quantidade</label>
          <input id="quantity" type="number" step="1" name="quantity" value={input.quantity} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="coupon">Cupom (Ex: DANCARGO10)</label>
          <input id="coupon" type="text" name="coupon" value={input.coupon} onChange={handleChange} placeholder="DANCARGO10" />
        </div>
        <button type="submit">Calcular</button>
      </form>

      {result && (
        <div className="calculator-results" data-testid="calculator-results">
          <h3>Resultados</h3>
          <p><strong>Peso Real:</strong> {result.submittedInput.actualWeightKg} kg</p>
          <p><strong>Peso Cubado:</strong> {result.quotes.economico.volumetricWeightKg.toFixed(2)} kg</p>
          <p><strong>Peso Faturado:</strong> {result.quotes.economico.billableWeightKg.toFixed(2)} kg</p>
          
          <div className="modalities-comparison">
            <h4>Comparador de Modalidades</h4>
            <div className="modality">
              <strong>Econômico:</strong> R$ {result.quotes.economico.totalFreight.toFixed(2)}
            </div>
            <div className="modality">
              <strong>Expresso:</strong> R$ {result.quotes.expresso.totalFreight.toFixed(2)}
            </div>
            <div className="modality">
              <strong>Aéreo Próximo Dia:</strong> R$ {result.quotes['aereo-proximo-dia'].totalFreight.toFixed(2)}
            </div>
          </div>

          {result.quotes.economico.shippingLabel && (
            <div className="dispatch-section">
              <h4>Pré-autorização de Despacho</h4>
              <div className="shipping-label">{result.quotes.economico.shippingLabel}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
