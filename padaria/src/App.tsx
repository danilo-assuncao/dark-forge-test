import './App.css'
import { listBakes } from './data/bakes'
import type { BakeCategory } from './types'

const CATEGORY_LABELS: Record<BakeCategory, string> = {
  pao: 'Pão',
  doce: 'Doce',
  salgado: 'Salgado',
  bolo: 'Bolo'
}

const formatPrice = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function App() {
  const bakes = listBakes()

  return (
    <main className="app">
      <h1>Padaria</h1>
      <p className="hint">Fornadas da manhã</p>
      <ul className="bakes" aria-label="Fornadas">
        {bakes.map((b) => (
          <li key={b.id} className="card">
            <strong>{b.name}</strong>
            <span>{CATEGORY_LABELS[b.category]} · sai às {b.slot}</span>
            <span>{formatPrice(b.priceCents)}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
