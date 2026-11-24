import type { Professional, Service } from '../types'

export const services: Service[] = [
  { id: 'corte', name: 'Corte de cabelo', category: 'cabelo', durationMin: 30, priceCents: 4500 },
  { id: 'degrade', name: 'Corte degradê', category: 'cabelo', durationMin: 45, priceCents: 5500 },
  { id: 'barba', name: 'Barba completa', category: 'barba', durationMin: 30, priceCents: 3500 },
  { id: 'barba-toalha', name: 'Barba com toalha quente', category: 'barba', durationMin: 45, priceCents: 4500 },
  { id: 'combo', name: 'Cabelo + barba', category: 'combo', durationMin: 60, priceCents: 7500 }
]

export const professionals: Professional[] = [
  {
    id: 'dan',
    name: 'Dan',
    specialty: 'Mestre barbeiro',
    serviceIds: ['corte', 'degrade', 'barba', 'barba-toalha', 'combo'],
    workDays: [2, 3, 4, 5, 6],
    startHour: 9,
    endHour: 18
  },
  {
    id: 'rafa',
    name: 'Rafa',
    specialty: 'Especialista em degradê',
    serviceIds: ['corte', 'degrade'],
    workDays: [1, 2, 3, 4, 5],
    startHour: 10,
    endHour: 19
  },
  {
    id: 'bruno',
    name: 'Bruno',
    specialty: 'Barba e navalha',
    serviceIds: ['barba', 'barba-toalha', 'combo'],
    workDays: [3, 4, 5, 6],
    startHour: 9,
    endHour: 17
  }
]
