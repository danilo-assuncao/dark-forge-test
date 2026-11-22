import React, { useState } from 'react'
import type { PropertyListing } from '../types'
import { schedulePropertyVisit } from '../domain/visits'
import type { VisitType, ScheduleVisitResult } from '../domain/visits'
import { Modal } from './Modal'

interface Props {
  property: PropertyListing
  onClose: () => void
}

export const ScheduleVisit: React.FC<Props> = ({ property, onClose }) => {
  const [visitorName, setVisitorName] = useState('')
  const [date, setDate] = useState('')
  const [visitType, setVisitType] = useState<VisitType>('presencial')
  
  const [result, setResult] = useState<ScheduleVisitResult | null>(null)

  const handleSchedule = () => {
    const res = schedulePropertyVisit({
      propertyId: property.id,
      visitorName,
      date,
      visitType
    })
    setResult(res)
  }

  return (
    <Modal onClose={onClose} titleId="schedule-visit-title">
      <h2 id="schedule-visit-title">Agendar Nova Visita</h2>
      <h3>{property.title}</h3>

      <div className="form-group">
          <label>
            Seu Nome:
            <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
          </label>
        </div>

        <div className="form-group">
          <label>
            Data da Visita:
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </label>
        </div>

        <div className="form-group">
          <label>
            Tipo de Visita:
            <select value={visitType} onChange={e => setVisitType(e.target.value as VisitType)}>
              <option value="presencial">Presencial</option>
              <option value="videochamada">Videochamada</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={handleSchedule}>Agendar</button>
          <button onClick={onClose} className="cancel-btn">Fechar</button>
        </div>

        {result && (
          <div className={`result-message ${result.success ? 'success' : 'error'}`}>
            <p>{result.message}</p>
            {result.success && result.protocol && (
              <p><strong>Protocolo:</strong> {result.protocol}</p>
            )}
          </div>
        )}
    </Modal>
  )
}
