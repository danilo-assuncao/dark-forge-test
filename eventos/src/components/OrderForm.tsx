import { useState } from 'react';
import { calculateTicketsOrder } from '../domain/pricing';
import { issueTicketPass } from '../domain/halfPrice';
import type { LiveEventItem, SectorTier, BatchNumber, TicketBenefitType } from '../types';
import type { OrderInput } from '../domain/pricing';
import type { TicketOrderInput } from '../domain/halfPrice';

interface OrderFormProps {
  event: LiveEventItem;
  onIssueTicket: (code: string) => void;
  onCancel: () => void;
}

export function OrderForm({ event, onIssueTicket, onCancel }: OrderFormProps) {
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [sector, setSector] = useState<SectorTier>(event.sector);
  const [batch, setBatch] = useState<BatchNumber>(event.batch);
  const [benefit, setBenefit] = useState<TicketBenefitType>(event.benefit);
  const [studentCard, setStudentCard] = useState('');
  const [foodPledge, setFoodPledge] = useState(false);
  const [delivery, setDelivery] = useState<'digital' | 'bilheteria'>('digital');
  const [coupon, setCoupon] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  const orderInput: OrderInput = {
    items: [{ eventId: event.id, quantity: typeof quantity === 'number' ? quantity : 1, sector, batch, benefit }],
    deliveryMethod: delivery,
    coupon
  };

  let pricing = { subtotal: 0, discount: 0, fee: 0, total: 0 };
  let currentPricingError: string | null = null;
  try {
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 4) {
      throw new Error('Quantidade inválida (deve ser entre 1 e 4).');
    }
    pricing = calculateTicketsOrder(orderInput);
  } catch (e: any) {
    currentPricingError = e.message || 'Erro ao calcular o preço.';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentPricingError) {
      setError(currentPricingError);
      return;
    }

    const ticketInput: TicketOrderInput = {
      ticketsQuantity: typeof quantity === 'number' ? quantity : 0,
      benefitType: benefit,
      studentCardNumber: studentCard,
      foodDonationPledged: foodPledge
    };

    const result = issueTicketPass(ticketInput);
    if (!result.valid) {
      setError(result.error || 'Erro na validação do ingresso');
      return;
    }

    if (result.code) {
      onIssueTicket(result.code);
    }
  };

  return (
    <div className="order-form">
      <h2>Comprar Ingresso - {event.name}</h2>
      {error && <div className="error" role="alert">{error}</div>}
      {currentPricingError && <div className="error" role="alert">{currentPricingError}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="quantity">Quantidade:</label>
          <input 
            id="quantity" 
            type="number" 
            min="1" 
            max="4" 
            value={quantity} 
            onChange={e => {
              const val = e.target.value;
              setQuantity(val === '' ? '' : parseInt(val, 10));
            }} 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="sector">Setor:</label>
          <select id="sector" value={sector} onChange={e => setSector(e.target.value as SectorTier)}>
            <option value="pista">Pista</option>
            <option value="vip">VIP</option>
            <option value="camarote">Camarote</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="batch">Lote:</label>
          <select id="batch" value={batch} onChange={e => setBatch(parseInt(e.target.value) as BatchNumber)}>
            <option value={1}>1º Lote</option>
            <option value={2}>2º Lote</option>
            <option value={3}>3º Lote</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="benefit">Benefício:</label>
          <select id="benefit" value={benefit} onChange={e => setBenefit(e.target.value as TicketBenefitType)}>
            <option value="inteira">Inteira</option>
            <option value="estudante">Estudante (Meia)</option>
            <option value="idoso">Idoso (Meia)</option>
            <option value="social">Social (Meia)</option>
          </select>
        </div>

        {benefit === 'estudante' && (
          <div className="form-group">
            <label htmlFor="studentCard">Carteirinha de Estudante:</label>
            <input id="studentCard" type="text" value={studentCard} onChange={e => setStudentCard(e.target.value)} />
          </div>
        )}

        {benefit === 'social' && (
          <div className="form-group">
            <label>
              <input type="checkbox" checked={foodPledge} onChange={e => setFoodPledge(e.target.checked)} />
              Comprometo-me a doar 1kg de alimento
            </label>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="delivery">Entrega:</label>
          <select id="delivery" value={delivery} onChange={e => setDelivery(e.target.value as 'digital' | 'bilheteria')}>
            <option value="digital">Digital (E-Ticket)</option>
            <option value="bilheteria">Retirada na Bilheteria</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="coupon">Cupom de Desconto:</label>
          <input id="coupon" type="text" value={coupon} onChange={e => setCoupon(e.target.value)} />
        </div>

        <div className="pricing-summary">
          <p>Subtotal: R$ {pricing.subtotal.toFixed(2)}</p>
          <p>Desconto: R$ {pricing.discount.toFixed(2)}</p>
          <p>Taxa: R$ {pricing.fee.toFixed(2)}</p>
          <p><strong>Total: R$ {pricing.total.toFixed(2)}</strong></p>
        </div>

        <div className="actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="submit">Emitir Ingresso</button>
        </div>
      </form>
    </div>
  );
}
