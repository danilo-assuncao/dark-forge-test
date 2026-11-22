import { useState, useMemo } from 'react';
import { listDestinations, filterDestinationsByScope } from './data/destinations';
import { buildTravelPackageQuote } from './domain/packages';
import type { PackageQuote } from './domain/packages';
import { finalizeTripCheckout } from './domain/miles';
import type { CheckoutResult } from './domain/miles';
import type { RegionScope, CabinClass } from './types';
import './App.css';

export default function App() {
  const [filter, setFilter] = useState<'all' | RegionScope>('all');
  const [selectedDestId, setSelectedDestId] = useState<string>('');

  const [travelers, setTravelers] = useState<number>(1);
  const [cabinClass, setCabinClass] = useState<CabinClass>('economica');
  const [hotelDays, setHotelDays] = useState<number>(0);
  const [hotelDailyRate, setHotelDailyRate] = useState<number>(0);
  const [extraBaggageCount, setExtraBaggageCount] = useState<number>(0);
  const [extraBaggageUnitRate, setExtraBaggageUnitRate] = useState<number>(0);
  const [selectedExcursions, setSelectedExcursions] = useState<string[]>([]);

  const [miles, setMiles] = useState<number>(0);
  const [hasTravelInsurance, setHasTravelInsurance] = useState<boolean>(false);
  const [coupon, setCoupon] = useState<string>('');

  const destinations = useMemo(() => {
    return filter === 'all' ? listDestinations() : filterDestinationsByScope(filter);
  }, [filter]);

  const selectedDestination = useMemo(() => {
    return destinations.find(d => d.id === selectedDestId) || null;
  }, [destinations, selectedDestId]);

  // Handle excursion toggle
  const toggleExcursion = (id: string) => {
    setSelectedExcursions(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  // Quote result
  const quoteResult: PackageQuote | null = useMemo(() => {
    if (!selectedDestination) return null;
    try {
      return buildTravelPackageQuote({
        destinationId: selectedDestination.id,
        travelers,
        cabinClass,
        hotelDays,
        hotelDailyRate,
        extraBaggageCount,
        extraBaggageUnitRate,
        selectedExcursionIds: selectedExcursions
      });
    } catch (err) {
      return null;
    }
  }, [selectedDestination, travelers, cabinClass, hotelDays, hotelDailyRate, extraBaggageCount, extraBaggageUnitRate, selectedExcursions]);

  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string>('');

  const handleCheckout = () => {
    if (!selectedDestination) return;
    try {
      setCheckoutError('');
      const res = finalizeTripCheckout({
        destination: selectedDestination,
        miles,
        hasTravelInsurance,
        coupon
      });
      setCheckoutResult(res);
    } catch (err: any) {
      setCheckoutError(err.message || 'Erro ao finalizar viagem');
      setCheckoutResult(null);
    }
  };

  return (
    <div className="app-container">
      <h1>Dan Trip - Monte sua Viagem</h1>

      <section className="filter-section">
        <label>
          Filtro de Destino:
          <select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">Todos</option>
            <option value="nacional">Nacional</option>
            <option value="internacional">Internacional</option>
          </select>
        </label>
      </section>

      <section className="destination-list">
        <h2>Destinos</h2>
        <ul aria-label="Lista de Destinos">
          {destinations.map(dest => (
            <li key={dest.id} className={dest.id === selectedDestId ? 'selected' : ''}>
              <div 
                role="button"
                data-testid={`dest-${dest.id}`}
                onClick={() => {
                  setSelectedDestId(dest.id);
                  setCabinClass(dest.availableCabins[0]);
                  setSelectedExcursions([]);
                  setCheckoutResult(null);
                  setCheckoutError('');
                }}
              >
                <strong>{dest.name}</strong> - {dest.scope} (R$ {dest.price})
              </div>
            </li>
          ))}
        </ul>
      </section>

      {selectedDestination && (
        <div className="package-builder">
          <section className="quote-form">
            <h2>Montador de Pacotes</h2>
            <div className="form-group">
              <label>Viajantes:</label>
              <input type="number" min="1" data-testid="input-travelers" value={travelers} onChange={e => setTravelers(Number(e.target.value))} />
            </div>
            
            <div className="form-group">
              <label>Classe de Cabine:</label>
              <select data-testid="select-cabin" value={cabinClass} onChange={e => setCabinClass(e.target.value as CabinClass)}>
                {selectedDestination.availableCabins.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Dias de Hotel:</label>
              <input type="number" min="0" data-testid="input-hotelDays" value={hotelDays} onChange={e => setHotelDays(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Diária de Hotel (R$):</label>
              <input type="number" min="0" data-testid="input-hotelRate" value={hotelDailyRate} onChange={e => setHotelDailyRate(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Qtd Bagagem Extra:</label>
              <input type="number" min="0" data-testid="input-baggageCount" value={extraBaggageCount} onChange={e => setExtraBaggageCount(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Valor Bagagem Extra (R$):</label>
              <input type="number" min="0" data-testid="input-baggageRate" value={extraBaggageUnitRate} onChange={e => setExtraBaggageUnitRate(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label>Passeios:</label>
              {selectedDestination.excursions.map(exc => (
                <label key={exc.id} className="checkbox-label">
                  <input type="checkbox" data-testid={`exc-${exc.id}`} checked={selectedExcursions.includes(exc.id)} onChange={() => toggleExcursion(exc.id)} />
                  {exc.name} (R$ {exc.price})
                </label>
              ))}
            </div>

            {quoteResult && (
              <div className="quote-result">
                <h3>Resumo do Pacote</h3>
                <p>Passagens: R$ {quoteResult.airfareTotal}</p>
                <p>Hospedagem: R$ {quoteResult.hotelTotal}</p>
                <p>Bagagem: R$ {quoteResult.baggageTotal}</p>
                <p>Passeios: R$ {quoteResult.excursionsTotal}</p>
                <p>Subtotal: R$ {quoteResult.subtotal}</p>
                <p>Desconto: R$ {quoteResult.discount}</p>
                <p data-testid="quote-total"><strong>Total do Pacote: R$ {quoteResult.total}</strong></p>
              </div>
            )}
          </section>

          <section className="checkout-form">
            <h2>Finalizar Viagem (Milhas e Checkout)</h2>
            <div className="form-group">
              <label>Milhas:</label>
              <input type="range" min="0" max="100000" step="1000" data-testid="slider-miles" value={miles} onChange={e => setMiles(Number(e.target.value))} />
              <input type="number" min="0" data-testid="input-miles" value={miles} onChange={e => setMiles(Number(e.target.value))} />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" data-testid="check-insurance" checked={hasTravelInsurance} onChange={e => setHasTravelInsurance(e.target.checked)} />
                Seguro Viagem (Obrigatório para internacional)
              </label>
            </div>

            <div className="form-group">
              <label>Cupom (ex: DANTRIP10):</label>
              <input type="text" data-testid="input-coupon" value={coupon} onChange={e => setCoupon(e.target.value)} />
            </div>

            <button onClick={handleCheckout} data-testid="btn-checkout">Gerar Localizador TRP-XXXX</button>

            {checkoutError && <p className="error" data-testid="checkout-error">{checkoutError}</p>}

            {checkoutResult && (
              <div className="checkout-result">
                <h3>Viagem Finalizada</h3>
                <p>Desconto Milhas: R$ {checkoutResult.milesDiscount}</p>
                <p>Desconto Cupom: R$ {checkoutResult.couponDiscount}</p>
                <p data-testid="checkout-final">Valor Final: R$ {checkoutResult.finalValue}</p>
                {checkoutResult.exchangeEstimate && (
                  <p>Estimativa em USD: $ {checkoutResult.exchangeEstimate}</p>
                )}
                <p className="locator" data-testid="locator">Localizador: <strong>{checkoutResult.locator}</strong></p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
