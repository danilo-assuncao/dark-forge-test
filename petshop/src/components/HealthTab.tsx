import { useState, useMemo } from 'react'
import {
  evaluateWallet,
  calculateDailyFoodGrams,
  type AgeStage,
  type ActivityLevel
} from '../domain/health'
import type { VaccineRecord } from '../types'

const mockVaccineRecords: VaccineRecord[] = [
  { id: 'v1', name: 'V10', date: '2023-10-01T10:00:00Z', veterinarian: 'Dr. João' },
  { id: 'v2', name: 'Antirrabica', date: '2024-01-15T10:00:00Z', veterinarian: 'Dr. João' },
  { id: 'v3', name: 'Giardia', date: '2023-05-10T10:00:00Z', veterinarian: 'Dra. Maria' }
]

export default function HealthTab() {
  const [weightKg, setWeightKg] = useState<number>(10)
  const [ageStage, setAgeStage] = useState<AgeStage>('adulto')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderada')

  const walletEvaluation = useMemo(() => {
    // Current date for reference
    const today = new Date().toISOString()
    return evaluateWallet(mockVaccineRecords, today)
  }, [])

  const nutrition = useMemo(() => {
    try {
      return calculateDailyFoodGrams({
        weightKg,
        ageStage,
        activityLevel
      })
    } catch {
      return null
    }
  }, [weightKg, ageStage, activityLevel])

  return (
    <div className="card">
      <h2>Saúde & Nutrição</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>Carteira Vacinal</h3>
        <ul className="vaccine-list">
          {Object.entries(walletEvaluation).map(([vaccineName, evalData]) => (
            <li key={vaccineName} className="vaccine-item">
              <span>{vaccineName}</span>
              <span className={`status-${evalData.status}`}>
                {evalData.status.replace(/-/g, ' ')} ({evalData.daysUntilBooster > 0 ? evalData.daysUntilBooster + ' dias restantes' : 'atrasada'})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Calculadora de Ração</h3>
        <div className="form-group">
          <label htmlFor="weight" className="form-label">Peso (kg)</label>
          <input
            id="weight"
            type="number"
            className="form-input"
            value={weightKg}
            onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
            min="0.1"
            step="0.1"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Fase da Vida</label>
          <select
            className="form-select"
            value={ageStage}
            onChange={(e) => setAgeStage(e.target.value as AgeStage)}
          >
            <option value="filhote">Filhote</option>
            <option value="adulto">Adulto</option>
            <option value="idoso">Idoso</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nível de Atividade</label>
          <select
            className="form-select"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            disabled={ageStage === 'filhote' || ageStage === 'idoso'}
          >
            <option value="baixa">Baixa</option>
            <option value="moderada">Moderada</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        {nutrition && (
          <div className="quote-result">
            <p><strong>Recomendação Diária:</strong> {nutrition.dailyGrams}g</p>
            <p><strong>Refeições por dia:</strong> {nutrition.mealsPerDay}</p>
          </div>
        )}
      </div>
    </div>
  )
}
