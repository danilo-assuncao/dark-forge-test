import { useMemo, useState } from 'react'
import './App.css'
import { professionals, services } from './data/seed'
import {
  availableSlots,
  formatPrice,
  nextDays,
  parseDate,
  professionalsForService
} from './domain/schedule'
import type { Booking, Service } from './types'

const servicesById: Record<string, Service> = Object.fromEntries(services.map((s) => [s.id, s]))
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const dayLabel = (date: string): string => {
  const d = parseDate(date)
  return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface AppProps {
  now?: () => Date
}

export default function App({ now = () => new Date() }: AppProps) {
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [confirmed, setConfirmed] = useState<Booking | null>(null)

  const service = serviceId ? servicesById[serviceId] : null
  const professional = professionals.find((p) => p.id === professionalId) ?? null
  const days = useMemo(() => nextDays(now(), 7), [now])

  const slots =
    service && professional && date
      ? availableSlots(professional, service, date, bookings, servicesById, now())
      : []

  const chooseService = (id: string) => {
    setServiceId(id)
    setProfessionalId(null)
    setDate(null)
    setTime(null)
  }
  const chooseProfessional = (id: string) => {
    setProfessionalId(id)
    setDate(null)
    setTime(null)
  }
  const chooseDate = (d: string) => {
    setDate(d)
    setTime(null)
  }

  const canConfirm = Boolean(service && professional && date && time && clientName.trim())

  const confirm = () => {
    if (!canConfirm || !service || !professional || !date || !time) return
    const booking: Booking = {
      id: `${professional.id}-${date}-${time}`,
      professionalId: professional.id,
      serviceId: service.id,
      date,
      time,
      clientName: clientName.trim()
    }
    setBookings((prev) => [...prev, booking])
    setConfirmed(booking)
  }

  const reset = () => {
    setServiceId(null)
    setProfessionalId(null)
    setDate(null)
    setTime(null)
    setClientName('')
    setConfirmed(null)
  }

  if (confirmed) {
    const s = servicesById[confirmed.serviceId]
    const p = professionals.find((x) => x.id === confirmed.professionalId)
    return (
      <main className="app">
        <h1>Dan Barber</h1>
        <section className="card" role="status">
          <h2>Agendamento confirmado!</h2>
          <p>
            {confirmed.clientName}, seu horário de {s.name} com {p?.name} está marcado para{' '}
            {dayLabel(confirmed.date)} às {confirmed.time}.
          </p>
          <button type="button" className="primary" onClick={reset}>
            Novo agendamento
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <header>
        <h1>Dan Barber</h1>
        <p>Agende seu horário em poucos passos.</p>
      </header>

      <section className="card" aria-labelledby="step-service">
        <h2 id="step-service">1. Escolha o serviço</h2>
        <div className="grid">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              className="option"
              aria-pressed={serviceId === s.id}
              onClick={() => chooseService(s.id)}
            >
              <strong>{s.name}</strong>
              <span>
                {s.durationMin} min · {formatPrice(s.priceCents)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {service && (
        <section className="card" aria-labelledby="step-pro">
          <h2 id="step-pro">2. Escolha o profissional</h2>
          <div className="grid">
            {professionalsForService(professionals, service.id).map((p) => (
              <button
                key={p.id}
                type="button"
                className="option"
                aria-pressed={professionalId === p.id}
                onClick={() => chooseProfessional(p.id)}
              >
                <strong>{p.name}</strong>
                <span>{p.specialty}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {service && professional && (
        <section className="card" aria-labelledby="step-time">
          <h2 id="step-time">3. Escolha o dia e horário</h2>
          <div className="grid days">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                className="option"
                aria-pressed={date === d}
                onClick={() => chooseDate(d)}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>
          {date &&
            (slots.length === 0 ? (
              <p className="empty">Sem horários disponíveis neste dia.</p>
            ) : (
              <div className="grid slots" role="group" aria-label="Horários disponíveis">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="option slot"
                    aria-pressed={time === t}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ))}
        </section>
      )}

      {service && professional && date && time && (
        <section className="card" aria-labelledby="step-confirm">
          <h2 id="step-confirm">4. Confirmar</h2>
          <label>
            Seu nome
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <button type="button" className="primary" disabled={!canConfirm} onClick={confirm}>
            Confirmar agendamento
          </button>
        </section>
      )}
    </main>
  )
}
