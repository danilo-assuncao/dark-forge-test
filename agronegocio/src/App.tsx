import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Agronegócio SPA</h1>
      </header>
      <main className="app-main">
        <section className="dashboard">
          <h2>Bem-vindo ao portal Agronegócio</h2>
          <p>
            Plataforma para gestão, integração e visualização de dados do
            agronegócio.
          </p>
          <button
            type="button"
            className="action-button"
            onClick={() => setCount((c) => c + 1)}
          >
            Ações registradas: {count}
          </button>
        </section>
      </main>
    </div>
  )
}

export default App
