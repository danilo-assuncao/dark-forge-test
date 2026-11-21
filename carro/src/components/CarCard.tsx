import type { Car } from '../types/Car'

interface CarCardProps {
  car: Car
}

export function CarCard({ car }: CarCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(car.price)

  return (
    <div className="car-card" data-testid="car-card">
      <img src={car.imageUrl} alt={`${car.make} ${car.model}`} className="car-image" />
      <div className="car-info">
        <h3 className="car-title">{car.make} {car.model} ({car.year})</h3>
        <p className="car-price">{formattedPrice}</p>
        <p className="car-description">{car.description}</p>
      </div>
    </div>
  )
}
