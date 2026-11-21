import type { Car } from '../types/Car'
import { CarCard } from './CarCard'

interface CarListProps {
  cars: Car[]
}

export function CarList({ cars }: CarListProps) {
  if (cars.length === 0) {
    return <p className="no-cars-message">No cars available.</p>
  }

  return (
    <div className="car-list">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  )
}
