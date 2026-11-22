import { useState, useMemo } from 'react'
import './App.css'
import { filterSuitesByGuests, getSuiteById } from './data/suites'
import { calculateStayRates } from './domain/rates'
import { listConciergeAddons } from './domain/concierge'
import { finalizeBookingSummary } from './domain/loyalty'
import type { LoyaltyTier, SuiteTier } from './types'

function App() {
  const [guests, setGuests] = useState<number>(2)
  const [category, setCategory] = useState<SuiteTier | 'all'>('all')
  const [season, setSeason] = useState<'baixa' | 'alta'>('baixa')
  const [checkIn, setCheckIn] = useState<string>('')
  const [checkOut, setCheckOut] = useState<string>('')
  
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('')
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>('bronze')
  const [couponCode, setCouponCode] = useState<string>('')
  
  const [voucherData, setVoucherData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const suites = useMemo(() => {
    let filtered = filterSuitesByGuests(guests)
    if (category !== 'all') {
      filtered = filtered.filter(s => s.tier === category)
    }
    return filtered
  }, [guests, category])

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddonIds(prev => 
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    )
  }

  const handleBook = () => {
    setError(null)
    setVoucherData(null)
    
    try {
      if (!selectedSuiteId) throw new Error('Selecione uma suíte')
      if (!checkIn || !checkOut) throw new Error('Selecione as datas de check-in e check-out')
      
      const suite = getSuiteById(selectedSuiteId)
      if (!suite) throw new Error('Suíte inválida')

      const rateResult = calculateStayRates({
        suiteId: selectedSuiteId,
        checkInIso: checkIn,
        checkOutIso: checkOut,
        guests,
        season
      })

      const allAddons = listConciergeAddons()
      const computedAddons = selectedAddonIds.map(id => {
        const addon = allAddons.find(a => a.id === id)
        if (!addon) throw new Error('Addon not found')
        let total = addon.price
        if (addon.pricing === 'per-guest-night') {
          total = addon.price * guests * rateResult.nights
        }
        return { ...addon, price: total }
      })

      const effectiveSuite = {
        ...suite,
        price: rateResult.subtotal / rateResult.nights
      }

      const summary = finalizeBookingSummary({
        loyaltyTier,
        suite: effectiveSuite,
        nights: rateResult.nights,
        addons: computedAddons,
        couponCode
      })

      setVoucherData({
        ...summary,
        roomTotal: rateResult.subtotal,
        addonsTotal: computedAddons.reduce((sum, a) => sum + a.price, 0)
      })

    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Dan Stay SPA</h1>
      </header>
      
      <main className="content">
        <section className="form-section">
          <h2>1. Detalhes da Estadia</h2>
          <div className="field-group">
            <label>
              Check-in:
              <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </label>
            <label>
              Check-out:
              <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </label>
            <label>
              Hóspedes:
              <input type="number" min="1" value={guests} onChange={e => setGuests(parseInt(e.target.value) || 1)} />
            </label>
            <label>
              Temporada:
              <select value={season} onChange={e => setSeason(e.target.value as 'baixa' | 'alta')}>
                <option value="baixa">Baixa</option>
                <option value="alta">Alta</option>
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>2. Suítes Disponíveis</h2>
          <div className="field-group">
            <label>
              Categoria:
              <select value={category} onChange={e => setCategory(e.target.value as SuiteTier | 'all')}>
                <option value="all">Todas</option>
                <option value="standard">Standard</option>
                <option value="vista-mar">Vista Mar</option>
                <option value="presidencial">Presidencial</option>
              </select>
            </label>
          </div>
          <div className="suites-list">
            {suites.length === 0 ? (
              <p>Nenhuma suíte disponível para esta capacidade/categoria.</p>
            ) : (
              suites.map(suite => (
                <div 
                  key={suite.id} 
                  className={`suite-card ${selectedSuiteId === suite.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSuiteId(suite.id)}
                >
                  <h3>{suite.name}</h3>
                  <p>Categoria: {suite.tier}</p>
                  <p>Capacidade: {suite.maxGuests}</p>
                  <p>Preço Base: R$ {suite.price}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>3. Experiências Concierge</h2>
          <div className="addons-list">
            {listConciergeAddons().map(addon => (
              <label key={addon.id} className="addon-item">
                <input 
                  type="checkbox" 
                  checked={selectedAddonIds.includes(addon.id)}
                  onChange={() => handleAddonToggle(addon.id)}
                />
                <span>{addon.name} - R$ {addon.price} ({addon.pricing === 'per-stay' ? 'Por estadia' : 'Por hóspede/noite'})</span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>4. Fidelidade e Pagamento</h2>
          <div className="field-group">
            <label>
              Nível Fidelidade:
              <select value={loyaltyTier} onChange={e => setLoyaltyTier(e.target.value as LoyaltyTier)}>
                <option value="bronze">Bronze</option>
                <option value="ouro">Ouro</option>
                <option value="diamante">Diamante</option>
              </select>
            </label>
            <label>
              Cupom:
              <input type="text" placeholder="Ex: DANSTAY15" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
            </label>
          </div>
          
          <button className="book-button" onClick={handleBook}>Calcular e Reservar</button>
          
          {error && <p className="error-message">{error}</p>}
        </section>

        {voucherData && (
          <section className="voucher-section">
            <h2>Confirmação de Reserva</h2>
            <div className="voucher-card">
              <h3 className="voucher-code">Voucher: {voucherData.voucher}</h3>
              <div className="voucher-details">
                <p><strong>Subtotal (Quarto):</strong> R$ {voucherData.roomTotal.toFixed(2)}</p>
                <p><strong>Subtotal (Concierge):</strong> R$ {voucherData.addonsTotal.toFixed(2)}</p>
                <p><strong>Desconto:</strong> R$ {voucherData.discount.toFixed(2)}</p>
                <p className="total"><strong>Total:</strong> R$ {voucherData.total.toFixed(2)}</p>
              </div>
              {voucherData.benefits.length > 0 && (
                <div className="benefits">
                  <h4>Benefícios Inclusos:</h4>
                  <ul>
                    {voucherData.benefits.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
