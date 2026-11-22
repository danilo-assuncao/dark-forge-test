import { listProperties } from './data/properties'

const App = () => {
  const properties = listProperties()

  return (
    <div>
      <h1>Catálogo de Imóveis</h1>
      <ul>
        {properties.map(p => (
          <li key={p.id}>
            {p.title} - {p.type} - {p.bedrooms} quartos - R$ {p.priceBrl}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
