import { formatPrice } from '../domain/schedule'
import type { Category, Service } from '../types'

const CATEGORY_LABELS: Record<Category, string> = {
  cabelo: 'Cabelo',
  barba: 'Barba',
  combo: 'Combo Corte + Barba'
}

const CATEGORY_ORDER: Category[] = ['combo', 'cabelo', 'barba']

interface ServicePickerProps {
  services: Service[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

export default function ServicePicker({ services, selectedIds, onToggle }: ServicePickerProps) {
  return (
    <section className="card" aria-labelledby="step-services">
      <h2 id="step-services">2. Escolha os serviços</h2>
      {CATEGORY_ORDER.map((category) => {
        const items = services.filter((s) => s.category === category)
        if (items.length === 0) return null
        const isCombo = category === 'combo'
        return (
          <div
            key={category}
            className={isCombo ? 'category combo-highlight' : 'category'}
            role="group"
            aria-label={`Serviços de ${CATEGORY_LABELS[category]}`}
          >
            <h3>
              {CATEGORY_LABELS[category]}
              {isCombo && <span className="badge">Destaque</span>}
            </h3>
            {isCombo && (
              <p className="hint">Combine corte e barba e ganhe 15% de desconto.</p>
            )}
            <div className="grid">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="option"
                  aria-pressed={selectedIds.includes(s.id)}
                  onClick={() => onToggle(s.id)}
                >
                  <strong>{s.name}</strong>
                  <span>
                    {s.durationMin} min · {formatPrice(s.priceCents)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
