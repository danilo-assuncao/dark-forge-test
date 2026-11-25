import { listFlowers } from './data/flowers'
import './App.css'

const formatPrice = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const App = () => {
  const flowers = listFlowers()

  return (
    <main className="app">
      <header>
        <h1>Dan Flores</h1>
        <p className="subtitle">Catálogo botânico</p>
      </header>
      <section aria-labelledby="catalog-title" className="card">
        <h2 id="catalog-title">Flores disponíveis</h2>
        <ul className="catalog">
          {flowers.map((flower) => (
            <li key={flower.id} className="flower">
              <strong>{flower.name}</strong>
              <span>{formatPrice(flower.priceCents)} / haste</span>
              <span>
                {flower.stockStems > 0
                  ? `${flower.stockStems} em estoque`
                  : 'Esgotada'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
