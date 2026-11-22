import { listProperties } from './data/properties'

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const App = () => {
  const properties = listProperties()

  return (
    <div>
      <h1>Catálogo de Imóveis</h1>
      <ul>
        {properties.map(p => (
          <li key={p.id}>
            {p.title} - {p.type} - {p.bedrooms} quartos - {formatPrice(p.priceBrl)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
