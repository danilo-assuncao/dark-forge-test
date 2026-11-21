import type { Car } from '../types/Car'
import { CarCard } from './CarCard'

interface CarListProps {
  cars: Car[]
  emptyMessage?: string
}

export function CarList({ cars, emptyMessage = 'No cars available.' }: CarListProps) {
  if (cars.length === 0) {
    return <p className="no-cars-message">{emptyMessage}</p>
  }

  return (
    <div className="car-list">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  )
}
