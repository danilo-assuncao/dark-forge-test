import { useState } from 'react'
import { quoteGroomingSession, type GroomingQuote, type OptionalAddon } from '../domain/grooming'
import type { PetSize, CoatType } from '../types'
import { listPetServices } from '../data/catalog'

export default function GroomingTab() {
  const [size, setSize] = useState<PetSize>('pequeno')
  const [coat, setCoat] = useState<CoatType>('curta')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [addons, setAddons] = useState<OptionalAddon[]>([])
  const [isClubMember, setIsClubMember] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [quote, setQuote] = useState<GroomingQuote | null>(null)
  const [error, setError] = useState('')

  const handleCalculate = () => {
    try {
      setError('')
      if (serviceIds.length === 0) {
        throw new Error('Selecione pelo menos um serviço')
      }
      const result = quoteGroomingSession({
        serviceIds,
        size,
        coat,
        addons,
        isClubMember,
        coupon: coupon.trim() || undefined
      })
      setQuote(result)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro inesperado')
      }
      setQuote(null)
    }
  }

  const handleServiceChange = (id: string) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleAddonChange = (id: string) => {
    const addon = id as OptionalAddon
    setAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    )
  }

  return (
    <div className="card">
      <h2>Banho & Tosa</h2>
      
      <div className="form-group">
        <label htmlFor="size" className="form-label">Porte</label>
        <select
          id="size"
          className="form-select"
          value={size}
          onChange={(e) => setSize(e.target.value as PetSize)}
        >
          <option value="pequeno">Pequeno</option>
          <option value="medio">Médio</option>
          <option value="grande">Grande</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="coat" className="form-label">Pelagem</label>
        <select
          id="coat"
          className="form-select"
          value={coat}
          onChange={(e) => setCoat(e.target.value as CoatType)}
        >
          <option value="curta">Curta</option>
          <option value="longa">Longa</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Serviços</label>
        {listPetServices().map((svc) => (
          <label key={svc.id} className="checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={serviceIds.includes(svc.id)}
              onChange={() => handleServiceChange(svc.id)}
            />
            {svc.name}
          </label>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">Adicionais</label>
        {([
          { id: 'hidratacao', name: 'Hidratação' },
          { id: 'corte-unhas', name: 'Corte de Unhas' },
          { id: 'leva-e-traz', name: 'Leva e Traz' }
        ]).map((addon) => (
          <label key={addon.id} className="checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={addons.includes(addon.id as OptionalAddon)}
              onChange={() => handleAddonChange(addon.id)}
            />
            {addon.name}
          </label>
        ))}
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={isClubMember}
            onChange={(e) => setIsClubMember(e.target.checked)}
          />
          Clube Pet (15% de desconto)
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Cupom</label>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: DANPET10"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
        />
      </div>

      <button className="btn" onClick={handleCalculate}>
        Calcular Orçamento
      </button>

      {error && <p className="status-atrasada" style={{ marginTop: '1rem' }}>{error}</p>}

      {quote && (
        <div className="quote-result">
          <h3>Orçamento</h3>
          <p>Serviços: R$ {quote.subtotalServices.toFixed(2)}</p>
          <p>Adicionais: R$ {quote.subtotalAddons.toFixed(2)}</p>
          <p>Desconto Clube: R$ {quote.discountClub.toFixed(2)}</p>
          <p>Desconto Cupom: R$ {quote.discountCoupon.toFixed(2)}</p>
          <p><strong>Total: R$ {quote.total.toFixed(2)}</strong></p>
          {quote.protocol && <p><strong>Protocolo: {quote.protocol}</strong></p>}
        </div>
      )}
    </div>
  )
}
