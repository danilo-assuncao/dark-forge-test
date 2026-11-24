export type Category = 'cabelo' | 'barba' | 'combo'

export interface Service {
  id: string
  name: string
  category: Category
  durationMin: number
  priceCents: number
}

export interface Professional {
  id: string
  name: string
  specialty: string
  serviceIds: string[]
  workDays: number[] // 0 = Sunday
  startHour: number
  endHour: number
}

export interface Booking {
  id: string
  professionalId: string
  serviceId: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  clientName: string
}
