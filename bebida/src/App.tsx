import { Catalog } from './components/Catalog'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-blue-600 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">BebidaApp</h1>
          <div className="text-blue-100 font-medium">Carrinho (0)</div>
        </div>
      </header>
      <main>
        <Catalog />
      </main>
      <footer className="bg-gray-800 text-gray-400 py-8 text-center">
        <p>© 2026 BebidaApp - Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

export default App
