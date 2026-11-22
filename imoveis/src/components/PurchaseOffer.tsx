import React, { useState } from 'react'
import type { PropertyListing } from '../types'
import { evaluatePurchaseOffer } from '../domain/visits'
import type { PaymentMethod, PurchaseOfferResult } from '../domain/visits'

interface Props {
  property: PropertyListing
  onClose: () => void
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const PurchaseOffer: React.FC<Props> = ({ property, onClose }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('a-vista')
  const [coupon, setCoupon] = useState('')
  const [offeredPriceBrl, setOfferedPriceBrl] = useState<number | ''>('')
  
  const [result, setResult] = useState<PurchaseOfferResult | null>(null)

  const handleOffer = () => {
    const res = evaluatePurchaseOffer({
      propertyId: property.id,
      paymentMethod,
      coupon,
      offeredPriceBrl: offeredPriceBrl === '' ? undefined : Number(offeredPriceBrl)
    })
    setResult(res)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Fazer Nova Proposta</h2>
        <h3>{property.title}</h3>

        <div className="form-group">
          <label>
            Método de Pagamento:
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="a-vista">À vista</option>
              <option value="financiado">Financiado</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Cupom de Desconto:
            <input type="text" value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Ex: DANHOME5" />
          </label>
        </div>

        <div className="form-group">
          <label>
            Preço Ofertado (R$):
            <input 
              type="number" 
              min="0" 
              value={offeredPriceBrl} 
              onChange={e => setOfferedPriceBrl(e.target.value ? Number(e.target.value) : '')} 
              placeholder={property.priceBrl.toString()}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={handleOffer}>Enviar Proposta</button>
          <button onClick={onClose} className="cancel-btn">Fechar</button>
        </div>

        {result && (
          <div className={`result-message ${result.success ? 'success' : 'error'}`}>
            <p>{result.message}</p>
            {result.success && (
              <>
                <p><strong>Preço Original:</strong> {formatPrice(result.originalPriceBrl)}</p>
                <p><strong>Desconto:</strong> {formatPrice(result.discountApplied)}</p>
                <p><strong>Preço Final:</strong> {formatPrice(result.finalPriceBrl)}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
