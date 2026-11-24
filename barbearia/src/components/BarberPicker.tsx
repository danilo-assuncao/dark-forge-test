import type { Professional } from '../types'

interface BarberPickerProps {
  barbers: Professional[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function BarberPicker({ barbers, selectedId, onSelect }: BarberPickerProps) {
  return (
    <section className="card" aria-labelledby="step-barber">
      <h2 id="step-barber">1. Escolha o barbeiro</h2>
      <div className="grid">
        {barbers.map((p) => (
          <button
            key={p.id}
            type="button"
            className="option"
            aria-pressed={selectedId === p.id}
            onClick={() => onSelect(p.id)}
          >
            <strong>{p.name}</strong>
            <span>{p.specialty}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
