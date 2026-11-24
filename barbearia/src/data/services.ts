import type { BarberProfile, BarberService, ServiceCategory } from '../types'
import { professionals, services } from './seed'

export const listServices = (category?: ServiceCategory): BarberService[] =>
  services.filter((s) => category === undefined || s.category === category)

export const listBarbers = (serviceId?: string): BarberProfile[] =>
  professionals.filter(
    (p) => serviceId === undefined || p.serviceIds.includes(serviceId)
  )
