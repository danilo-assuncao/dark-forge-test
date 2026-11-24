import { useMemo, useState } from 'react'
import './App.css'
import AddonPicker from './components/AddonPicker'
import BarberPicker from './components/BarberPicker'
import Confirmation from './components/Confirmation'
import PricingSummary from './components/PricingSummary'
import ServicePicker from './components/ServicePicker'
import { professionals, services } from './data/seed'
import { calculateBarberPricing } from './domain/pricing'
import {
  ADDONS,
  availableSlots,
  confirmBarberAppointment,
  nextDays,
  parseDate,
  totalDurationMin
} from './domain/schedule'
import type { AddonId, Comanda } from './domain/schedule'
import type { Booking, Service } from './types'

const baseServicesById: Record<string, Service> = Object.fromEntries(services.map((s) => [s.id, s]))
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const dayLabel = (date: string): string => {
  const d = parseDate(date)
  return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

const toggle = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

interface AppProps {
  now?: () => Date
  random?: () => number
}

export default function App({ now = () => new Date(), random }: AppProps) {
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [addonIds, setAddonIds] = useState<AddonId[]>([])
  const [isVip, setIsVip] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [durations, setDurations] = useState<Record<string, Service>>({})
  const [confirmed, setConfirmed] = useState<{ comanda: Comanda; totalCents: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const professional = professionals.find((p) => p.id === professionalId) ?? null
  const selectedServices = serviceIds.map((id) => baseServicesById[id])
  const offered = professional
    ? services.filter((s) => professional.serviceIds.includes(s.id))
    : []
  const days = useMemo(() => nextDays(now(), 7), [now])
  const servicesById = useMemo(() => ({ ...baseServicesById, ...durations }), [durations])

  const durationMin = totalDurationMin(selectedServices, addonIds)
  const pricing = calculateBarberPricing({
    services: [
      ...selectedServices,
      ...addonIds.map((id) => ({ category: 'combo' as const, priceCents: ADDONS[id].priceCents }))
    ],
    isVip,
    coupon
  })

  const slots =
    professional && selectedServices.length > 0 && date
      ? availableSlots(
          professional,
          { id: 'block', name: 'block', category: 'combo', durationMin, priceCents: 0 },
          date,
          bookings,
          servicesById,
          now()
        )
      : []

  const clearSlot = () => {
    setDate(null)
    setTime(null)
    setError(null)
  }
  const chooseProfessional = (id: string) => {
    setProfessionalId(id)
    setServiceIds([])
    setAddonIds([])
    clearSlot()
  }
  const toggleService = (id: string) => {
    setServiceIds((prev) => toggle(prev, id))
    clearSlot()
  }
  const toggleAddon = (id: AddonId) => {
    setAddonIds((prev) => toggle(prev, id))
    clearSlot()
  }
  const chooseDate = (d: string) => {
    setDate(d)
    setTime(null)
    setError(null)
  }

  const canConfirm = Boolean(
    professional && selectedServices.length > 0 && date && time && clientName.trim()
  )

  const confirm = () => {
    if (!canConfirm || !professional || !date || !time) return
    try {
      const comanda = confirmBarberAppointment(
        { professional, services: selectedServices, addonIds, date, time, clientName },
        { bookings, servicesById, now: now(), random }
      )
      const bookingId = comanda.code
      setDurations((prev) => ({
        ...prev,
        [bookingId]: {
          id: bookingId,
          name: bookingId,
          category: 'combo',
          durationMin: comanda.durationMin,
          priceCents: comanda.totalCents
        }
      }))
      setBookings((prev) => [
        ...prev,
        {
          id: bookingId,
          professionalId: professional.id,
          serviceId: bookingId,
          date,
          time,
          clientName: comanda.clientName
        }
      ])
      setConfirmed({ comanda, totalCents: pricing.totalCents })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar')
    }
  }

  const reset = () => {
    setProfessionalId(null)
    setServiceIds([])
    setAddonIds([])
    setIsVip(false)
    setCoupon('')
    setClientName('')
    setConfirmed(null)
    clearSlot()
  }

  if (confirmed) {
    const { comanda } = confirmed
    return (
      <main className="app">
        <h1>Dan Barber</h1>
        <Confirmation
          comanda={comanda}
          barberName={professionals.find((p) => p.id === comanda.barberId)?.name ?? ''}
          serviceNames={comanda.serviceIds.map((id) => baseServicesById[id].name)}
          addonNames={comanda.addonIds.map((id) => ADDONS[id].name)}
          dateLabel={dayLabel(comanda.date)}
          totalCents={confirmed.totalCents}
          onReset={reset}
        />
      </main>
    )
  }

  return (
    <main className="app">
      <header>
        <h1>Dan Barber</h1>
        <p>Agende seu horário em poucos passos.</p>
      </header>

      <BarberPicker barbers={professionals} selectedId={professionalId} onSelect={chooseProfessional} />

      {professional && (
        <ServicePicker services={offered} selectedIds={serviceIds} onToggle={toggleService} />
      )}

      {professional && selectedServices.length > 0 && (
        <>
          <AddonPicker selectedIds={addonIds} onToggle={toggleAddon} />

          <section className="card" aria-labelledby="step-time">
            <h2 id="step-time">4. Escolha o dia e horário</h2>
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

          <section className="card" aria-labelledby="step-confirm">
            <h2 id="step-confirm">5. Confirmar</h2>
            <div className="perks">
              <label className="check">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                />
                Sou do Clube VIP (20% de desconto)
              </label>
              <label>
                Cupom de desconto
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              </label>
              <label>
                Seu nome
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>
            </div>
            <PricingSummary pricing={pricing} />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="primary" disabled={!canConfirm} onClick={confirm}>
              Confirmar agendamento
            </button>
          </section>
        </>
      )}
    </main>
  )
}
