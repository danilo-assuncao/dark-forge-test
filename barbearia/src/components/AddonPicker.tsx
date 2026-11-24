import { ADDONS } from '../domain/schedule'
import type { AddonId } from '../domain/schedule'
import { formatPrice } from '../domain/schedule'

interface AddonPickerProps {
  selectedIds: AddonId[]
  onToggle: (id: AddonId) => void
}

export default function AddonPicker({ selectedIds, onToggle }: AddonPickerProps) {
  return (
    <section className="card" aria-labelledby="step-addons">
      <h2 id="step-addons">3. Adicionais</h2>
      <div className="grid">
        {Object.values(ADDONS).map((a) => (
          <button
            key={a.id}
            type="button"
            className="option"
            aria-pressed={selectedIds.includes(a.id)}
            onClick={() => onToggle(a.id)}
          >
            <strong>{a.name}</strong>
            <span>
              +{a.durationMin} min · {formatPrice(a.priceCents)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
