import { formatPrice } from '../domain/schedule'
import type { Comanda } from '../domain/schedule'

interface ConfirmationProps {
  comanda: Comanda
  barberName: string
  serviceNames: string[]
  addonNames: string[]
  dateLabel: string
  totalCents: number
  onReset: () => void
}

export default function Confirmation({
  comanda,
  barberName,
  serviceNames,
  addonNames,
  dateLabel,
  totalCents,
  onReset
}: ConfirmationProps) {
  const items = [...serviceNames, ...addonNames].join(', ')
  return (
    <section className="card" role="status">
      <h2>Agendamento confirmado!</h2>
      <p className="comanda">
        Comanda <strong>{comanda.code}</strong>
      </p>
      <p>
        {comanda.clientName}, seu horário com {barberName} está marcado para {dateLabel} às{' '}
        {comanda.time}.
      </p>
      <p>
        {items} · {comanda.durationMin} min · Total {formatPrice(totalCents)}
      </p>
      <button type="button" className="primary" onClick={onReset}>
        Novo agendamento
      </button>
    </section>
  )
}
