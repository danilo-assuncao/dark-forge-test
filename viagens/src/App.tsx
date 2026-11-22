import { listDestinations } from './data/destinations'

export default function App() {
  const destinations = listDestinations()

  return (
    <div>
      <h1>Catálogo de Viagens</h1>
      <ul>
        {destinations.map((dest) => (
          <li key={dest.id}>
            <h2>{dest.name} ({dest.scope})</h2>
            <p>{dest.description}</p>
            <p>Preço a partir de: R$ {dest.price}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
