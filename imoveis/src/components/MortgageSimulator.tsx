import React, { useState } from 'react'
import type { PropertyListing, AmortizationSystem } from '../types'
import { simulateMortgage } from '../domain/mortgage'
import type { MortgageSimulation } from '../domain/mortgage'

interface Props {
  property: PropertyListing
  onClose: () => void
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const MortgageSimulator: React.FC<Props> = ({ property, onClose }) => {
  const [ownResources, setOwnResources] = useState<number>(0)
  const [fgts, setFgts] = useState<number>(0)
  const [system, setSystem] = useState<AmortizationSystem>('SAC')
  const [termMonths, setTermMonths] = useState<120 | 240 | 360>(360)
  const [monthlyIncome, setMonthlyIncome] = useState<number>(10000)
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(0.1)

  const [simulation, setSimulation] = useState<MortgageSimulation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSimulate = () => {
    try {
      setError(null)
      const result = simulateMortgage({
        propertyValueBrl: property.priceBrl,
        ownResourcesBrl: ownResources,
        fgtsBrl: fgts,
        system,
        termMonths,
        monthlyIncomeBrl: monthlyIncome,
        annualInterestRate,
      })
      setSimulation(result)
    } catch (err: any) {
      setError(err.message)
      setSimulation(null)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Simulador de Financiamento</h2>
        <h3>{property.title} - {formatPrice(property.priceBrl)}</h3>

        <div className="form-group">
          <label>
            Recursos Próprios (R$):
            <input type="number" min="0" value={ownResources} onChange={e => setOwnResources(Number(e.target.value))} />
          </label>
        </div>

        <div className="form-group">
          <label>
            FGTS (R$):
            <input type="number" min="0" value={fgts} onChange={e => setFgts(Number(e.target.value))} />
          </label>
        </div>

        <div className="form-group">
          <label>
            Sistema de Amortização:
            <select value={system} onChange={e => setSystem(e.target.value as AmortizationSystem)}>
              <option value="SAC">SAC</option>
              <option value="PRICE">Price</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Prazo (meses):
            <select value={termMonths} onChange={e => setTermMonths(Number(e.target.value) as 120 | 240 | 360)}>
              <option value={120}>120</option>
              <option value={240}>240</option>
              <option value={360}>360</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Renda Mensal (R$):
            <input type="number" min="0" value={monthlyIncome} onChange={e => setMonthlyIncome(Number(e.target.value))} />
          </label>
        </div>

        <div className="form-group">
          <label>
            Taxa de Juros Anual (ex: 0.1 para 10%):
            <input type="number" min="0" step="0.01" value={annualInterestRate} onChange={e => setAnnualInterestRate(Number(e.target.value))} />
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={handleSimulate}>Calcular</button>
          <button onClick={onClose} className="cancel-btn">Fechar</button>
        </div>

        {error && <p className="error">{error}</p>}

        {simulation && (
          <div className="simulation-result">
            <h4>Resultado:</h4>
            <p><strong>Valor Financiado:</strong> {formatPrice(simulation.financedAmountBrl)}</p>
            <p><strong>Primeira Parcela:</strong> {formatPrice(simulation.firstInstallmentBrl)}</p>
            <p><strong>Última Parcela:</strong> {formatPrice(simulation.lastInstallmentBrl)}</p>
            
            <p className={simulation.incomeApproved ? 'approved' : 'rejected'}>
              {simulation.incomeApproved ? '✅ Renda Aprovada (<= 30%)' : '❌ Renda Reprovada (> 30%)'}
            </p>
            <p className={simulation.downPaymentApproved ? 'approved' : 'rejected'}>
              {simulation.downPaymentApproved ? '✅ Entrada Aprovada (>= 20%)' : '❌ Entrada Reprovada (< 20%)'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
