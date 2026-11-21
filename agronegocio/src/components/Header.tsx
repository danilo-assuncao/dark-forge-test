export const Header = () => {
  return (
    <header className="bg-green-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">AgroDashboard</h1>
        <nav>
          <ul className="flex space-x-4">
            <li><a href="#" className="hover:text-green-200">Início</a></li>
            <li><a href="#" className="hover:text-green-200">Culturas</a></li>
            <li><a href="#" className="hover:text-green-200">Gado</a></li>
            <li><a href="#" className="hover:text-green-200">Relatórios</a></li>
          </ul>
        </nav>
      </div>
    </header>
  ) 
} 