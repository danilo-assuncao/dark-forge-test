import { useState } from 'react'
import './App.css'
import { CarList } from './components/CarList'
import { cars as initialCars } from './data/cars'

const currentYear = new Date().getFullYear()

export default function App() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCars = initialCars.filter((car) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      car.make.toLowerCase().includes(searchLower) ||
      car.model.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Car Dealership</h1>
        <div className="search-container">
          <label htmlFor="search-input" className="sr-only">Search cars</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by make or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </header>
      <main className="app-main">
        <CarList cars={filteredCars} />
      </main>
      <footer className="app-footer">
        <p>&copy; {currentYear} Auto Sales. All rights reserved.</p>
      </footer>
    </div>
  )
}
