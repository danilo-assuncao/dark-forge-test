import { useState, type FormEvent } from 'react'
import {
  EXTRAS,
  MAX_AREA,
  MIN_AREA,
  PACKAGES,
  calculateQuote,
  formatCents,
  type ExtraId,
  type PackageId
} from './domain/pricing'
import {
  EMPTY_BOOKING,
  toIsoDate,
  validateBooking,
  type BookingErrors,
  type BookingForm
} from './domain/booking'
import './App.css'

const FIELDS: { key: keyof BookingForm; label: string; type: string }[] = [
  { key: 'name', label: 'Full name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time', type: 'time' }
]

export default function App() {
  const [areaText, setAreaText] = useState('60')
  const [packageId, setPackageId] = useState<PackageId>('standard')
  const [extras, setExtras] = useState<ExtraId[]>([])
  const [form, setForm] = useState<BookingForm>(EMPTY_BOOKING)
  const [errors, setErrors] = useState<BookingErrors>({})
  const [confirmed, setConfirmed] = useState<string | null>(null)

  const area = areaText.trim() === '' ? NaN : Number(areaText)
  const quote = calculateQuote(area, packageId, extras)

  const toggleExtra = (id: ExtraId) =>
    setExtras((cur) => (cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setConfirmed(null)
    const found = validateBooking(form)
    setErrors(found)
    if (Object.keys(found).length > 0 || !quote) return
    setConfirmed(`Booking confirmed for ${form.date} at ${form.time}. Total: ${formatCents(quote.totalCents)}.`)
  }

  return (
    <main className="app">
      <h1>Dan Clean</h1>
      <p className="lead">Estimate your cleaning and book a date.</p>

      <section aria-labelledby="quote-title">
        <h2 id="quote-title">Quote calculator</h2>
        <label htmlFor="area">Area (m²)</label>
        <input
          id="area"
          type="number"
          inputMode="decimal"
          min={MIN_AREA}
          max={MAX_AREA}
          value={areaText}
          onChange={(e) => setAreaText(e.target.value)}
          aria-invalid={!quote}
        />
        {!quote && (
          <p role="alert" className="error">
            Enter an area between {MIN_AREA} and {MAX_AREA} m².
          </p>
        )}

        <fieldset>
          <legend>Package</legend>
          {PACKAGES.map((p) => (
            <label key={p.id} className="option">
              <input
                type="radio"
                name="package"
                value={p.id}
                checked={packageId === p.id}
                onChange={() => setPackageId(p.id)}
              />
              <span>
                <strong>{p.label}</strong> — {formatCents(p.centsPerSqm)}/m²
                <small>{p.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Extras</legend>
          {EXTRAS.map((x) => (
            <label key={x.id} className="option">
              <input type="checkbox" checked={extras.includes(x.id)} onChange={() => toggleExtra(x.id)} />
              <span>
                {x.label} (+{formatCents(x.cents)})
              </span>
            </label>
          ))}
        </fieldset>

        <p className="total" aria-live="polite" data-testid="total">
          {quote ? `Estimated total: ${formatCents(quote.totalCents)}` : 'Estimated total: —'}
        </p>
      </section>

      <section aria-labelledby="booking-title">
        <h2 id="booking-title">Book your cleaning</h2>
        <form onSubmit={onSubmit} noValidate>
          {FIELDS.map(({ key, label, type }) => (
            <div key={key} className="field">
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                type={type}
                value={form[key]}
                min={key === 'date' ? toIsoDate(new Date(Date.now() + 86400000)) : undefined}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `${key}-error` : undefined}
              />
              {errors[key] && (
                <p id={`${key}-error`} className="error">
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
          <button type="submit" disabled={!quote}>
            Confirm booking
          </button>
        </form>
        {confirmed && (
          <p role="status" className="success">
            {confirmed}
          </p>
        )}
      </section>
    </main>
  )
}
