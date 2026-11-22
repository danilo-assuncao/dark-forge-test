import type { TravelDestination, RegionScope } from '../types'

const destinations: TravelDestination[] = [
  {
    id: '1',
    name: 'Rio de Janeiro',
    scope: 'nacional',
    description: 'Cidade Maravilhosa',
    price: 1500,
    availableCabins: ['economica', 'executiva'],
    excursions: [
      { id: 'e1', name: 'Cristo Redentor', price: 150 }
    ]
  },
  {
    id: '2',
    name: 'Paris',
    scope: 'internacional',
    description: 'A Cidade Luz',
    price: 5000,
    availableCabins: ['economica', 'executiva'],
    excursions: [
      { id: 'e2', name: 'Torre Eiffel', price: 300 }
    ]
  }
]

export function listDestinations(): TravelDestination[] {
  return destinations
}

export function filterDestinationsByScope(scope: RegionScope): TravelDestination[] {
  return destinations.filter((dest) => dest.scope === scope)
}

export function getDestinationById(id: string): TravelDestination | undefined {
  return destinations.find((dest) => dest.id === id)
}
